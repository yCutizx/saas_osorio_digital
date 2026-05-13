import Link from 'next/link'
import { Plus, Eye, EyeOff, Trash2, Lightbulb, Pencil, FileText, Hash } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import { togglePublishAction, deleteInsightAction } from './actions'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
  mercado:      { label: 'Análise de Mercado',       cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  tendencia:    { label: 'Tendência',                cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  benchmark:    { label: 'Benchmark',                cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  performance:  { label: 'Relatório de Performance', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  oportunidade: { label: 'Oportunidade',             cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  alerta:       { label: 'Alerta',                   cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  dica:         { label: 'Dica Estratégica',         cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

interface PageProps {
  searchParams: { type?: string; client?: string }
}

export default async function AdminInsightsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  const [{ data: allClients }] = await Promise.all([
    admin.from('clients').select('id, name').eq('active', true).order('name'),
  ])

  // Build filtered query
  let query = supabase
    .from('insights')
    .select('id, title, content, type, client_id, cover_url, file_url, tags, published, published_at, created_at, clients(name)')
    .order('created_at', { ascending: false })

  if (searchParams.type) query = query.eq('type', searchParams.type)
  if (searchParams.client === 'null') {
    query = query.is('client_id', null)
  } else if (searchParams.client) {
    query = query.eq('client_id', searchParams.client)
  }

  const { data: insights } = await query

  const activeType   = searchParams.type   ?? ''
  const activeClient = searchParams.client ?? ''

  function filterHref(type: string, client: string) {
    const params = new URLSearchParams()
    if (type)   params.set('type', type)
    if (client) params.set('client', client)
    const q = params.toString()
    return `/admin/insights${q ? `?${q}` : ''}`
  }

  return (
    <AppLayout pageTitle="Insights">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#888]">
            {insights?.length ?? 0} insight{insights?.length !== 1 ? 's' : ''} encontrado{insights?.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/admin/insights/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-bold hover:bg-[#f5d800] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Insight
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {/* Tipo */}
          <div className="flex flex-wrap gap-1.5">
            <Link href={filterHref('', activeClient)}
              className={cn('px-3 py-1 rounded-full text-xs border transition-colors',
                !activeType ? 'bg-[#EACE00] text-black border-[#EACE00] font-semibold' : 'border-[#333] text-white/50 hover:border-[#555] hover:text-white')}>
              Todos os tipos
            </Link>
            {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (
              <Link key={val} href={filterHref(val, activeClient)}
                className={cn('px-3 py-1 rounded-full text-xs border transition-colors',
                  activeType === val ? 'bg-[#EACE00] text-black border-[#EACE00] font-semibold' : 'border-[#333] text-white/50 hover:border-[#555] hover:text-white')}>
                {cfg.label}
              </Link>
            ))}
          </div>

          {/* Divisor */}
          {allClients && allClients.length > 0 && (
            <div className="w-px bg-[#222] mx-1 self-stretch" />
          )}

          {/* Cliente */}
          {allClients && allClients.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Link href={filterHref(activeType, '')}
                className={cn('px-3 py-1 rounded-full text-xs border transition-colors',
                  !activeClient ? 'bg-[#EACE00]/20 text-[#EACE00] border-[#EACE00]/30 font-semibold' : 'border-[#333] text-white/50 hover:border-[#555] hover:text-white')}>
                Todos clientes
              </Link>
              <Link href={filterHref(activeType, 'null')}
                className={cn('px-3 py-1 rounded-full text-xs border transition-colors',
                  activeClient === 'null' ? 'bg-[#EACE00]/20 text-[#EACE00] border-[#EACE00]/30 font-semibold' : 'border-[#333] text-white/50 hover:border-[#555] hover:text-white')}>
                Gerais
              </Link>
              {allClients.map((c) => (
                <Link key={c.id} href={filterHref(activeType, c.id)}
                  className={cn('px-3 py-1 rounded-full text-xs border transition-colors',
                    activeClient === c.id ? 'bg-[#EACE00]/20 text-[#EACE00] border-[#EACE00]/30 font-semibold' : 'border-[#333] text-white/50 hover:border-[#555] hover:text-white')}>
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        {!insights?.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#EACE00]/10 border border-[#EACE00]/20 flex items-center justify-center">
              <Lightbulb className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Nenhum insight encontrado</p>
              <p className="text-[#888] text-sm">Tente remover os filtros ou crie um novo insight.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {insights.map((insight) => {
              const typeCfg = insight.type ? TYPE_CONFIG[insight.type] : null
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const clientName = (insight.clients as any)?.name as string | null

              return (
                <div key={insight.id}
                  className="flex flex-col bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden hover:border-[#EACE00]/25 transition-colors group">

                  {/* Capa */}
                  {insight.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={insight.cover_url} alt={insight.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-[#111] flex items-center justify-center">
                      <Lightbulb className="h-8 w-8 text-[#EACE00]/20" />
                    </div>
                  )}

                  <div className="flex-1 p-4 space-y-3">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {typeCfg && (
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium border', typeCfg.cls)}>
                          {typeCfg.label}
                        </span>
                      )}
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium border',
                        insight.published
                          ? 'bg-green-500/15 text-green-400 border-green-500/30'
                          : 'bg-white/8 text-[#888] border-white/10'
                      )}>
                        {insight.published ? 'Publicado' : 'Rascunho'}
                      </span>
                      {insight.file_url && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-white/40 border-white/10 inline-flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5" />PDF
                        </span>
                      )}
                    </div>

                    {/* Título */}
                    <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-[#EACE00] transition-colors">
                      {insight.title}
                    </h3>

                    {/* Cliente + Data */}
                    <div className="flex items-center justify-between text-[10px] text-white/30">
                      <span>{clientName ?? 'Geral'}</span>
                      <span>
                        {new Date(insight.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Tags */}
                    {insight.tags && (insight.tags as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(insight.tags as string[]).slice(0, 3).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] text-[#EACE00]/60 bg-[#EACE00]/8 border border-[#EACE00]/15 px-1.5 py-0.5 rounded-full">
                            <Hash className="h-2 w-2" />{tag}
                          </span>
                        ))}
                        {(insight.tags as string[]).length > 3 && (
                          <span className="text-[10px] text-white/30">+{(insight.tags as string[]).length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Link href={`/admin/insights/${insight.id}/edit`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[#888] text-xs font-medium hover:bg-white/10 hover:text-white transition-colors">
                        <Pencil className="h-3 w-3" />Editar
                      </Link>

                      <form action={togglePublishAction}>
                        <input type="hidden" name="id" value={insight.id} />
                        <input type="hidden" name="published" value={(!insight.published).toString()} />
                        <button type="submit" title={insight.published ? 'Despublicar' : 'Publicar'}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            insight.published
                              ? 'bg-white/8 text-[#888] border border-white/10 hover:text-white'
                              : 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                          )}>
                          {insight.published
                            ? <><EyeOff className="h-3 w-3" /></>
                            : <><Eye className="h-3 w-3" /></>}
                        </button>
                      </form>

                      <form action={deleteInsightAction}>
                        <input type="hidden" name="id" value={insight.id} />
                        <button type="submit" title="Excluir"
                          className="p-1.5 rounded-lg text-[#888] hover:bg-red-500/10 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </AppLayout>
  )
}
