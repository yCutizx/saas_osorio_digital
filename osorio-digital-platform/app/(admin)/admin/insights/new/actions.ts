'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
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

export async function createInsightAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') return { message: 'Acesso negado.' }

  const raw = {
    title:     formData.get('title') as string,
    content:   formData.get('content') as string,
    cover_url: (formData.get('cover_url') as string) || '',
    tags_raw:  formData.get('tags_raw') as string,
    published: formData.get('published') as string,
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tags = (parsed.data.tags_raw ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const published = parsed.data.published === 'on'

  const { error } = await supabase.from('insights').insert({
    author_id:    user.id,
    title:        parsed.data.title,
    content:      parsed.data.content,
    cover_url:    parsed.data.cover_url || null,
    tags:         tags.length > 0 ? tags : null,
    published,
    published_at: published ? new Date().toISOString() : null,
  })

  if (error) return { message: error.message }

  revalidatePath('/admin/insights')
  redirect('/admin/insights')
}
