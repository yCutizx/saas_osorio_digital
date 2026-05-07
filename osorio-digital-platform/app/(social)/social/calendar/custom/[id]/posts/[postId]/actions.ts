'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAccess(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'social_media', 'traffic_manager'].includes(profile?.role ?? '')) {
    return { error: 'Acesso negado.' }
  }

  const admin = createAdminClient()
  const { data: post } = await admin
    .from('custom_calendar_posts').select('id, calendar_id').eq('id', postId).maybeSingle()
  if (!post) return { error: 'Post não encontrado.' }

  if (profile?.role !== 'admin') {
    const { data: membership } = await admin
      .from('custom_calendar_members')
      .select('user_id').eq('calendar_id', post.calendar_id).eq('user_id', user.id).maybeSingle()
    if (!membership) return { error: 'Acesso negado a este calendário.' }
  }

  return { user, profile, post, admin }
}

export async function changeCustomStatusAction(postId: string, newStatus: string) {
  const v = await verifyAccess(postId)
  if ('error' in v) return { error: v.error }

  const { admin, post } = v
  const { error } = await admin
    .from('custom_calendar_posts').update({ status: newStatus }).eq('id', postId)
  if (error) return { error: error.message }

  revalidatePath(`/social/calendar/custom/${post.calendar_id}/posts/${postId}`)
  return {}
}

export async function addCustomCommentAction(postId: string, content: string, type: string) {
  const v = await verifyAccess(postId)
  if ('error' in v) return { error: v.error }

  const { user, admin, post } = v
  const { error } = await admin
    .from('post_comments').insert({ post_id: postId, author_id: user.id, content, type })
  if (error) return { error: error.message }

  revalidatePath(`/social/calendar/custom/${post.calendar_id}/posts/${postId}`)
  return {}
}
