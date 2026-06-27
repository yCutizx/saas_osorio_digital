'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'client-files'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// Apenas equipe interna acessa arquivos de cliente. 'client' (e qualquer outro)
// fica bloqueado nesta versão.
const ALLOWED_ROLES = ['admin', 'traffic_manager', 'social_media']

type Ctx = {
  user:    { id: string }
  profile: { id: string; role: string }
  admin:   ReturnType<typeof createAdminClient>
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getCtx(): Promise<Ctx | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Perfil não encontrado' }
  if (!ALLOWED_ROLES.includes(profile.role)) return { error: 'Sem permissão' }

  return { user, profile, admin }
}

/**
 * Defesa em profundidade: ctx.admin usa service_role e BYPASSA o RLS, então o
 * escopo por cliente precisa ser checado explicitamente aqui. Admin vê tudo;
 * traffic_manager/social_media só clientes a que estão atribuídos.
 */
async function assertClientAccess(
  ctx: Ctx,
  clientId: string,
): Promise<{ ok: true } | { error: string }> {
  if (ctx.profile.role === 'admin') return { ok: true }

  const { data } = await ctx.admin
    .from('client_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_id', ctx.user.id)
    .maybeSingle()

  if (!data) return { error: 'Sem acesso a este cliente' }
  return { ok: true }
}

/**
 * Normaliza o nome do arquivo pro path do Storage: remove acentos, troca
 * caracteres problemáticos por '_' e preserva a extensão. Nunca retorna vazio.
 */
function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf('.')
  const rawBase = lastDot > 0 ? name.slice(0, lastDot) : name
  const rawExt  = lastDot > 0 ? name.slice(lastDot + 1) : ''

  const clean = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos (marcas combinantes)
      .replace(/[^a-zA-Z0-9._-]/g, '_')                // inseguro -> _
      .replace(/_+/g, '_')                             // colapsa repetidos
      .replace(/^[._-]+|[._-]+$/g, '')                 // tira lixo nas pontas

  const safeBase = clean(rawBase) || 'arquivo'
  const safeExt  = rawExt ? clean(rawExt) : ''
  return safeExt ? `${safeBase}.${safeExt}` : safeBase
}

function revalidateClient(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/edit`)
  revalidatePath(`/admin/clients/${clientId}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) createUploadUrlAction — autoriza e devolve signed upload URL pro browser
// ─────────────────────────────────────────────────────────────────────────────

export async function createUploadUrlAction(
  clientId: string,
  fileName: string,
  fileType: string,
) {
  // fileType entra na assinatura por consistência da API e uso futuro
  // (validação de mime). Hoje o path/token não dependem dele.
  void fileType

  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const access = await assertClientAccess(ctx, clientId)
  if ('error' in access) return { error: access.error }

  const path = `${clientId}/${Date.now()}-${sanitizeFileName(fileName)}`

  const { data, error } = await ctx.admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) return { error: 'Falha ao preparar upload' }

  return {
    ok:        true as const,
    path:      data.path,
    token:     data.token,
    signedUrl: data.signedUrl,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) registerFileAction — registra o metadado após o PUT concluir no browser
// ─────────────────────────────────────────────────────────────────────────────

export async function registerFileAction(
  clientId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  fileType: string,
) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const access = await assertClientAccess(ctx, clientId)
  if ('error' in access) return { error: access.error }

  // O upload já aconteceu client-side; se estourou o limite, limpa e recusa.
  if (fileSize > MAX_FILE_SIZE) {
    await ctx.admin.storage.from(BUCKET).remove([filePath])
    return { error: 'Arquivo excede 50 MB' }
  }

  const { data, error } = await ctx.admin
    .from('client_files')
    .insert({
      client_id:   clientId,
      file_name:   fileName,
      file_path:   filePath,
      file_size:   fileSize,
      file_type:   fileType || null,
      uploaded_by: ctx.user.id,
    })
    .select('id, client_id, file_name, file_path, file_size, file_type, uploaded_by, created_at')
    .single()

  if (error || !data) {
    // Insert falhou — evita arquivo órfão no Storage.
    await ctx.admin.storage.from(BUCKET).remove([filePath])
    return { error: 'Falha ao registrar arquivo' }
  }

  revalidateClient(clientId)
  return { ok: true as const, file: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) getFileDownloadUrlAction — signed URL de download sob demanda (5 min)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFileDownloadUrlAction(fileId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: file } = await ctx.admin
    .from('client_files')
    .select('client_id, file_path')
    .eq('id', fileId)
    .maybeSingle()

  if (!file) return { error: 'Arquivo não encontrado' }

  const access = await assertClientAccess(ctx, file.client_id)
  if ('error' in access) return { error: access.error }

  const { data, error } = await ctx.admin.storage
    .from(BUCKET)
    .createSignedUrl(file.file_path, 60 * 5)

  if (error || !data) return { error: 'Falha ao gerar link de download' }

  return { ok: true as const, url: data.signedUrl }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) deleteFileAction — remove do Storage + apaga o metadado
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteFileAction(fileId: string) {
  const ctx = await getCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { data: file } = await ctx.admin
    .from('client_files')
    .select('client_id, file_path')
    .eq('id', fileId)
    .maybeSingle()

  if (!file) return { error: 'Arquivo não encontrado' }

  const access = await assertClientAccess(ctx, file.client_id)
  if ('error' in access) return { error: access.error }

  const { error: rmErr } = await ctx.admin.storage
    .from(BUCKET)
    .remove([file.file_path])
  if (rmErr) return { error: 'Falha ao remover arquivo do storage' }

  const { error: delErr } = await ctx.admin
    .from('client_files')
    .delete()
    .eq('id', fileId)
  if (delErr) return { error: 'Falha ao remover registro' }

  revalidateClient(file.client_id)
  return { ok: true as const }
}
