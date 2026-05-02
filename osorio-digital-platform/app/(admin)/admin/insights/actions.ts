'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

async function getAllowedRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) return null
  return { supabase, user }
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const ctx = await getAllowedRole()
  if (!ctx) return

  const id        = formData.get('id') as string
  const published = formData.get('published') === 'true'

  await ctx.supabase
    .from('insights')
    .update({ published, published_at: published ? new Date().toISOString() : null })
    .eq('id', id)

  revalidatePath('/admin/insights')
}

export async function deleteInsightAction(formData: FormData): Promise<void> {
  const ctx = await getAllowedRole()
  if (!ctx) return

  const id = formData.get('id') as string
  await ctx.supabase.from('insights').delete().eq('id', id)
  revalidatePath('/admin/insights')
}
