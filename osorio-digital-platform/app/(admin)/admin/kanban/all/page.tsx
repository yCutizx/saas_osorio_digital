import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutList, ArrowLeft } from 'lucide-react'

export default async function AllBoardsPage() {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/kanban')

  const { data: boards } = await adminSupabase
    .from('kanban_boards')
    .select('id, name, description, color, columns, created_at, board_type, kanban_cards(count), profiles!kanban_boards_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  const agencyBoards  = (boards ?? []).filter((b) => b.board_type === 'agency')
  const contentBoards = (boards ?? []).filter((b) => b.board_type === 'content')

  function BoardGrid({ items, basePath }: { items: typeof boards; basePath: string }) {
    if (!items?.length) return <p className="text-white/30 text-sm">Nenhum quadro.</p>
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((board) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cardCount = (board.kanban_cards as any)?.[0]?.count ?? 0
          const cols      = Array.isArray(board.columns) ? board.columns as { id: string; color: string }[] : []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const creator   = (board.profiles as any)?.full_name ?? '—'
          return (
            <Link key={board.id} href={`/${basePath}/kanban/${board.id}`}
              className="group flex flex-col gap-3 p-5 bg-[#0d0d0d] border border-[#222] rounded-2xl hover:border-[#333] transition-all">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: board.color + '22' }}>
                  <LayoutList className="h-5 w-5" style={{ color: board.color }} />
                </div>
                <span className="text-xs text-white/20">{new Date(board.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm group-hover:text-[#EACE00] transition-colors">
                  {board.name}
                </h3>
                {board.description && (
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{board.description}</p>
                )}
                <p className="text-[10px] text-white/20 mt-1">Criado por {creator}</p>
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
    )
  }

  return (
    <AppLayout pageTitle="Todos os Quadros">
      <div className="space-y-8 max-w-6xl">
        <div>
          <Link href="/admin/kanban"
            className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />Voltar
          </Link>
          <h1 className="text-xl font-bold text-white">Todos os Quadros</h1>
          <p className="text-white/40 text-sm mt-0.5">Visão administrativa — todos os quadros da plataforma</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Agência ({agencyBoards.length})
          </h2>
          <BoardGrid items={agencyBoards} basePath="admin" />
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Conteúdo / Social ({contentBoards.length})
          </h2>
          <BoardGrid items={contentBoards} basePath="social" />
        </section>
      </div>
    </AppLayout>
  )
}
