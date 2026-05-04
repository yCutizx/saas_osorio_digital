'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type FormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  success?: boolean
}

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) return null
  return { supabase, admin: createAdminClient(), user, role: profile!.role }
}

const CardSchema = z.object({
  column_id:   z.string().min(1),
  title:       z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  client_id:   z.string().uuid().optional().or(z.literal('')),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
  priority:    z.enum(['baixa', 'media', 'alta'] as const),
  tags_raw:    z.string().optional(),
})

export async function createCardAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { message: 'Não autorizado.' }

  const result = CardSchema.safeParse({
    column_id:   formData.get('column_id'),
    title:       formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    client_id:   (formData.get('client_id') as string) || '',
    assigned_to: (formData.get('assigned_to') as string) || '',
    due_date:    (formData.get('due_date') as string) || undefined,
    due_time:    (formData.get('due_time') as string) || undefined,
    priority:    formData.get('priority'),
    tags_raw:    (formData.get('tags_raw') as string) || undefined,
  })

  if (!result.success) return { errors: result.error.flatten().fieldErrors as FormState['errors'] }

  const d    = result.data
  const tags = d.tags_raw ? d.tags_raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : []

  const { error } = await ctx.admin.from('kanban_cards').insert({
    board_type:  'agency',
    column_id:   d.column_id,
    title:       d.title,
    description: d.description ?? null,
    client_id:   d.client_id || null,
    assigned_to: d.assigned_to || null,
    due_date:    d.due_date || null,
    due_time:    d.due_time || null,
    priority:    d.priority,
    tags:        tags.length > 0 ? tags : null,
    created_by:  ctx.user.id,
    position:    Date.now(),
  })

  if (error) return { message: error.message }

  revalidatePath('/admin/kanban')
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
    column_id:   formData.get('column_id'),
    title:       formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    client_id:   (formData.get('client_id') as string) || '',
    assigned_to: (formData.get('assigned_to') as string) || '',
    due_date:    (formData.get('due_date') as string) || undefined,
    due_time:    (formData.get('due_time') as string) || undefined,
    priority:    formData.get('priority'),
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
    tags:        tags.length > 0 ? tags : null,
  }).eq('id', d.card_id)

  if (error) return { message: error.message }

  revalidatePath('/admin/kanban')
  return { success: true }
}

export async function deleteCard(cardId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_cards').delete().eq('id', cardId)
  revalidatePath('/admin/kanban')
}

export async function moveCard(cardId: string, newColumnId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.supabase.from('kanban_cards')
    .update({ column_id: newColumnId, position: Date.now() })
    .eq('id', cardId)
}
