'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateCalendarPaths } from '@/lib/revalidate-helpers'
import { createNotification, createNotificationForMany } from '@/lib/notifications'

export async function changeStatusAction(postId: string, status: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'social_media'].includes(profile?.role ?? '')) {
    return { error: 'Acesso negado.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('content_posts')
    .update({ status })
    .eq('id', postId)

  if (error) return { error: error.message }

  // Notificar cliente quando post entra em aprovação
  if (status === 'pending_approval') {
    const { data: post } = await admin
      .from('content_posts')
      .select('title, client_id')
      .eq('id', postId)
      .maybeSingle()
    if (post?.client_id) {
      const { data: clientUsers } = await admin
        .from('client_assignments')
        .select('user_id')
        .eq('client_id', post.client_id)
        .eq('role', 'client')
      const userIds = (clientUsers ?? []).map((c) => c.user_id).filter((id: string) => id !== user.id)
      if (userIds.length > 0) {
        await createNotificationForMany(userIds, {
          type:    'post_approval_pending',
          title:   'Novo post para aprovar',
          message: post.title,
          link:    '/client/calendar',
        })
      }
    }
  }

  revalidatePath(`/social/posts/${postId}`)
  revalidateCalendarPaths()
  return { ok: true }
}

export async function addCommentAction(
  postId:   string,
  content:  string,
  type:     'comment' | 'approval' | 'rejection',
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  if (!content.trim()) return { error: 'Comentário não pode estar vazio.' }

  // Inserir comentário
  const { error: commentErr } = await supabase.from('post_comments').insert({
    post_id:   postId,
    author_id: user.id,
    content:   content.trim(),
    type,
  })

  if (commentErr) return { error: commentErr.message }

  // Se for aprovação ou reprovação, atualizar status do post
  if (type === 'approval' || type === 'rejection') {
    const newStatus = type === 'approval' ? 'approved' : 'rejected'
    const admin = createAdminClient()
    const { error: statusErr } = await admin
      .from('content_posts')
      .update({ status: newStatus })
      .eq('id', postId)
    if (statusErr) return { error: 'Erro ao atualizar status do post.' }

    // Notificar staff (autor + responsável + admins)
    const { data: post } = await admin
      .from('content_posts')
      .select('title, author_id, assigned_to')
      .eq('id', postId)
      .maybeSingle()
    if (post) {
      const { data: admins } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('active', true)
      const targets = new Set<string>()
      if (post.author_id)  targets.add(post.author_id)
      if (post.assigned_to) targets.add(post.assigned_to)
      for (const a of admins ?? []) targets.add(a.id)
      targets.delete(user.id)
      const verbo = type === 'approval' ? 'aprovou' : 'reprovou'
      if (targets.size > 0) {
        await createNotificationForMany(Array.from(targets), {
          type:    'post_review',
          title:   `Cliente ${verbo} post`,
          message: post.title,
          link:    `/social/posts/${postId}`,
        })
      }
    }
  }

  revalidatePath(`/social/posts/${postId}`)
  revalidateCalendarPaths()
  return { ok: true }
}

export async function deletePostAction(postId: string): Promise<{ error?: string; clientId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'social_media'].includes(profile?.role ?? '')) return { error: 'Acesso negado.' }

  const admin = createAdminClient()
  const { data: post } = await admin
    .from('content_posts').select('client_id').eq('id', postId).maybeSingle()
  if (!post) return { error: 'Post não encontrado.' }

  const { error } = await admin.from('content_posts').delete().eq('id', postId)
  if (error) return { error: error.message }

  revalidateCalendarPaths()
  return { clientId: post.client_id }
}

// silence unused warnings if helper isn't used downstream
void createNotification
