import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { ClientKanbanBoard } from './kanban-board'

export default async function ClientKanbanBoardPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'client') redirect('/client/home')

  // Verify the client has access to this board
  const { data: membership } = await adminSupabase
    .from('kanban_board_members')
    .select('board_id')
    .eq('board_id', params.id)
    .eq('profile_id', user.id)
    .single()

  if (!membership) notFound()

  const { data: board } = await adminSupabase
    .from('kanban_boards')
    .select('id, name, color, board_type, columns')
    .eq('id', params.id)
    .single()

  if (!board) notFound()

  const cardSelect = 'id, column_id, title, description, priority, tags, format, platform, due_date, clients(name), profiles(full_name)'

  const { data: cards } = await adminSupabase
    .from('kanban_cards')
    .select(cardSelect)
    .eq('board_id', params.id)
    .eq('archived', false)
    .order('position', { ascending: true })

  // Server actions for comments (client can read + comment)
  async function addComment(cardId: string, content: string) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return null
    const { data: p } = await sb.from('profiles').select('role, full_name').eq('id', u.id).single()
    if (p?.role !== 'client') return null
    const admin = createAdminClient()
    const { data, error } = await admin.from('kanban_comments')
      .insert({ card_id: cardId, user_id: u.id, content: content.trim() })
      .select('id, content, created_at, user_id')
      .single()
    if (error) return null
    return { ...data, profiles: { full_name: p.full_name as string } }
  }

  async function deleteComment(commentId: string) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return
    const { data: p } = await sb.from('profiles').select('role').eq('id', u.id).single()
    if (p?.role !== 'client') return
    const admin = createAdminClient()
    // Only delete own comments
    await admin.from('kanban_comments').delete().eq('id', commentId).eq('user_id', u.id)
  }

  async function getComments(cardId: string) {
    'use server'
    const admin = createAdminClient()
    const { data } = await admin.from('kanban_comments')
      .select('id, content, created_at, user_id, profiles(full_name)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []) as any[]
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: { id: string; label: string; color: string }[] = Array.isArray((board as any).columns) ? (board as any).columns : []

  return (
    <AppLayout pageTitle={board.name}>
      <ClientKanbanBoard
        boardName={board.name}
        columns={columns}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cards={(cards ?? []) as any[]}
        currentUserId={user.id}
        addComment={addComment}
        deleteComment={deleteComment}
        getComments={getComments}
      />
    </AppLayout>
  )
}
