'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  calendar_id:    z.string().uuid(),
  title:          z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  caption:        z.string().optional(),
  platform:       z.string().min(1, 'Selecione ao menos uma plataforma'),
  media_type:     z.enum(['image', 'video', 'carousel', 'reel', 'story'] as const).optional(),
  media_url:      z.string().url('URL inválida').optional().or(z.literal('')),
  scheduled_at:   z.string().min(1, 'Data de agendamento obrigatória'),
  hashtags_raw:   z.string().optional(),
  internal_notes: z.string().optional(),
  assigned_to:    z.string().uuid().optional().or(z.literal('')),
  status:         z.enum(['draft', 'pending_approval'] as const),
})

export type FormState = { errors?: Partial<Record<string, string[]>>; message?: string }

export async function createCustomPostAction(
  prevState: FormState,
  formData:  FormData,
): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'social_media', 'traffic_manager'].includes(profile?.role ?? '')) {
    return { message: 'Acesso negado.' }
  }

  const calendarId = formData.get('calendar_id') as string

  if (profile?.role !== 'admin') {
    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('custom_calendar_members')
      .select('user_id').eq('calendar_id', calendarId).eq('user_id', user.id).maybeSingle()
    if (!membership) return { message: 'Acesso negado a este calendário.' }
  }

  const platformValues = (formData.getAll('platform') as string[]).filter(Boolean).join(',')

  const result = Schema.safeParse({
    calendar_id:    calendarId,
    title:          formData.get('title'),
    caption:        formData.get('caption') || undefined,
    platform:       platformValues,
    media_type:     formData.get('media_type') || undefined,
    media_url:      formData.get('media_url') || undefined,
    scheduled_at:   formData.get('scheduled_at'),
    hashtags_raw:   formData.get('hashtags_raw') || undefined,
    internal_notes: formData.get('internal_notes') || undefined,
    assigned_to:    formData.get('assigned_to') || undefined,
    status:         formData.get('status'),
  })

  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  const d = result.data
  const hashtags = d.hashtags_raw
    ? d.hashtags_raw.split(/[\s,]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean)
    : []

  const admin = createAdminClient()
  const { error } = await admin.from('custom_calendar_posts').insert({
    calendar_id:    d.calendar_id,
    author_id:      user.id,
    title:          d.title,
    caption:        d.caption ?? null,
    platform:       d.platform,
    media_type:     d.media_type ?? null,
    media_url:      d.media_url || null,
    scheduled_at:   d.scheduled_at,
    status:         d.status,
    hashtags:       hashtags.length > 0 ? hashtags : null,
    internal_notes: d.internal_notes ?? null,
    assigned_to:    d.assigned_to || null,
  })

  if (error) return { message: 'Erro ao criar post: ' + error.message }

  const month = format(new Date(d.scheduled_at), 'yyyy-MM')
  redirect(`/social/calendar/custom/${d.calendar_id}?month=${month}`)
}
