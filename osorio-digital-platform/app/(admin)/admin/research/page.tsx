import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, FileSearch, ExternalLink, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { deleteResearchAction } from './actions'

export default async function AdminResearchPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const { data: research } = await supabase
    .from('market_research')
    .select('id, title, description, file_url, tags, created_at, client_id, clients(name)')
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Pesquisas de Mercado">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {research?.length ?? 0} pesquisas cadastradas
          </p>
          <Link
            href="/admin/research/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-yellow text-brand-black text-sm font-semibold hover:bg-brand-yellow/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Pesquisa
          </Link>
        </div>

        {!research?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <FileSearch className="h-10 w-10 text-white/20" />
            <p className="text-muted-foreground text-sm">Nenhuma pesquisa cadastrada ainda.</p>
            <Link
              href="/admin/research/new"
              className="text-brand-yellow text-sm hover:underline"
            >
              Adicionar a primeira pesquisa
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {research.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(item.clients as any)?.name ?? 'Todos os clientes'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70 pt-0.5">
                    <span>
                      {format(parseISO(item.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    {item.tags && (item.tags as string[]).length > 0 && (
                      <span>· {(item.tags as string[]).join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30 text-xs font-medium hover:bg-brand-yellow/20 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir PDF
                  </a>

                  <form action={deleteResearchAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      title="Excluir"
                      className="p-1.5 rounded-lg text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
