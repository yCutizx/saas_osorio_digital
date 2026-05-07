'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

export type FormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  success?: boolean
}

export type ChecklistItem = { id: string; text: string; checked: boolean; position: number }
export type Checklist     = { id: string; title: string; items: ChecklistItem[] }
export type Label         = { id: string; name: string; color: string }
export type KanbanComment = {
  id: string; content: string; created_at: string
  user_id: string; profiles: { full_name: string } | null
}
export type Attachment = {
  id: string; file_url: string; file_name: string
  file_type: string | null; created_at: string
}
export type CardDetail = {
  checklists:  Checklist[]
  labels:      Label[]
  comments:    KanbanComment[]
  attachments: Attachment[]
}

const ALLOWED = ['admin', 'social_media']

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) return null
  return { supabase, admin: createAdminClient(), user, role: profile!.role, name: profile!.full_name as string }
}

// ─── Board actions ─────────────────────────────────────────────────────────────

const BoardSchema = z.object({
  name:         z.string().min(1, 'Nome obrigatório'),
  description:  z.string().optional(),
  color:        z.string().min(1),
  columns_json: z.string().min(1),
})

export async function createBoardAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { message: 'Não autorizado.' }

  const result = BoardSchema.safeParse({
    name:         formData.get('name'),
    description:  (formData.get('description') as string) || undefined,
    color:        formData.get('color'),
    columns_json: formData.get('columns_json'),
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors as FormState['errors'] }

  let columns: unknown
  try { columns = JSON.parse(result.data.columns_json) } catch { return { message: 'Colunas inválidas.' } }

  const { data, error } = await ctx.admin.from('kanban_boards').insert({
    name:        result.data.name,
    description: result.data.description ?? null,
    color:       result.data.color,
    board_type:  'content',
    columns,
    created_by:  ctx.user.id,
  }).select('id').single()

  if (error) return { message: error.message }

  revalidatePath('/social/kanban')
  redirect(`/social/kanban/${data.id}`)
}

export async function updateBoardColumnsAction(boardId: string, columns: unknown[]): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_boards').update({ columns }).eq('id', boardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

// ─── Card base actions ─────────────────────────────────────────────────────────

const CardSchema = z.object({
  board_id:    z.string().uuid(),
  column_id:   z.string().min(1),
  title:       z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  client_id:   z.string().uuid().optional().or(z.literal('')),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
  priority:    z.enum(['baixa', 'media', 'alta'] as const),
  format:      z.enum(['reels', 'feed', 'stories', 'carrossel'] as const).optional().or(z.literal('')),
  platform:    z.enum(['instagram', 'facebook', 'tiktok', 'linkedin'] as const).optional().or(z.literal('')),
  tags_raw:    z.string().optional(),
})

export async function createCardAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { message: 'Não autorizado.' }

  const result = CardSchema.safeParse({
    board_id:    formData.get('board_id'),
    column_id:   formData.get('column_id'),
    title:       formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    client_id:   (formData.get('client_id') as string) || '',
    assigned_to: (formData.get('assigned_to') as string) || '',
    due_date:    (formData.get('due_date') as string) || undefined,
    due_time:    (formData.get('due_time') as string) || undefined,
    priority:    formData.get('priority'),
    format:      (formData.get('format') as string) || '',
    platform:    (formData.get('platform') as string) || '',
    tags_raw:    (formData.get('tags_raw') as string) || undefined,
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors as FormState['errors'] }

  const d    = result.data
  const tags = d.tags_raw ? d.tags_raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : []

  const { error } = await ctx.admin.from('kanban_cards').insert({
    board_id:    d.board_id,
    board_type:  'content',
    column_id:   d.column_id,
    title:       d.title,
    description: d.description ?? null,
    client_id:   d.client_id || null,
    assigned_to: d.assigned_to || null,
    due_date:    d.due_date || null,
    due_time:    d.due_time || null,
    priority:    d.priority,
    format:      d.format || null,
    platform:    d.platform || null,
    tags:        tags.length > 0 ? tags : null,
    created_by:  ctx.user.id,
    position:    Date.now(),
  })

  if (error) return { message: error.message }

  revalidatePath(`/social/kanban/${d.board_id}`)
  return { success: true }
}

const UpdateSchema = CardSchema.extend({ card_id: z.string().uuid() })

