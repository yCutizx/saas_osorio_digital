'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  title:       z.string().min(3, 'Título muito curto.'),
  description: z.string().optional(),
  file_url:    z.string().url('URL do arquivo inválida.'),
  client_id:   z.string().uuid().optional().or(z.literal('')),
  tags_raw:    z.string().optional(),
})

export type FormState = {
  message?: string
  errors?:  Record<string, string[]>
}

export async function createResearchAction(
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
    title:       formData.get('title') as string,
    description: (formData.get('description') as string) || undefined,
    file_url:    formData.get('file_url') as string,
    client_id:   (formData.get('client_id') as string) || '',
    tags_raw:    formData.get('tags_raw') as string,
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const tags = (parsed.data.tags_raw ?? '')
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  const { error } = await supabase.from('market_research').insert({
    author_id:   user.id,
    title:       parsed.data.title,
    description: parsed.data.description ?? null,
    file_url:    parsed.data.file_url,
    client_id:   parsed.data.client_id || null,
    tags:        tags.length > 0 ? tags : null,
  })

  if (error) return { message: error.message }

  revalidatePath('/admin/research')
  redirect('/admin/research')
}
