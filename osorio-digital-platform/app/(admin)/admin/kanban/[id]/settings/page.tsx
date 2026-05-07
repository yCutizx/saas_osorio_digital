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

  const { data: board } = await adminSupabase
    .from('kanban_boards')
    .select('id, name, description, color, columns')
    .eq('id', params.id)
    .single()

  if (!board) notFound()

  // Current board members
  const { data: memberships } = await adminSupabase
    .from('kanban_board_members')
    .select('profile_id')
    .eq('board_id', params.id)

  const memberIds = (memberships ?? []).map((m) => m.profile_id)

  // All active staff (non-client roles)
  const { data: allStaff } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['admin', 'traffic_manager', 'social_media'])
    .eq('active', true)
    .order('full_name')

  const staff = allStaff ?? []
  const members    = staff.filter((s) => memberIds.includes(s.id))
  const nonMembers = staff.filter((s) => !memberIds.includes(s.id))

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

        {/* Board settings */}
        <section>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider text-xs mb-4">
            Informações do Quadro
          </h2>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <EditBoardForm board={board as any} />
        </section>

        {/* Divider */}
        <div className="border-t border-[#222]" />

        {/* Member management */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider text-xs">
              Membros do Quadro
            </h2>
            <p className="text-xs text-white/30 mt-1">
              Apenas membros adicionados podem ver e acessar este quadro (admin sempre tem acesso).
            </p>
          </div>
          <SettingsForm
            boardId={params.id}
            members={members}
            allStaff={[...members, ...nonMembers]}
          />
        </section>
      </div>
    </AppLayout>
  )
}
