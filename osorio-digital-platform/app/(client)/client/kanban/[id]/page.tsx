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

  async function createCard(columnId: string, title: string, description: string, priority: string) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return null
    const { data: p } = await sb.from('profiles').select('role').eq('id', u.id).single()
    if (p?.role !== 'client') return null
    const admin = createAdminClient()
    const { data, error } = await admin.from('kanban_cards').insert({
      board_id:    params.id,
      board_type:  'agency',
      column_id:   columnId,
      title:       title.trim(),
      description: description.trim() || null,
      priority:    priority || 'media',
      created_by:  u.id,
      position:    Date.now(),
    }).select('id, column_id, title, description, priority, tags, format, platform, due_date').single()
    if (error) return null
    return data
  }

  async function updateCard(cardId: string, title: string, description: string, priority: string) {
    'use server'
    const sb = await createClient()
    const { data: { user: u } } = await sb.auth.getUser()
    if (!u) return false
    const { data: p } = await sb.from('profiles').select('role').eq('id', u.id).single()
    if (p?.role !== 'client') return false
    const admin = createAdminClient()
    // Verify card belongs to a board the client has access to
    const { data: membership } = await admin.from('kanban_board_members')
      .select('board_id').eq('board_id', params.id).eq('profile_id', u.id).single()
    if (!membership) return false
    const { error } = await admin.from('kanban_cards').update({
      title:       title.trim(),
      description: description.trim() || null,
      priority:    priority || 'media',
    }).eq('id', cardId).eq('board_id', params.id)
    return !error
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
        createCard={createCard}
        updateCard={updateCard}
      />
    </AppLayout>
  )
}
