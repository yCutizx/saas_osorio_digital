import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Eye, EyeOff, Trash2, Lightbulb, Pencil } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import { togglePublishAction, deleteInsightAction } from './actions'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function AdminInsightsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const { data: insights } = await supabase
    .from('insights')
    .select('id, title, content, tags, published, published_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <AppLayout pageTitle="Insights">
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#888]">
            {insights?.length ?? 0} insights cadastrados
          </p>
          <Link
            href="/admin/insights/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-bold hover:bg-[#f5d800] transition-colors shadow-[0_4px_20px_rgba(234,206,0,0.2)]"
          >
            <Plus className="h-4 w-4" />
            Novo Insight
          </Link>
        </div>

        {!insights?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center">
              <Lightbulb className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Nenhum insight publicado ainda</p>
              <p className="text-[#888] text-sm">Compartilhe conhecimento de mercado com seus clientes.</p>
            </div>
            <Link
              href="/admin/insights/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-bold hover:bg-[#f5d800] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro insight
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-4 p-5 rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/25 transition-colors"
              >
                {/* Ícone lateral */}
                <div className="w-10 h-10 rounded-xl bg-[#EACE00]/10 border border-[#EACE00]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="h-4 w-4 text-[#EACE00]/70" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      insight.published
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                        : 'bg-white/8 text-[#888] border border-white/10'
                    )}>
                      {insight.published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
                    {insight.content}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[#888]/60 pt-0.5 flex-wrap">
                    <span>
                      Criado em {format(parseISO(insight.created_at), "d 'de' MMM yyyy", { locale: ptBR })}
                    </span>
                    {insight.published_at && (
                      <span>
                        · Publicado em {format(parseISO(insight.published_at), "d 'de' MMM yyyy", { locale: ptBR })}
                      </span>
                    )}
                    {insight.tags?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {(insight.tags as string[]).map((tag) => (
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
                    href={`/admin/insights/${insight.id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#888] text-xs font-medium hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Link>

                  <form action={togglePublishAction}>
                    <input type="hidden" name="id" value={insight.id} />
                    <input type="hidden" name="published" value={(!insight.published).toString()} />
                    <button
                      type="submit"
                      title={insight.published ? 'Despublicar' : 'Publicar'}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        insight.published
                          ? 'bg-white/8 text-[#888] hover:bg-white/15 hover:text-white border border-white/10'
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
