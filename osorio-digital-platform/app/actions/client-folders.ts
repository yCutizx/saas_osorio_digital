'use server'

import { revalidatePath } from 'next/cache'
import { getClientCtx, assertClientAccess, isValidId, type ClientCtx } from '@/lib/client-access'

const BUCKET = 'client-files'
const MAX_NAME = 100
const MAX_TREE_ITERATIONS = 50 // teto de profundidade da hierarquia (anti-runaway)
const REMOVE_CHUNK = 100       // remove do Storage em lotes
const PAGE_SIZE = 1000         // teto padrão de linhas por resposta do PostgREST (Supabase)
const IN_CHUNK = 150           // fatia o .in() pra não estourar o limite de tamanho da URL

const FOLDER_SELECT = 'id, client_id, parent_id, name, created_by, created_at, updated_at'

function revalidateSpace(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/space`)
  revalidatePath(`/admin/clients/${clientId}/space/files`)
  // Rota dinâmica das pastas: revalida o TEMPLATE (todas as [folderId]) — sem
  // isso o Router Cache do cliente serve conteúdo velho ao voltar a uma pasta.
  revalidatePath('/admin/clients/[id]/space/files/[folderId]', 'page')
  revalidatePath(`/admin/clients/${clientId}/edit`)
  revalidatePath(`/admin/clients/${clientId}`)
}

function validateName(name: string): { value: string } | { error: string } {
  const t = (name ?? '').trim()
  if (!t) return { error: 'Nome vazio' }
  if (t.length > MAX_NAME) return { error: 'Nome muito longo (máx. 100 caracteres)' }
  return { value: t }
}

/**
 * Coleta TODOS os file_path de arquivos cujo folder_id está em `folderIds`,
 * paginando (PostgREST tem teto padrão de linhas) e fatiando o `.in()` (limite
 * de URL). Coletar 100% antes da deleção é o que evita órfãos no Storage.
 */
async function collectFilePaths(
  admin: ClientCtx['admin'], clientId: string, folderIds: string[],
): Promise<string[]> {
  const out: string[] = []
  for (let i = 0; i < folderIds.length; i += IN_CHUNK) {
    const chunk = folderIds.slice(i, i + IN_CHUNK)
    let from = 0
    for (;;) {
      const { data } = await admin
        .from('client_files')
        .select('file_path')
        .eq('client_id', clientId)
        .in('folder_id', chunk)
        .range(from, from + PAGE_SIZE - 1)
      if (!data || data.length === 0) break
      for (const r of data) if (r.file_path) out.push(r.file_path as string)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }
  return out
}

/** Subpastas diretas de `parentIds` (mesma paginação/chunk de collectFilePaths). */
async function collectSubfolderIds(
  admin: ClientCtx['admin'], clientId: string, parentIds: string[],
): Promise<string[]> {
  const out: string[] = []
  for (let i = 0; i < parentIds.length; i += IN_CHUNK) {
    const chunk = parentIds.slice(i, i + IN_CHUNK)
    let from = 0
    for (;;) {
      const { data } = await admin
        .from('client_folders')
        .select('id')
        .eq('client_id', clientId)
        .in('parent_id', chunk)
        .range(from, from + PAGE_SIZE - 1)
      if (!data || data.length === 0) break
      for (const r of data) out.push(r.id as string)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 0) listAllFoldersAction — todas as pastas do cliente (pro seletor "mover para")
// ─────────────────────────────────────────────────────────────────────────────

export async function listAllFoldersAction(clientId: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(clientId)) return { error: 'Cliente inválido' }

  const access = await assertClientAccess(ctx, clientId)
  if ('error' in access) return { error: access.error }

  const { data } = await ctx.admin
    .from('client_folders')
    .select('id, name, parent_id')
    .eq('client_id', clientId)
    .order('name')
    .limit(2000)

  return { ok: true as const, folders: (data ?? []) as { id: string; name: string; parent_id: string | null }[] }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) createFolderAction — cria pasta (raiz se parentId null)
// ─────────────────────────────────────────────────────────────────────────────

export async function createFolderAction(
  clientId: string,
  name: string,
  parentId: string | null,
) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(clientId)) return { error: 'Cliente inválido' }

  const access = await assertClientAccess(ctx, clientId)
  if ('error' in access) return { error: access.error }

  const parsed = validateName(name)
  if ('error' in parsed) return { error: parsed.error }

  // parent_id (se houver) DEVE pertencer ao mesmo cliente (anti-IDOR).
  if (parentId !== null) {
    if (!isValidId(parentId)) return { error: 'Pasta inválida' }
    const { data: parent } = await ctx.admin
      .from('client_folders')
      .select('client_id')
      .eq('id', parentId)
      .maybeSingle()
    if (!parent || parent.client_id !== clientId) return { error: 'Pasta inválida' }
  }

  const { data, error } = await ctx.admin
    .from('client_folders')
    .insert({
      client_id:  clientId,
      parent_id:  parentId,
      name:       parsed.value,
      created_by: ctx.user.id,
    })
    .select(FOLDER_SELECT)
    .single()

  if (error || !data) return { error: 'Falha ao criar pasta' }

  revalidateSpace(clientId)
  return { ok: true as const, folder: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) renameFolderAction
// ─────────────────────────────────────────────────────────────────────────────

export async function renameFolderAction(folderId: string, name: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(folderId)) return { error: 'Não encontrado' }

  const parsed = validateName(name)
  if ('error' in parsed) return { error: parsed.error }

  const { data: folder } = await ctx.admin
    .from('client_folders')
    .select('client_id')
    .eq('id', folderId)
    .maybeSingle()

  if (!folder) return { error: 'Não encontrado' }

  // Erro uniforme: não revela existência de pastas fora do escopo.
  const access = await assertClientAccess(ctx, folder.client_id)
  if ('error' in access) return { error: 'Não encontrado' }

  const { data, error } = await ctx.admin
    .from('client_folders')
    .update({ name: parsed.value, updated_at: new Date().toISOString() })
    .eq('id', folderId)
    .select(FOLDER_SELECT)
    .single()

  if (error || !data) return { error: 'Falha ao renomear pasta' }

  revalidateSpace(folder.client_id)
  return { ok: true as const, folder: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) deleteFolderAction — deleção recursiva (Storage limpo no backend; o
//    cascade do banco só apaga as LINHAS, não os objetos)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteFolderAction(folderId: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(folderId)) return { error: 'Não encontrado' }

  const { data: folder } = await ctx.admin
    .from('client_folders')
    .select('client_id')
    .eq('id', folderId)
    .maybeSingle()

  if (!folder) return { error: 'Não encontrado' }

  const access = await assertClientAccess(ctx, folder.client_id)
  if ('error' in access) return { error: 'Não encontrado' }

  const clientId = folder.client_id as string

  // BFS por níveis: coleta TODOS os file_path da pasta + descendentes, com
  // paginação e chunk (collectFilePaths/collectSubfolderIds). O filtro
  // .eq('client_id', clientId) em cada nível limita estritamente a destruição ao
  // cliente autorizado, mesmo que o grafo de parent_id estivesse corrompido.
  const filePaths: string[] = []
  let frontier: string[] = [folderId]
  let iterations = 0

  while (frontier.length > 0) {
    iterations++
    if (iterations > MAX_TREE_ITERATIONS) {
      // FAIL-CLOSED: aborta SEM deletar. Se prosseguisse, o cascade do banco
      // apagaria as linhas abaixo do teto cujos objetos nunca foram coletados,
      // deixando órfãos permanentes e irreconciliáveis no Storage.
      console.error('[client-folders] deleteFolder excedeu a profundidade máxima — abortado:', folderId)
      return { error: 'Estrutura de pastas profunda demais para remover automaticamente. Apague as subpastas mais internas primeiro.' }
    }
    filePaths.push(...await collectFilePaths(ctx.admin, clientId, frontier))
    frontier = await collectSubfolderIds(ctx.admin, clientId, frontier)
  }

  // Remove os objetos do Storage em lotes (best-effort: loga, não aborta).
  for (let i = 0; i < filePaths.length; i += REMOVE_CHUNK) {
    const chunk = filePaths.slice(i, i + REMOVE_CHUNK)
    const { error: rmErr } = await ctx.admin.storage.from(BUCKET).remove(chunk)
    if (rmErr) console.error('[client-folders] falha ao remover lote do storage:', rmErr.message)
  }

  // SÓ ENTÃO deleta a pasta — o cascade do banco apaga subpastas + linhas de
  // client_files automaticamente.
  const { error: delErr } = await ctx.admin
    .from('client_folders')
    .delete()
    .eq('id', folderId)

  if (delErr) return { error: 'Falha ao apagar pasta' }

  revalidateSpace(clientId)
  return { ok: true as const, deletedFiles: filePaths.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) moveFolderAction — com anti-ciclo (não pode entrar em si nem em descendente)
// ─────────────────────────────────────────────────────────────────────────────

export async function moveFolderAction(folderId: string, newParentId: string | null) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(folderId)) return { error: 'Não encontrado' }

  const { data: folder } = await ctx.admin
    .from('client_folders')
    .select('client_id, parent_id')
    .eq('id', folderId)
    .maybeSingle()

  if (!folder) return { error: 'Não encontrado' }

  const access = await assertClientAccess(ctx, folder.client_id)
  if ('error' in access) return { error: 'Não encontrado' }

  if (newParentId !== null) {
    if (!isValidId(newParentId)) return { error: 'Pasta inválida' }
    if (newParentId === folderId) return { error: 'Não é possível mover para dentro da própria pasta' }

    const { data: dest } = await ctx.admin
      .from('client_folders')
      .select('client_id')
      .eq('id', newParentId)
      .maybeSingle()
    if (!dest || dest.client_id !== folder.client_id) return { error: 'Pasta inválida' }

    // ANTI-CICLO: sobe a cadeia de parent_id do DESTINO; se encontrar folderId,
    // o destino é descendente da pasta movida → loop. Rejeita.
    let currentId: string | null = newParentId
    let iterations = 0
    while (currentId !== null) {
      iterations++
      if (iterations > MAX_TREE_ITERATIONS) {
        console.error('[client-folders] moveFolder anti-ciclo atingiu o teto:', folderId)
        return { error: 'Estrutura de pastas muito profunda' }
      }
      if (currentId === folderId) {
        return { error: 'Não é possível mover para dentro da própria pasta' }
      }
      const parentRow = await ctx.admin
        .from('client_folders')
        .select('parent_id')
        .eq('id', currentId)
        .maybeSingle()
      const node = parentRow.data as { parent_id: string | null } | null
      if (!node) break
      currentId = node.parent_id ?? null
    }
  }

  const { error } = await ctx.admin
    .from('client_folders')
    .update({ parent_id: newParentId, updated_at: new Date().toISOString() })
    .eq('id', folderId)

  if (error) return { error: 'Falha ao mover pasta' }

  revalidateSpace(folder.client_id)
  return { ok: true as const }
}
