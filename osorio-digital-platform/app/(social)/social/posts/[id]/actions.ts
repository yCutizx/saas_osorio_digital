'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function changeStatusAction(postId: string, status: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'social_media'].includes(profile?.role ?? '')) {
    return { error: 'Acesso negado.' }
  }

  const { error } = await supabase
    .from('content_posts')
    .update({ status })
    .eq('id', postId)

  if (error) return { error: error.message }

  revalidatePath(`/social/posts/${postId}`)
  revalidatePath('/social/dashboard')
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
    await supabase.from('content_posts').update({ status: newStatus }).eq('id', postId)
  }

  revalidatePath(`/social/posts/${postId}`)
  revalidatePath('/social/dashboard')
  revalidatePath('/client/calendar')
  return { ok: true }
}
