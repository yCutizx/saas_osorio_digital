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

  const [
    { data: board },
    { data: members },
    { data: clients },
  ] = await Promise.all([
    adminSupabase
      .from('kanban_boards')
      .select('id, name, description, color, board_type, columns')
      .eq('id', params.id)
      .single(),
    adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .in('role', ['admin', 'social_media'])
      .eq('active', true)
      .order('full_name'),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  if (!board) notFound()

  const cardSelect = 'id, column_id, title, description, client_id, assigned_to, due_date, due_time, priority, tags, format, platform, position, created_at, clients(name), profiles(full_name)'

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
        members={members ?? []}
        clients={clients ?? []}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
