'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  revalidatePath(`/social/posts/${postId}`)
  revalidatePath('/social/dashboard')
  revalidatePath('/social/calendar')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/calendar')
  revalidatePath('/client/calendar')
  revalidatePath('/client/home')
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
  }

  revalidatePath(`/social/posts/${postId}`)
  revalidatePath('/social/dashboard')
  revalidatePath('/social/calendar')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/calendar')
  revalidatePath('/client/calendar')
  revalidatePath('/client/home')
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

  revalidatePath('/social/dashboard')
  return { clientId: post.client_id }
}
