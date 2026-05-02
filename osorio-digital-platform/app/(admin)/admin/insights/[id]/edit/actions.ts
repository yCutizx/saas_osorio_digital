'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

const schema = z.object({
  id:        z.string().uuid(),
  title:     z.string().min(3, 'Título muito curto.'),
  content:   z.string().min(10, 'Conteúdo muito curto.'),
  cover_url: z.string().url('URL inválida.').optional().or(z.literal('')),
  tags_raw:  z.string().optional(),
  published: z.string().optional(),
})

export type FormState = {
  message?: string
  errors?:  Record<string, string[]>
}

export async function updateInsightAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) return { message: 'Acesso negado.' }

  const parsed = schema.safeParse({
    id:        formData.get('id'),
    title:     formData.get('title'),
    content:   formData.get('content'),
    cover_url: (formData.get('cover_url') as string) || '',
    tags_raw:  formData.get('tags_raw'),
    published: formData.get('published'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const d = parsed.data
  const tags      = (d.tags_raw ?? '').split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
  const published = d.published === 'on'

  const { error } = await supabase.from('insights').update({
    title:        d.title,
    content:      d.content,
    cover_url:    d.cover_url || null,
    tags:         tags.length > 0 ? tags : null,
    published,
    published_at: published ? new Date().toISOString() : null,
  }).eq('id', d.id)

  if (error) return { message: error.message }

  revalidatePath('/admin/insights')
  redirect('/admin/insights')
}
