import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileSearch, ExternalLink } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TrafficResearchPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'traffic_manager'].includes(profile?.role ?? '')) {
    redirect('/traffic/dashboard')
  }

  // Mostra pesquisas globais + as dos clientes que o gestor gerencia
  let researchQuery = supabase
    .from('market_research')
    .select('id, title, description, file_url, tags, created_at, client_id, clients(name)')
    .order('created_at', { ascending: false })

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    researchQuery = researchQuery.or(
      `client_id.is.null${ids.length > 0 ? `,client_id.in.(${ids.join(',')})` : ''}`
    )
  }

  const { data: research } = await researchQuery

  return (
    <AppLayout pageTitle="Pesquisas de Mercado">
      <div className="space-y-5">

        <p className="text-white/40 text-sm">
          {research?.length ?? 0} pesquisa{(research?.length ?? 0) !== 1 ? 's' : ''} disponível{(research?.length ?? 0) !== 1 ? 'is' : ''}
        </p>

        {!research?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center">
              <FileSearch className="h-7 w-7 text-[#EACE00]/50" />
            </div>
            <p className="text-white/40 text-sm">Nenhuma pesquisa disponível.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {research.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-5 rounded-2xl bg-[#111] border border-[#222]"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/40">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(item.clients as any)?.name ?? 'Todos os clientes'}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-white/50 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-white/25 pt-0.5">
                    <span>{format(parseISO(item.created_at), "d 'de' MMM yyyy", { locale: ptBR })}</span>
                    {item.tags && (item.tags as string[]).length > 0 && (
                      <span>· {(item.tags as string[]).join(', ')}</span>
                    )}
                  </div>
                </div>

                {item.file_url && (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EACE00]/10 text-[#EACE00] border border-[#EACE00]/25 text-xs font-medium hover:bg-[#EACE00]/20 transition-colors shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
