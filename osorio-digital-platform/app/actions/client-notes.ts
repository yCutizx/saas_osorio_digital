'use server'

import { revalidatePath } from 'next/cache'
import { getClientCtx, assertClientAccess, isValidId } from '@/lib/client-access'

const MAX_CONTENT = 5000

const NOTE_SELECT =
  'id, client_id, content, created_at, updated_at, author_id, author:author_id(full_name, email)'

function revalidateClient(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/edit`)
  revalidatePath(`/admin/clients/${clientId}`)
}

/** Valida/normaliza o texto. Retorna o trim, ou uma mensagem de erro. */
function validateContent(content: string): { value: string } | { error: string } {
  const trimmed = (content ?? '').trim()
  if (!trimmed) return { error: 'Nota vazia' }
  if (trimmed.length > MAX_CONTENT) return { error: 'Nota muito longa (máx. 5000 caracteres)' }
  return { value: trimmed }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) createNoteAction — qualquer membro com acesso ao cliente
// ─────────────────────────────────────────────────────────────────────────────

export async function createNoteAction(clientId: string, content: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(clientId)) return { error: 'Cliente inválido' }

  const access = await assertClientAccess(ctx, clientId)
  if ('error' in access) return { error: access.error }

  const parsed = validateContent(content)
  if ('error' in parsed) return { error: parsed.error }

  const { data, error } = await ctx.admin
    .from('client_notes')
    .insert({
      client_id: clientId,
      author_id: ctx.user.id,
      content:   parsed.value,
    })
    .select(NOTE_SELECT)
    .single()

  if (error || !data) return { error: 'Falha ao salvar nota' }

  revalidateClient(clientId)
  return { ok: true as const, note: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) updateNoteAction — só o autor edita (admin também só as próprias)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateNoteAction(noteId: string, content: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(noteId)) return { error: 'Nota não encontrada' }

  const parsed = validateContent(content)
  if ('error' in parsed) return { error: parsed.error }

  const { data: note } = await ctx.admin
    .from('client_notes')
    .select('client_id, author_id')
    .eq('id', noteId)
    .maybeSingle()

  if (!note) return { error: 'Nota não encontrada' }

  // Erro uniforme: não revela existência de notas fora do escopo do usuário.
  const access = await assertClientAccess(ctx, note.client_id)
  if ('error' in access) return { error: 'Nota não encontrada' }

  // Editar é exclusivo do autor — admin NÃO edita texto alheio.
  if (note.author_id !== ctx.user.id) {
    return { error: 'Só o autor pode editar esta nota' }
  }

  const { data, error } = await ctx.admin
    .from('client_notes')
    .update({ content: parsed.value, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select(NOTE_SELECT)
    .single()

  if (error || !data) return { error: 'Falha ao atualizar nota' }

  revalidateClient(note.client_id)
  return { ok: true as const, note: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) deleteNoteAction — autor OU admin (admin pode moderar)
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteNoteAction(noteId: string) {
  const ctx = await getClientCtx()
  if ('error' in ctx) return { error: ctx.error }

  if (!isValidId(noteId)) return { error: 'Nota não encontrada' }

  const { data: note } = await ctx.admin
    .from('client_notes')
    .select('client_id, author_id')
    .eq('id', noteId)
    .maybeSingle()

  if (!note) return { error: 'Nota não encontrada' }

  // Erro uniforme: não revela existência de notas fora do escopo do usuário.
  const access = await assertClientAccess(ctx, note.client_id)
  if ('error' in access) return { error: 'Nota não encontrada' }

  // Apagar: autor OU admin (moderação).
  if (note.author_id !== ctx.user.id && ctx.profile.role !== 'admin') {
    return { error: 'Sem permissão para apagar' }
  }

  const { error } = await ctx.admin
    .from('client_notes')
    .delete()
    .eq('id', noteId)

  if (error) return { error: 'Falha ao apagar nota' }

  revalidateClient(note.client_id)
  return { ok: true as const }
}
