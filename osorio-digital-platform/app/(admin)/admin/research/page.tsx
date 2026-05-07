import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, FileSearch, ExternalLink, Trash2, Pencil } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { deleteResearchAction } from './actions'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function AdminResearchPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: research } = await supabase
    .from('market_research')
    .select('id, title, description, file_url, tags, created_at, client_id, clients(name)')
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Pesquisas de Mercado">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#888]">
            {research?.length ?? 0} pesquisas cadastradas
          </p>
          <Link
            href="/admin/research/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-bold hover:bg-[#f5d800] transition-colors shadow-[0_4px_20px_rgba(234,206,0,0.2)]"
          >
            <Plus className="h-4 w-4" />
            Nova Pesquisa
          </Link>
        </div>

        {!research?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FileSearch className="h-7 w-7 text-[#888]" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Nenhuma pesquisa cadastrada ainda</p>
              <p className="text-[#888] text-sm">Adicione pesquisas de mercado para compartilhar com seus clientes.</p>
            </div>
            <Link
              href="/admin/research/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-bold hover:bg-[#f5d800] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {research.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-5 rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/25 transition-colors"
              >
                {/* Ícone PDF */}
                <div className="w-10 h-10 rounded-xl bg-[#EACE00]/10 border border-[#EACE00]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <FileSearch className="h-4 w-4 text-[#EACE00]/70" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-[#888] border border-white/10">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(item.clients as any)?.name ?? 'Todos os clientes'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[#888]/60 pt-0.5 flex-wrap">
                    <span>
                      {format(parseISO(item.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    {item.tags && (item.tags as string[]).length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(item.tags as string[]).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-[#888]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/research/${item.id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#888] text-xs font-medium hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Link>

                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EACE00]/10 text-[#EACE00] border border-[#EACE00]/25 text-xs font-medium hover:bg-[#EACE00]/20 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir PDF
                  </a>

                  <form action={deleteResearchAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      title="Excluir"
                      className="p-1.5 rounded-lg text-[#888] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
