'use client'

import { useRouter } from 'next/navigation'
import { useRealtimeSubscription } from '@/lib/hooks/use-realtime-subscription'

interface Props {
  postId:        string
  currentUserId: string | null
  table:         'content_posts' | 'custom_calendar_posts'
}

/**
 * Wrapper client-side para Server Components de detalhe de post.
 * Assina Realtime do post + post_comments e dispara router.refresh
 * quando OUTRO usuário muda algo (ignora eventos do próprio user).
 */
export function PostRealtimeWrapper({ postId, currentUserId, table }: Props) {
  const router = useRouter()

  useRealtimeSubscription({
    channel: `post-${postId}`,
    table,
    filter:  `id=eq.${postId}`,
    event:   'UPDATE',
    currentUserId,
    userColumn: 'author_id',
    onEvent: () => router.refresh(),
  })

  useRealtimeSubscription({
    channel: `post-comments-${postId}`,
    table:   'post_comments',
    filter:  `post_id=eq.${postId}`,
    event:   'INSERT',
    currentUserId,
    userColumn: 'author_id',
    onEvent: () => router.refresh(),
  })

  return null
}
