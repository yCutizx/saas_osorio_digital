import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileSearch, ExternalLink, Hash } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireMinPlan } from '@/lib/client-plan'

export default async function ClientResearchPage() {
  await requireMinPlan('premium')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  if (!assignment) redirect('/client/home')

  const { data: research } = await supabase
    .from('market_research')
    .select('id, title, description, file_url, tags, created_at, client_id')
    .or(`client_id.is.null,client_id.eq.${assignment.client_id}`)
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Pesquisas de Mercado">
      <div className="space-y-6">

        <p className="text-sm text-muted-foreground">
          Pesquisas e análises de mercado selecionadas pela equipe Osorio Digital.
        </p>

        {!research?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <FileSearch className="h-10 w-10 text-white/20" />
            <p className="text-muted-foreground text-sm">Nenhuma pesquisa disponível ainda.</p>
            <p className="text-xs text-muted-foreground/60">
              Em breve a equipe adicionará pesquisas e análises do seu segmento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {research.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                    <span>
                      {format(parseISO(item.created_at), "d 'de' MMMM yyyy", { locale: ptBR })}
                    </span>
                    {!item.client_id && (
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                        Geral
                      </span>
                    )}
                  </div>
                  {item.tags && (item.tags as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(item.tags as string[]).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 text-xs text-brand-yellow/70 bg-brand-yellow/10 px-2 py-0.5 rounded-full"
                        >
                          <Hash className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href={item.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/30 text-sm font-medium hover:bg-brand-yellow/20 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir PDF
                </a>
              </div>
            ))}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
