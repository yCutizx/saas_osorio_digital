import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { EditBoardForm } from '../edit/edit-board-form'
import { SettingsForm } from './settings-form'

export default async function BoardSettingsPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/admin/kanban/${params.id}`)

  const [
    { data: board },
    { data: memberships },
    { data: allStaff },
    { data: clients },
  ] = await Promise.all([
    adminSupabase
      .from('kanban_boards')
      .select('id, name, description, color, columns, client_id')
      .eq('id', params.id)
      .single(),
    adminSupabase
      .from('kanban_board_members')
      .select('profile_id')
      .eq('board_id', params.id),
    adminSupabase
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['admin', 'traffic_manager', 'social_media'])
      .eq('active', true)
      .order('full_name'),
    adminSupabase
      .from('clients')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  if (!board) notFound()

  const currentMemberIds = (memberships ?? []).map((m) => m.profile_id)

  return (
    <AppLayout pageTitle="Configurações do Quadro">
      <div className="max-w-2xl space-y-10">
        {/* Breadcrumb */}
        <div>
          <p className="text-xs text-white/30 mb-1">
            <Link href="/admin/kanban" className="hover:text-white/60 transition-colors">Kanban</Link>
            <span className="mx-1.5">›</span>
            <Link href={`/admin/kanban/${board.id}`} className="hover:text-white/60 transition-colors">{board.name}</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/50">Configurações</span>
          </p>
          <h1 className="text-xl font-bold text-white">Configurações do Quadro</h1>
        </div>

        {/* Unified settings: name + client + members */}
        <section>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
            Configurações Gerais
          </h2>
          <p className="text-xs text-white/30 mb-4">
            Defina o nome, cliente vinculado e membros com acesso ao quadro.
          </p>
          <SettingsForm
            boardId={params.id}
            boardName={board.name}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clientId={(board as any).client_id ?? null}
            currentMemberIds={currentMemberIds}
            allStaff={allStaff ?? []}
            clients={clients ?? []}
          />
        </section>

        <div className="border-t border-[#222]" />

        {/* Column / appearance editing */}
        <section>
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
            Aparência e Colunas
          </h2>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <EditBoardForm board={board as any} />
        </section>
      </div>
    </AppLayout>
  )
}
