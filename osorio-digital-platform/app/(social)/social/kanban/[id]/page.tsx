import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { KanbanBoard } from './kanban-board'

const ALLOWED = ['admin', 'social_media']

export default async function SocialKanbanBoardPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/social/dashboard')

  // Access: must be a member OR the board creator
  const [{ data: membership }, { data: boardOwner }] = await Promise.all([
    adminSupabase
      .from('kanban_board_members')
      .select('board_id')
      .eq('board_id', params.id)
      .eq('profile_id', user.id)
      .maybeSingle(),
    adminSupabase
      .from('kanban_boards')
      .select('created_by')
      .eq('id', params.id)
      .maybeSingle(),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!membership && (boardOwner as any)?.created_by !== user.id) redirect('/social/kanban')

  const [
    { data: board },
    { data: clients },
    { data: boardMembersRaw },
  ] = await Promise.all([
    adminSupabase
      .from('kanban_boards')
      .select('id, name, description, color, board_type, columns')
      .eq('id', params.id)
      .single(),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
    adminSupabase
      .from('kanban_board_members')
      .select('profiles:profile_id (id, full_name, email)')
      .eq('board_id', params.id),
  ])

  const boardMembers = ((boardMembersRaw ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => m.profiles)
    .filter(Boolean) as Array<{ id: string; full_name: string | null; email: string }>)

  if (!board) notFound()

  const cardSelect = 'id, column_id, title, description, client_id, assigned_to, due_date, due_time, priority, tags, format, platform, position, created_at, cover_url, labels, clients(name), profiles!kanban_cards_assigned_to_fkey(full_name)'

  const { data: cards, error: cardsError } = await adminSupabase
    .from('kanban_cards')
    .select(cardSelect)
    .eq('board_id', params.id)
    .not('archived', 'is', true)
    .order('position', { ascending: true })

  if (cardsError) console.error('[social/kanban] cards error:', cardsError.message)

  return (
    <AppLayout pageTitle={board.name}>
      <KanbanBoard
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        board={board as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialCards={(cards ?? []) as any[]}
        boardMembers={boardMembers}
        clients={clients ?? []}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
