import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ContentKanbanBoard } from './content-kanban-board'

const ALLOWED = ['admin', 'social_media']

export default async function SocialKanbanPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/social/dashboard')

  const [{ data: cards }, { data: members }, { data: clients }] = await Promise.all([
    adminSupabase
      .from('kanban_cards')
      .select('id, column_id, title, description, client_id, assigned_to, due_date, due_time, priority, tags, format, platform, position, created_at, clients(name), profiles(full_name)')
      .eq('board_type', 'content')
      .order('position', { ascending: true }),
    adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'social_media')
      .eq('active', true)
      .order('full_name'),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  return (
    <AppLayout pageTitle="Kanban de Conteúdo">
      <ContentKanbanBoard
        initialCards={cards ?? []}
        members={members ?? []}
        clients={clients ?? []}
        userRole={profile!.role}
      />
    </AppLayout>
  )
}
