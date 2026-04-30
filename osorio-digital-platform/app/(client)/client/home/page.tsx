import Link from 'next/link'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, Clock, TrendingUp, DollarSign, Target, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ClientPlan } from '@/lib/client-plan'

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook',
  linkedin: 'LinkedIn', tiktok: 'TikTok', twitter: 'Twitter',
}

const PLAN_LABEL: Record<string, { label: string; classes: string }> = {
  basico:  { label: 'Básico',  classes: 'bg-white/10 text-white/60' },
  pro:     { label: 'Pro',     classes: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  premium: { label: 'Premium', classes: 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/30' },
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

  // KPIs do mês — via relatórios de tráfego
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('client_id', clientId)

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

  // Posts pendentes de aprovação
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

  // Último insight publicado (só para Premium)
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

  const planCfg = PLAN_LABEL[plan] ?? PLAN_LABEL.basico
  const showUpgrade = searchParams.upgrade === '1'

  return (
    <AppLayout pageTitle="Meu Painel">
      <div className="space-y-8">

        {/* Banner de upgrade bloqueado */}
        {showUpgrade && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Esta funcionalidade não está disponível no seu plano atual.{' '}
              <span className="font-medium">Entre em contato com a equipe para fazer upgrade.</span>
            </span>
          </div>
        )}

        {/* Boas-vindas */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">
              Olá{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
            </h1>
            {clientName && (
              <p className="text-muted-foreground text-sm">
                Aqui está o resumo de <span className="text-foreground font-medium">{clientName}</span> em {currentMonthLabel}.
              </p>
            )}
          </div>
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium shrink-0', planCfg.classes)}>
            Plano {planCfg.label}
          </span>
        </div>

        {/* KPIs do mês */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Investimento',
                value: `R$ ${kpis.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: DollarSign,
                color: 'text-brand-yellow',
                bg:    'bg-brand-yellow/10',
              },
              {
                label: 'Receita',
                value: `R$ ${kpis.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                icon: TrendingUp,
                color: 'text-green-400',
                bg:    'bg-green-500/10',
              },
              {
                label: 'ROAS',
                value: `${kpis.roas.toFixed(2)}x`,
                icon: Target,
                color: 'text-blue-400',
                bg:    'bg-blue-500/10',
              },
              {
                label: 'Conversões',
                value: kpis.conversions.toLocaleString('pt-BR'),
                icon: Target,
                color: 'text-purple-400',
                bg:    'bg-purple-500/10',
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="bg-card border-border">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg shrink-0', bg)}>
                    <Icon className={cn('h-4 w-4', color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold text-foreground mt-0.5 leading-none">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Posts aguardando aprovação */}
        {pendingTotal > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
                <h2 className="text-sm font-semibold text-foreground">
                  {pendingTotal === 1 ? '1 post aguarda' : `${pendingTotal} posts aguardam`} sua aprovação
                </h2>
              </div>
              {plan !== 'basico' && (
                <Link
                  href="/client/calendar"
                  className="text-xs text-brand-yellow hover:underline flex items-center gap-1"
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
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-brand-yellow/30 bg-brand-yellow/5 hover:bg-brand-yellow/10 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {PLATFORM_LABEL[post.platform] ?? post.platform}
                      {post.scheduled_at && (
                        ` · ${format(parseISO(post.scheduled_at), "d 'de' MMM", { locale: ptBR })}`
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-brand-yellow" />
                    <ArrowRight className="h-3 w-3 text-brand-yellow group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>

            {pendingTotal > 3 && (
              <p className="text-xs text-muted-foreground">
                +{pendingTotal - 3} mais aguardando aprovação
              </p>
            )}
          </div>
        )}

        {/* Último insight (Premium) */}
        {latestInsight && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Último Insight</h2>
            <Link
              href="/client/insights"
              className="block p-5 rounded-xl bg-card border border-border hover:border-brand-yellow/40 transition-colors group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-brand-yellow transition-colors">
                    {latestInsight.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-yellow group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {latestInsight.content}
                </p>
                {latestInsight.published_at && (
                  <p className="text-xs text-muted-foreground/60">
                    {format(parseISO(latestInsight.published_at), "d 'de' MMMM yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Estado vazio sem dados */}
        {!kpis && pendingTotal === 0 && !latestInsight && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <TrendingUp className="h-10 w-10 text-white/20" />
            <p className="text-muted-foreground text-sm">
              Seus dados aparecerão aqui assim que a equipe registrar atividades.
            </p>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
