'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

const INSIGHT_TYPES = [
  'mercado', 'tendencia', 'benchmark', 'performance',
  'oportunidade', 'alerta', 'dica',
] as const

const schema = z.object({
  id:        z.string().uuid(),
  title:     z.string().min(3, 'Título deve ter pelo menos 3 caracteres.'),
  content:   z.string().min(10, 'Conteúdo muito curto.'),
  type:      z.enum(INSIGHT_TYPES).optional().or(z.literal('')),
  client_id: z.string().uuid().optional().or(z.literal('')),
  tags_raw:  z.string().optional(),
  status:    z.enum(['draft', 'published']).default('draft'),
})

export type FormState = {
  message?: string
  errors?:  Record<string, string[]>
}

async function uploadToStorage(file: File, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null
  const admin = createAdminClient()
  const ext   = file.name.split('.').pop() ?? 'bin'
  const path  = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buf   = await file.arrayBuffer()
  const { error } = await admin.storage
    .from('post-media')
    .upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) return null
  const { data: { publicUrl } } = admin.storage.from('post-media').getPublicUrl(path)
  return publicUrl
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
    type:      (formData.get('type') as string) || '',
    client_id: (formData.get('client_id') as string) || '',
    tags_raw:  formData.get('tags_raw'),
    status:    (formData.get('status') as string) || 'draft',
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const d = parsed.data
  const tags      = (d.tags_raw ?? '').split(/[\s,]+/).map((t) => t.trim().toLowerCase()).filter(Boolean)
  const published = d.status === 'published'

  // Handle new file uploads (only replace if a new file is provided)
  const coverFile = formData.get('cover_file') as File | null
  const docFile   = formData.get('doc_file')   as File | null

  const [newCoverUrl, newFileUrl] = await Promise.all([
    coverFile && coverFile.size > 0 ? uploadToStorage(coverFile, 'insights/covers') : Promise.resolve(null),
    docFile   && docFile.size   > 0 ? uploadToStorage(docFile,   'insights/files')  : Promise.resolve(null),
  ])

  // Build update payload — keep existing URL if no new file was uploaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    title:        d.title,
    content:      d.content,
    type:         d.type || null,
    client_id:    d.client_id || null,
    tags:         tags.length > 0 ? tags : null,
    published,
    is_draft:     !published,
    published_at: published ? new Date().toISOString() : null,
  }

  if (newCoverUrl) updatePayload.cover_url = newCoverUrl
  if (newFileUrl)  updatePayload.file_url  = newFileUrl

  const { error } = await supabase
    .from('insights')
    .update(updatePayload)
    .eq('id', d.id)

  if (error) return { message: error.message }

  revalidatePath('/admin/insights')
  redirect('/admin/insights')
}
