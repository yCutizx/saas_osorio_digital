import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutList } from 'lucide-react'

export default async function ClientKanbanPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') redirect('/client/home')

  // Boards shared with this client profile via kanban_board_members
  const { data: memberships } = await adminSupabase
    .from('kanban_board_members')
    .select('board_id, kanban_boards(id, name, color, board_type, columns)')
    .eq('profile_id', user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boards = (memberships ?? []).map((m: any) => m.kanban_boards).filter(Boolean)

  return (
    <AppLayout pageTitle="Meus Quadros">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-xl font-bold text-white">Meus Quadros</h1>
          <p className="text-sm text-white/40 mt-1">Quadros compartilhados com você pela agência.</p>
        </div>

        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutList className="h-10 w-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Nenhum quadro compartilhado ainda.</p>
            <p className="text-white/20 text-xs mt-1">A agência vai adicionar você aos quadros em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {boards.map((board: any) => {
              const cols: { id: string; label: string; color: string }[] = Array.isArray(board.columns) ? board.columns : []
              return (
                <Link key={board.id} href={`/client/kanban/${board.id}`}
                  className="group relative bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#EACE00]/40 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: board.color + '22' }}>
                      <LayoutList className="h-5 w-5" style={{ color: board.color }} />
                    </div>
                  </div>
                  <h3 className="text-white font-semibold mb-1">{board.name}</h3>
                  {cols.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {cols.map((col) => (
                        <div key={col.id} className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                          <span className="text-xs text-white/40">{col.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
