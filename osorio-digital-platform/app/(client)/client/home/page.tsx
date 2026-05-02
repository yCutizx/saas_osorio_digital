import Link from 'next/link'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, Clock, TrendingUp, DollarSign, Target, AlertTriangle, Zap } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ClientPlan } from '@/lib/client-plan'

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook',
  linkedin: 'LinkedIn', tiktok: 'TikTok', twitter: 'Twitter',
}

const PLAN_CONFIG: Record<string, { label: string; classes: string }> = {
  basico:  { label: 'Básico',  classes: 'bg-white/8 text-white/50 border border-white/10' },
  pro:     { label: 'Pro',     classes: 'bg-blue-500/15 text-blue-400 border border-blue-500/25' },
  premium: { label: 'Premium', classes: 'bg-[#EACE00]/15 text-[#EACE00] border border-[#EACE00]/25' },
}

async function fetchHomeData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()

  if (profile?.role !== 'client') redirect('/admin/dashboard')

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id, clients(name, plan)')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  if (!assignment) {
    return {
      userName: profile.full_name ?? '',
      clientName: '',
      plan: 'basico' as ClientPlan,
      kpis: null,
      pendingPosts: [],
      pendingTotal: 0,
      latestInsight: null,
      currentMonthLabel: format(new Date(), 'MMMM', { locale: ptBR }),
    }
  }

  const clientId   = assignment.client_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients    = assignment.clients as any
  const clientName = clients?.name ?? ''
  const plan       = (clients?.plan ?? 'basico') as ClientPlan

  const now        = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd   = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: campaigns } = await supabase
    .from('campaigns').select('id').eq('client_id', clientId)

  let kpis: { spend: number; revenue: number; conversions: number; roas: number } | null = null

  if (campaigns && campaigns.length > 0) {
    const ids = campaigns.map((c) => c.id)
    const { data: reports } = await supabase
      .from('traffic_reports')
      .select('spend, revenue, conversions')
      .in('campaign_id', ids)
      .gte('period_start', monthStart)
      .lte('period_end', monthEnd)

    if (reports && reports.length > 0) {
      let spend = 0, revenue = 0, conversions = 0
      for (const r of reports) {
        spend       += r.spend
        revenue     += r.revenue ?? 0
        conversions += r.conversions
      }
      kpis = { spend, revenue, conversions, roas: spend > 0 ? revenue / spend : 0 }
    }
  }

  const [{ data: pendingPosts }, { count: pendingTotal }] = await Promise.all([
    supabase
      .from('content_posts')
      .select('id, title, platform, scheduled_at')
      .eq('client_id', clientId)
      .eq('status', 'pending_approval')
      .order('scheduled_at', { ascending: true })
      .limit(3),
    supabase
      .from('content_posts')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'pending_approval'),
  ])

  let latestInsight: { id: string; title: string; content: string; published_at: string | null } | null = null
  if (plan === 'premium') {
    const { data: insight } = await supabase
      .from('insights')
      .select('id, title, content, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .single()
    latestInsight = insight ?? null
  }

  return {
    userName:          profile.full_name ?? '',
    clientName,
    plan,
    kpis,
    pendingPosts:      pendingPosts ?? [],
    pendingTotal:      pendingTotal ?? 0,
    latestInsight,
    currentMonthLabel: format(now, 'MMMM', { locale: ptBR }),
  }
}

interface PageProps {
  searchParams: { upgrade?: string }
}

