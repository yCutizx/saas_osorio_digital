'use server'

import Link from 'next/link'
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, AtSign, AlertCircle } from 'lucide-react'
import { AppLayout }         from '@/components/layout/app-layout'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InstagramHeroCard, type IGHeroStats } from '@/components/instagram/instagram-hero-card'
import { InstagramCharts, type IGDailyPoint, type IGCTABreakdown } from '@/components/instagram/instagram-charts'
import { redirect } from 'next/navigation'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

interface PageProps {
  params:       { clientId: string }
  searchParams: { from?: string; to?: string }
}

export default async function ClientInstagramDashboardPage({ params, searchParams }: PageProps) {
  const { clientId } = params
  const supabase     = await createClient()
  const admin        = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/dashboard')

  if (profile?.role === 'social_media') {
    const { data: assignment } = await supabase
      .from('client_assignments')
      .select('client_id')
      .eq('user_id', user.id).eq('client_id', clientId).single()
    if (!assignment) redirect('/traffic/dashboard')
  }

  const { data: clientRow } = await admin
    .from('clients').select('id, name').eq('id', clientId).single()
  if (!clientRow) redirect('/traffic/dashboard')

  // Conta IG conectada (com snapshot agregado do último sync)
  const { data: igAccount } = await admin
    .from('instagram_accounts')
    .select('ig_user_id, ig_username, account_kind, followers_count_snapshot, last_period_reach_unique, last_period_views, last_period_profile_views, last_period_website_clicks, last_period_total_interactions, last_period_likes, last_period_comments, last_period_shares, last_period_saves, last_period_accounts_engaged')
    .eq('client_id', clientId)
    .eq('is_primary', true)
    .maybeSingle()

  // Filtro padrão: últimos 30 dias (limite API IG)
  const from = searchParams.from ?? format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const to   = searchParams.to   ?? format(new Date(), 'yyyy-MM-dd')

  const { data: daily } = await admin
    .from('instagram_daily')
    .select('date, reach, follower_count')
    .eq('client_id', clientId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  const rows = daily ?? []

  // Stats híbrido (v25):
  //   - followers do último ponto do daily (snapshot do último sync)
  //   - reach é ÚNICO do período (account.last_period_reach_unique) — NÃO somar
  //     daily, isso duplicaria pessoas que viram em dias diferentes
  //   - views/profile_views/CTAs/engajamento vêm agregados do account
  const stats: IGHeroStats = {
    followers:          igAccount?.followers_count_snapshot       ?? 0,
    reach:              igAccount?.last_period_reach_unique       ?? 0,
    views:              igAccount?.last_period_views              ?? 0,
    profile_views:      igAccount?.last_period_profile_views      ?? 0,
    website_clicks:     igAccount?.last_period_website_clicks     ?? 0,
    total_interactions: igAccount?.last_period_total_interactions ?? 0,
    likes:              igAccount?.last_period_likes              ?? 0,
    comments:           igAccount?.last_period_comments           ?? 0,
    shares:             igAccount?.last_period_shares             ?? 0,
    saves:              igAccount?.last_period_saves              ?? 0,
    accounts_engaged:   igAccount?.last_period_accounts_engaged   ?? 0,
  }

  // Daily com zero-fill — reach por dia + saldo histórico de seguidores.
  // Algoritmo do saldo: API retorna follower_count diário como DELTA. Partindo
  // do snapshot atual e voltando no tempo, subtrai os deltas pra reconstruir
  // o saldo de cada dia anterior.
  const byDate = new Map(rows.map((r) => [r.date.slice(0, 10), r]))
  const days   = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })

  // 1ª passada: cronológica direta com delta de cada dia
  const points = days.map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    const r   = byDate.get(key)
    return {
      date:             format(day, 'dd/MM', { locale: ptBR }),
      date_iso:         key,
      alcance:          r?.reach ?? 0,
      delta:            r?.follower_count ?? 0,
    }
  })

  // 2ª passada: do mais recente pro mais antigo, calcula saldo subtraindo delta
  const snapshot = igAccount?.followers_count_snapshot ?? 0
  const saldoMap: Record<string, number> = {}
  let runningTotal = snapshot
  for (let i = points.length - 1; i >= 0; i--) {
    saldoMap[points[i].date_iso] = runningTotal
    runningTotal -= points[i].delta
  }

  const dailyData: IGDailyPoint[] = points.map((p) => ({
    date:              p.date,
    date_iso:          p.date_iso,
    impressoes:        0,
    alcance:           p.alcance,
    visitas_perfil:    0,
    cliques_link:      0,
    seguidores:        saldoMap[p.date_iso] ?? 0,
    seguidores_delta:  p.delta,
  }))

  // CTAs não vêm mais na v25 sem upgrade pra business_discovery — placeholder zerado
  const ctaBreakdown: IGCTABreakdown = { email: 0, telefone: 0, whatsapp: 0, localizacao: 0 }

  return (
    <AppLayout pageTitle={`${clientRow.name} · Instagram`}>
      <div className="space-y-5">
        <Link
          href={`/traffic/dashboard/${clientId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o dashboard
        </Link>

        {!igAccount ? (
          <div className="rounded-2xl bg-[#111] border border-white/5 p-10 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <AtSign className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Instagram não conectado</h3>
            <p className="text-white/40 text-sm mb-4 max-w-md mx-auto">
              Conecte uma conta Business ou Creator em &quot;Editar Cliente&quot; pra ver as métricas do perfil.
            </p>
            <Link
              href={`/admin/clients/${clientId}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#f5d800] transition-colors text-sm"
            >
              Conectar Instagram
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-yellow-500/8 border border-yellow-500/20 p-5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold">Nenhum dado no período</p>
              <p className="text-white/50 text-sm mt-0.5">
                Rode &quot;Sincronizar 30 dias&quot; em /admin/clients/{clientId}/edit pra puxar histórico.
              </p>
            </div>
          </div>
        ) : (
          <>
            <InstagramHeroCard
              from={from}
              to={to}
              username={igAccount.ig_username}
              stats={stats}
            />
            <InstagramCharts
              dailyData={dailyData}
              ctaBreakdown={ctaBreakdown}
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}
