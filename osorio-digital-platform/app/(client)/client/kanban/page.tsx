import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutList, Plus } from 'lucide-react'

export default async function ClientKanbanPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'client') redirect('/client/home')

  const [{ data: memberships }, { data: ownBoards }, { count: ownCount }] = await Promise.all([
    // Boards shared via membership
    adminSupabase
      .from('kanban_board_members')
      .select('board_id, kanban_boards(id, name, color, board_type, columns, created_by)')
      .eq('profile_id', user.id),

    // Own boards the client created but may not be in members table yet
    adminSupabase
      .from('kanban_boards')
      .select('id, name, color, board_type, columns, created_by')
      .eq('created_by', user.id),

    // Count own boards for the limit check
    adminSupabase
      .from('kanban_boards')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', user.id),
  ])

  // Merge: shared boards + own boards, deduplicated by id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sharedBoards = (memberships ?? []).map((m: any) => m.kanban_boards).filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allOwnBoards = (ownBoards ?? []) as any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seen = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boards: any[] = []
  for (const b of [...sharedBoards, ...allOwnBoards]) {
    if (b && !seen.has(b.id)) {
      seen.add(b.id)
      boards.push(b)
    }
  }

  const atLimit = (ownCount ?? 0) >= 3

  return (
    <AppLayout pageTitle="Meus Quadros">
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Meus Quadros</h1>
            <p className="text-sm text-white/40 mt-1">Quadros compartilhados com você e quadros próprios.</p>
          </div>

          <div className="relative group shrink-0">
            <Link
              href={atLimit ? '#' : '/client/kanban/new'}
              aria-disabled={atLimit}
              className={
                atLimit
                  ? 'inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white/5 border border-white/10 text-white/30 text-sm font-medium cursor-not-allowed select-none'
                  : 'inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#EACE00]/90 transition-colors'
              }
              onClick={atLimit ? (e) => e.preventDefault() : undefined}
            >
              <Plus className="h-4 w-4" />
              Novo Quadro
            </Link>
            {atLimit && (
              <div className="absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block w-52 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-xs text-white/60 shadow-xl">
                Limite de 3 quadros atingido
              </div>
            )}
          </div>
        </div>

        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutList className="h-10 w-10 text-white/10 mb-3" />
            <p className="text-white/30 text-sm">Nenhum quadro ainda.</p>
            <p className="text-white/20 text-xs mt-1">Crie um quadro próprio ou aguarde a agência compartilhar um com você.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {boards.map((board: any) => {
              const cols: { id: string; label: string; color: string }[] = Array.isArray(board.columns) ? board.columns : []
              const isOwn = board.created_by === user.id
              return (
                <Link key={board.id} href={`/client/kanban/${board.id}`}
                  className="group relative bg-[#111] border border-[#222] rounded-2xl p-5 hover:border-[#EACE00]/40 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: (board.color ?? '#EACE00') + '22' }}>
                      <LayoutList className="h-5 w-5" style={{ color: board.color ?? '#EACE00' }} />
                    </div>
                    {isOwn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EACE00]/10 text-[#EACE00]/70 border border-[#EACE00]/20 font-medium">
                        Meu
                      </span>
                    )}
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