export async function updateCardAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { message: 'Não autorizado.' }

  const result = UpdateSchema.safeParse({
    card_id:     formData.get('card_id'),
    board_id:    formData.get('board_id'),
    column_id:   formData.get('column_id'),
    title:       formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    client_id:   (formData.get('client_id') as string) || '',
    assigned_to: (formData.get('assigned_to') as string) || '',
    due_date:    (formData.get('due_date') as string) || undefined,
    due_time:    (formData.get('due_time') as string) || undefined,
    priority:    formData.get('priority'),
    format:      (formData.get('format') as string) || '',
    platform:    (formData.get('platform') as string) || '',
    tags_raw:    (formData.get('tags_raw') as string) || undefined,
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors as FormState['errors'] }

  const d    = result.data
  const tags = d.tags_raw ? d.tags_raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : []

  const { error } = await ctx.admin.from('kanban_cards').update({
    title:       d.title,
    description: d.description ?? null,
    client_id:   d.client_id || null,
    assigned_to: d.assigned_to || null,
    due_date:    d.due_date || null,
    due_time:    d.due_time || null,
    priority:    d.priority,
    format:      d.format || null,
    platform:    d.platform || null,
    tags:        tags.length > 0 ? tags : null,
  }).eq('id', d.card_id)

  if (error) return { message: error.message }

  revalidatePath(`/social/kanban/${d.board_id}`)
  return { success: true }
}

export async function deleteCard(cardId: string, boardId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').delete().eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

export async function moveCard(cardId: string, newColumnId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return

  await ctx.admin.from('kanban_cards')
    .update({ column_id: newColumnId, position: Date.now() })
    .eq('id', cardId)

  // Notifica cliente quando card entra em Aprovação
  if (newColumnId === 'approval') {
    const { data: card } = await ctx.admin
      .from('kanban_cards')
      .select('title, client_id, clients(name, contact_email)')
      .eq('id', cardId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientEmail = (card?.clients as any)?.contact_email as string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientName  = (card?.clients as any)?.name as string | null

    if (clientEmail && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from:    'Osorio Digital <noreply@osoriodigital.com.br>',
        to:      clientEmail,
        subject: 'Novo conteúdo aguarda sua aprovação',
        html:    `<p>Olá${clientName ? `, <strong>${clientName}</strong>` : ''}!</p>
                  <p>Um novo conteúdo <strong>&quot;${card?.title}&quot;</strong> está aguardando sua aprovação na plataforma Osorio Digital.</p>
                  <p>Acesse a plataforma para revisar e aprovar.</p>`,
      }).catch(() => {/* silencia erros de e-mail */})
    }
  }
}

// ─── Card inline edits ─────────────────────────────────────────────────────────

export async function updateCardTitleAction(cardId: string, boardId: string, title: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx || !title.trim()) return
  await ctx.admin.from('kanban_cards').update({ title: title.trim() }).eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

