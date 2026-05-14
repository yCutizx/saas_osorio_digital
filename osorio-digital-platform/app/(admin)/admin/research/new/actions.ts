'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

const schema = z.object({
  title:       z.string().min(3, 'Título muito curto.'),
  description: z.string().optional(),
  file_url:    z.string().url('URL inválida.').optional().or(z.literal('')),
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

  if (!ALLOWED.includes(profile?.role ?? '')) return { message: 'Acesso negado.' }

  // Upload de PDF (prioritário) ou link externo
  const pdfFile   = formData.get('pdf_file') as File | null
  const externalUrl = (formData.get('file_url') as string)?.trim()
  let finalFileUrl: string | null = null

  if (pdfFile && pdfFile.size > 0) {
    if (pdfFile.type !== 'application/pdf') {
      return { message: 'Apenas arquivos PDF são aceitos.' }
    }
    if (pdfFile.size > 50 * 1024 * 1024) {
      return { message: 'Arquivo muito grande. Máximo 50 MB.' }
    }
    const safeName  = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath  = `${Date.now()}-${safeName}`

    const { data: uploaded, error: uploadErr } = await supabase.storage
      .from('research')
      .upload(filePath, pdfFile, { contentType: 'application/pdf', upsert: false })

    if (uploadErr) return { message: 'Erro no upload: ' + uploadErr.message }

    const { data: urlData } = supabase.storage.from('research').getPublicUrl(uploaded.path)
    finalFileUrl = urlData.publicUrl
  } else if (externalUrl) {
    finalFileUrl = externalUrl
  } else {
    return { message: 'Envie um arquivo PDF ou forneça um link externo.' }
  }

  const parsed = schema.safeParse({
    title:       formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    file_url:    finalFileUrl,
    client_id:   (formData.get('client_id') as string) || '',
    tags_raw:    formData.get('tags_raw'),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const d    = parsed.data
  const tags = (d.tags_raw ?? '').split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)

  const { error } = await supabase.from('market_research').insert({
    author_id:   user.id,
    title:       d.title,
    description: d.description ?? null,
    file_url:    finalFileUrl,
    client_id:   d.client_id || null,
    tags:        tags.length > 0 ? tags : null,
  })

  if (error) return { message: error.message }

  revalidatePath('/admin/research')
  revalidatePath('/client/research')
  revalidatePath('/social/research')
  revalidatePath('/traffic/research')
  redirect('/admin/research')
}
