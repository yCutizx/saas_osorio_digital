'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function togglePublishAction(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') return

  const id        = formData.get('id') as string
  const published = formData.get('published') === 'true'

  await supabase
    .from('insights')
    .update({
      published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq('id', id)

  revalidatePath('/admin/insights')
}

export async function deleteInsightAction(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') return

  const id = formData.get('id') as string
  await supabase.from('insights').delete().eq('id', id)
  revalidatePath('/admin/insights')
}