export async function updateCardDescriptionAction(cardId: string, boardId: string, description: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').update({ description: description || null }).eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

export async function updateCardCoverAction(
  cardId: string, boardId: string, coverUrl: string | null
): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').update({ cover_url: coverUrl }).eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

export async function updateCardLabelsAction(
  cardId: string, boardId: string, labels: string[]
): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').update({ labels }).eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

export async function updateCardDueDateAction(
  cardId: string, boardId: string, dueDate: string | null
): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').update({ due_date: dueDate || null }).eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

export async function archiveCardAction(cardId: string, boardId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').update({ archived: true }).eq('id', cardId)
  revalidatePath(`/social/kanban/${boardId}`)
}

// ─── Card detail query ─────────────────────────────────────────────────────────

export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const ctx = await getCtx()
  if (!ctx) return null

  const [
    { data: rawChecklists },
    { data: rawCardLabels },
    { data: rawComments },
    { data: rawAttachments },
  ] = await Promise.all([
    ctx.admin.from('kanban_checklists')
      .select('id, title, created_at, kanban_checklist_items(id, text, checked, position)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true }),
    ctx.admin.from('kanban_card_labels')
      .select('label_id, kanban_labels(id, name, color)')
      .eq('card_id', cardId),
    ctx.admin.from('kanban_comments')
      .select('id, content, created_at, user_id, profiles(full_name)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true }),
    ctx.admin.from('kanban_attachments')
      .select('id, file_url, file_name, file_type, created_at')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true }),
  ])

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checklists: (rawChecklists ?? []).map((c: any) => ({
      id:    c.id,
      title: c.title,
      items: ((c.kanban_checklist_items ?? []) as ChecklistItem[])
        .slice()
        .sort((a, b) => a.position - b.position),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labels:      (rawCardLabels ?? []).map((cl: any) => cl.kanban_labels).filter(Boolean) as Label[],
    comments:    (rawComments ?? []) as unknown as KanbanComment[],
    attachments: (rawAttachments ?? []) as Attachment[],
  }
}

export async function getBoardLabels(boardId: string): Promise<Label[]> {
  const ctx = await getCtx()
  if (!ctx) return []
  const { data } = await ctx.admin.from('kanban_labels')
    .select('id, name, color')
    .eq('board_id', boardId)
    .order('name')
  return (data ?? []) as Label[]
}

// ─── Checklist actions ─────────────────────────────────────────────────────────

export async function addChecklistAction(
  cardId: string, boardId: string, title: string
): Promise<Checklist | null> {
  const ctx = await getCtx()
  if (!ctx) return null
  const { data, error } = await ctx.admin.from('kanban_checklists')
    .insert({ card_id: cardId, title: title.trim() || 'Checklist' })
    .select('id, title')
    .single()
  if (error) return null
  revalidatePath(`/social/kanban/${boardId}`)
  return { id: data.id, title: data.title, items: [] }
}

export async function addChecklistItemAction(
  checklistId: string, text: string, position: number
): Promise<ChecklistItem | null> {
  const ctx = await getCtx()
  if (!ctx || !text.trim()) return null
  const { data, error } = await ctx.admin.from('kanban_checklist_items')
    .insert({ checklist_id: checklistId, text: text.trim(), position })
    .select('id, text, checked, position')
    .single()
  if (error) return null
  return data as ChecklistItem
}

export async function toggleChecklistItemAction(itemId: string, checked: boolean): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_checklist_items').update({ checked }).eq('id', itemId)
}

export async function deleteChecklistAction(checklistId: string, boardId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_checklists').delete().eq('id', checklistId)
  revalidatePath(`/social/kanban/${boardId}`)
}

// ─── Label actions ─────────────────────────────────────────────────────────────

export async function createLabelAction(boardId: string, name: string, color: string): Promise<Label | null> {
  const ctx = await getCtx()
  if (!ctx) return null
  const { data, error } = await ctx.admin.from('kanban_labels')
    .insert({ board_id: boardId, name: name.trim(), color })
    .select('id, name, color')
    .single()
  if (error) return null
  return data as Label
}

export async function toggleCardLabelAction(
  cardId: string, labelId: string, active: boolean
): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  if (active) {
    await ctx.admin.from('kanban_card_labels')
      .insert({ card_id: cardId, label_id: labelId })
      .select()
  } else {
    await ctx.admin.from('kanban_card_labels')
      .delete()
      .eq('card_id', cardId)
      .eq('label_id', labelId)
  }
}

// ─── Comment actions ───────────────────────────────────────────────────────────

export async function addCommentAction(
  cardId: string, _boardId: string, content: string
): Promise<KanbanComment | null> {
  const ctx = await getCtx()
  if (!ctx || !content.trim()) return null
  const { data, error } = await ctx.admin.from('kanban_comments')
    .insert({ card_id: cardId, user_id: ctx.user.id, content: content.trim() })
    .select('id, content, created_at, user_id')
    .single()
  if (error) return null
  return { ...data, profiles: { full_name: ctx.name } } as KanbanComment
}

export async function deleteCommentAction(commentId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_comments').delete().eq('id', commentId)
}

// ─── Attachment actions ────────────────────────────────────────────────────────

export async function uploadAttachmentAction(
  cardId: string, boardId: string, formData: FormData
): Promise<Attachment | null> {
  const ctx = await getCtx()
  if (!ctx) return null
  const file = formData.get('file') as File | null
  if (!file) return null

  const ext  = file.name.split('.').pop()
  const path = `${cardId}/${Date.now()}.${ext}`
  const buf  = await file.arrayBuffer()

  const { error: upErr } = await ctx.admin.storage
    .from('kanban-attachments')
    .upload(path, buf, { contentType: file.type, upsert: false })
  if (upErr) return null

  const { data: { publicUrl } } = ctx.admin.storage
    .from('kanban-attachments')
    .getPublicUrl(path)

  const { data, error } = await ctx.admin.from('kanban_attachments')
    .insert({
      card_id:     cardId,
      file_url:    publicUrl,
      file_name:   file.name,
      file_type:   file.type || null,
      uploaded_by: ctx.user.id,
    })
    .select('id, file_url, file_name, file_type, created_at')
    .single()

  if (error) return null
  revalidatePath(`/social/kanban/${boardId}`)
  return data as Attachment
}

export async function deleteAttachmentAction(
  attachmentId: string, fileUrl: string, boardId: string
): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  const match = fileUrl.match(/kanban-attachments\/(.+)$/)
  if (match) {
    await ctx.admin.storage.from('kanban-attachments').remove([match[1]])
  }
  await ctx.admin.from('kanban_attachments').delete().eq('id', attachmentId)
  revalidatePath(`/social/kanban/${boardId}`)
}
