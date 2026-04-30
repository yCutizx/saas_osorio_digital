import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Eye, EyeOff, Trash2, Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import { togglePublishAction, deleteInsightAction } from './actions'

export default async function AdminInsightsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const { data: insights } = await supabase
    .from('insights')
    .select('id, title, content, tags, published, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Insights">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {insights?.length ?? 0} insights cadastrados
          </p>
          <Link
            href="/admin/insights/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-yellow text-brand-black text-sm font-semibold hover:bg-brand-yellow/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Insight
          </Link>
        </div>

        {!insights?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Lightbulb className="h-10 w-10 text-white/20" />
            <p className="text-muted-foreground text-sm">Nenhum insight publicado ainda.</p>
            <Link
              href="/admin/insights/new"
              className="text-brand-yellow text-sm hover:underline"
            >
              Criar o primeiro insight
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      insight.published
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : 'bg-white/10 text-white/50'
                    )}>
                      {insight.published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {insight.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/70 pt-0.5">
                    <span>
                      Criado em {format(parseISO(insight.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    {insight.published_at && (
                      <span>
                        · Publicado em {format(parseISO(insight.published_at), "d 'de' MMM yyyy", { locale: ptBR })}
                      </span>
                    )}
                    {insight.tags?.length > 0 && (
                      <span>· {(insight.tags as string[]).join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <form action={togglePublishAction}>
                    <input type="hidden" name="id" value={insight.id} />
                    <input type="hidden" name="published" value={(!insight.published).toString()} />
                    <button
                      type="submit"
                      title={insight.published ? 'Despublicar' : 'Publicar'}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        insight.published
                          ? 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                          : 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                      )}
                    >
                      {insight.published
                        ? <><EyeOff className="h-3.5 w-3.5" /> Despublicar</>
                        : <><Eye className="h-3.5 w-3.5" /> Publicar</>}
                    </button>
                  </form>

                  <form action={deleteInsightAction}>
                    <input type="hidden" name="id" value={insight.id} />
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
