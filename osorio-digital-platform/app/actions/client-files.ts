'use server'

import { revalidatePath } from 'next/cache'
import {
  getClientCtx, assertClientAccess, isValidId, type ClientCtx,
} from '@/lib/client-access'

const BUCKET = 'client-files'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remoção best-effort no Storage: nunca lança (supabase-js devolve { error }),
 * mas loga falha pra permitir reconciliação de órfãos depois.
 */
async function removeFromStorage(admin: ClientCtx['admin'], path: string): Promise<void> {
  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (error) console.error('[client-files] falha ao limpar storage:', path, error.message)
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
    s.normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos (marcas combinantes U+0300–U+036F)
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

  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(clientId)) return { error: 'Cliente inválido' }

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
  // fileSize é apenas dica do cliente; o tamanho gravado/validado vem do objeto
  // real no Storage (abaixo). Mantido na assinatura por consistência da API.
  void fileSize

  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(clientId)) return { error: 'Cliente inválido' }

  const access = await assertClientAccess(ctx, clientId)
  if ('error' in access) return { error: access.error }

  // CRÍTICO: amarra o filePath ao clientId autorizado. Sem isso, um usuário com
  // acesso ao cliente A poderia registrar/apontar pra um objeto do cliente B
  // (service_role bypassa RLS — esta checagem é a única defesa).
  if (!filePath.startsWith(`${clientId}/`)) {
    return { error: 'Caminho inválido' }
  }

  // Tamanho REAL do objeto no Storage (fonte de verdade — não confiar no cliente).
  const slash  = filePath.lastIndexOf('/')
  const folder = filePath.slice(0, slash)
  const base   = filePath.slice(slash + 1)

  const { data: listed } = await ctx.admin.storage
    .from(BUCKET)
    .list(folder, { search: base, limit: 100 })

  const obj = listed?.find((o) => o.name === base)
  if (!obj) return { error: 'Upload não encontrado no storage' }

  // Fail-CLOSED: tamanho desconhecido (metadata.size null/ausente) é rejeitado,
  // nunca tratado como 0 — senão o limite de 50MB seria furável.
  const realSize = obj.metadata?.size
  if (typeof realSize !== 'number' || !Number.isFinite(realSize) || realSize <= 0) {
    await removeFromStorage(ctx.admin, filePath)
    return { error: 'Upload inválido' }
  }
  if (realSize > MAX_FILE_SIZE) {
    await removeFromStorage(ctx.admin, filePath)
    return { error: 'Arquivo excede 50 MB' }
  }

  const { data, error } = await ctx.admin
    .from('client_files')
    .insert({
      client_id:   clientId,
      file_name:   fileName,
      file_path:   filePath,
      file_size:   realSize,
      file_type:   fileType || null,
      uploaded_by: ctx.user.id,
    })
    .select('id, client_id, file_name, file_path, file_size, file_type, uploaded_by, created_at')
    .single()

  if (error || !data) {
    // Insert falhou — evita arquivo órfão no Storage.
    await removeFromStorage(ctx.admin, filePath)
    return { error: 'Falha ao registrar arquivo' }
  }

  revalidateClient(clientId)
  return { ok: true as const, file: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) getFileDownloadUrlAction — signed URL de download sob demanda (5 min)
// ─────────────────────────────────────────────────────────────────────────────

export async function getFileDownloadUrlAction(fileId: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(fileId)) return { error: 'Arquivo não encontrado' }

  const { data: file } = await ctx.admin
    .from('client_files')
    .select('client_id, file_path')
    .eq('id', fileId)
    .maybeSingle()

  if (!file) return { error: 'Arquivo não encontrado' }

  // Erro uniforme: não revela a existência de arquivos fora do escopo do usuário.
  const access = await assertClientAccess(ctx, file.client_id)
  if ('error' in access) return { error: 'Arquivo não encontrado' }

  const { data, error } = await ctx.admin.storage
    .from(BUCKET)
    .createSignedUrl(file.file_path, 60 * 5)

  if (error || !data) return { error: 'Falha ao gerar link de download' }

  return { ok: true as const, url: data.signedUrl }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) deleteFileAction — remove o metadado + objeto do Storage
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteFileAction(fileId: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(fileId)) return { error: 'Arquivo não encontrado' }

  const { data: file } = await ctx.admin
    .from('client_files')
    .select('client_id, file_path')
    .eq('id', fileId)
    .maybeSingle()

  if (!file) return { error: 'Arquivo não encontrado' }

  // Erro uniforme (mesmo motivo do download).
  const access = await assertClientAccess(ctx, file.client_id)
  if ('error' in access) return { error: 'Arquivo não encontrado' }

  // Deleta a LINHA primeiro: se o storage falhar depois, sobra no máximo um
  // órfão (limpável) em vez de um registro visível apontando pra objeto morto.
  const { error: delErr } = await ctx.admin
    .from('client_files')
    .delete()
    .eq('id', fileId)
  if (delErr) return { error: 'Falha ao remover registro' }

  await removeFromStorage(ctx.admin, file.file_path)

  revalidateClient(file.client_id)
  return { ok: true as const }
}