export default async function ClientHomePage({ searchParams }: PageProps) {
  const { userName, clientName, plan, kpis, pendingPosts, pendingTotal, latestInsight, currentMonthLabel } =
    await fetchHomeData()

  const planCfg    = PLAN_CONFIG[plan] ?? PLAN_CONFIG.basico
  const firstName  = userName ? userName.split(' ')[0] : ''
  const showUpgrade = searchParams.upgrade === '1'

  return (
    <AppLayout pageTitle="Meu Painel">
      <div className="space-y-6">

        {/* Banner de upgrade */}
        {showUpgrade && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/8 border border-amber-500/25 text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Esta funcionalidade não está disponível no seu plano.{' '}
              <span className="font-bold">Entre em contato com a equipe para fazer upgrade.</span>
            </span>
          </div>
        )}

        {/* Boas-vindas */}
        <div className="rounded-2xl bg-gradient-to-br from-[#EACE00]/10 to-transparent border border-[#EACE00]/15 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-white/40 text-sm uppercase tracking-wider">Bem-vindo de volta</p>
              <h1 className="text-3xl font-black text-white leading-tight">
                {firstName ? (
                  <><span className="text-[#EACE00]">{firstName}</span>, olá!</>
                ) : 'Olá!'}
              </h1>
              {clientName && (
                <p className="text-white/50 text-sm mt-2">
                  Resumo de <span className="text-white font-semibold">{clientName}</span> em{' '}
                  <span className="text-white/70 capitalize">{currentMonthLabel}</span>.
                </p>
              )}
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 ${planCfg.classes}`}>
              Plano {planCfg.label}
            </span>
          </div>
        </div>

        {/* KPIs do mês */}
        {kpis && (
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Desempenho do mês</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Investimento', value: `R$ ${kpis.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-[#EACE00]',  bg: 'bg-[#EACE00]/10',  border: 'border-[#EACE00]/15' },
                { label: 'Receita',      value: `R$ ${kpis.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/15' },
                { label: 'ROAS',         value: `${kpis.roas.toFixed(2)}x`,                                                 icon: Target,     color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/15' },
                { label: 'Conversões',   value: kpis.conversions.toLocaleString('pt-BR'),                                   icon: Target,     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/15' },
              ].map(({ label, value, icon: Icon, color, bg, border }) => (
                <div key={label} className={`rounded-2xl bg-[#111] border ${border} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
                    <div className={`p-1.5 rounded-lg ${bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts aguardando aprovação */}
        {pendingTotal > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#EACE00] animate-pulse" />
                <h2 className="text-sm font-bold text-white">
                  {pendingTotal === 1 ? '1 post aguarda' : `${pendingTotal} posts aguardam`} sua aprovação
                </h2>
              </div>
              {plan !== 'basico' && (
                <Link
                  href="/client/calendar"
                  className="text-xs text-[#EACE00]/70 hover:text-[#EACE00] flex items-center gap-1 transition-colors"
                >
                  Ver calendário <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/client/posts/${post.id}`}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#EACE00]/25 bg-[#EACE00]/5 hover:bg-[#EACE00]/10 hover:border-[#EACE00]/50 transition-all group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{post.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {PLATFORM_LABEL[post.platform] ?? post.platform}
                      {post.scheduled_at && (
                        ` · ${format(parseISO(post.scheduled_at), "d 'de' MMM", { locale: ptBR })}`
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-[#EACE00]" />
                    <ArrowRight className="h-3 w-3 text-[#EACE00] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>

            {pendingTotal > 3 && (
              <p className="text-xs text-white/30">
                +{pendingTotal - 3} mais aguardando aprovação
              </p>
            )}
          </div>
        )}

        {/* Último insight (Premium) */}
        {latestInsight && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#EACE00]" />
              <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Último Insight</h2>
            </div>
            <Link
              href="/client/insights"
              className="block p-5 rounded-2xl bg-[#111] border border-[#222] hover:border-[#EACE00]/40 hover:shadow-[0_0_20px_rgba(234,206,0,0.05)] transition-all group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#EACE00] transition-colors">
                    {latestInsight.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-[#EACE00] group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <p className="text-sm text-white/40 line-clamp-3 leading-relaxed">
                  {latestInsight.content}
                </p>
                {latestInsight.published_at && (
                  <p className="text-xs text-white/20">
                    {format(parseISO(latestInsight.published_at), "d 'de' MMMM yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Estado vazio */}
        {!kpis && pendingTotal === 0 && !latestInsight && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center">
              <TrendingUp className="h-7 w-7 text-[#EACE00]/50" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">Aguardando dados</p>
              <p className="text-white/30 text-sm max-w-xs">
                Seus dados aparecerão aqui assim que a equipe registrar atividades.
              </p>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
