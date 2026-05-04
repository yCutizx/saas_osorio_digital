import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AgencyKanbanBoard } from './agency-kanban-board'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function AdminKanbanPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const isAdmin = profile?.role === 'admin'

  const cardsQuery = adminSupabase
    .from('kanban_cards')
    .select('id, column_id, title, description, client_id, assigned_to, due_date, due_time, priority, tags, position, created_at, clients(name), profiles(full_name)')
    .eq('board_type', 'agency')
    .order('position', { ascending: true })

  // Membros da equipe só veem os próprios cards (via RLS), mas admin vai via adminClient
  const [{ data: cards }, { data: members }, { data: clients }] = await Promise.all([
    isAdmin
      ? cardsQuery
      : supabase
          .from('kanban_cards')
          .select('id, column_id, title, description, client_id, assigned_to, due_date, due_time, priority, tags, position, created_at, clients(name), profiles(full_name)')
          .eq('board_type', 'agency')
          .order('position', { ascending: true }),
    adminSupabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['traffic_manager', 'social_media'])
      .eq('active', true)
      .order('full_name'),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  return (
    <AppLayout pageTitle="Kanban da Agência">
      <AgencyKanbanBoard
        initialCards={cards ?? []}
        members={members ?? []}
        clients={clients ?? []}
        userRole={profile!.role}
        userId={user.id}
      />
    </AppLayout>
  )
}
