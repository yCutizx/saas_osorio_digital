import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, LayoutList } from 'lucide-react'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function AdminKanbanPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: boards } = await adminSupabase
    .from('kanban_boards')
    .select('id, name, description, color, columns, created_at, kanban_cards(count)')
    .eq('board_type', 'agency')
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Kanban">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Quadros da Agência</h1>
            <p className="text-white/40 text-sm mt-0.5">Organize o trabalho em quadros personalizados</p>
          </div>
          <Link href="/admin/kanban/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors">
            <Plus className="h-4 w-4" />Novo Quadro
          </Link>
        </div>

        {(!boards || boards.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <LayoutList className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Nenhum quadro criado ainda.</p>
            <Link href="/admin/kanban/new" className="text-[#EACE00] text-sm hover:underline">
              Criar primeiro quadro
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cardCount = (board.kanban_cards as any)?.[0]?.count ?? 0
              const cols      = Array.isArray(board.columns) ? board.columns as { id: string; color: string }[] : []
              return (
                <Link key={board.id} href={`/admin/kanban/${board.id}`}
                  className="group flex flex-col gap-3 p-5 bg-[#0d0d0d] border border-[#222] rounded-2xl hover:border-[#333] transition-all">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: board.color + '22' }}>
                      <LayoutList className="h-5 w-5" style={{ color: board.color }} />
                    </div>
                    <span className="text-xs text-white/20">
                      {new Date(board.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm group-hover:text-[#EACE00] transition-colors">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-white/40 text-xs mt-1 line-clamp-2">{board.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">
                      {cardCount} card{cardCount !== 1 ? 's' : ''} &middot; {cols.length} coluna{cols.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex gap-1">
                      {cols.slice(0, 5).map((col) => (
                        <span key={col.id} className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
