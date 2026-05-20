'use server'

import { Suspense } from 'react'
import Link from 'next/link'
import { format, subDays, parseISO, eachDayOfInterval, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Users, Trophy, MousePointerClick, Layers,
  PlusCircle, BarChart2, AlertTriangle, CheckCircle2,
  XCircle, Zap, Upload, ArrowLeft, AtSign,
} from 'lucide-react'
import { AppLayout }         from '@/components/layout/app-layout'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TrafficFilters }    from '../traffic-filters'
import { TrafficHeroCard }   from '../traffic-hero-card'
import { TrafficCharts }     from '../traffic-charts'
import { formatCurrency }    from '@/lib/utils'
import type { DailyPoint, CampaignRow } from '../traffic-charts'
import {
  computeStatsFromDaily,
  computeReachAndRevenue,
  buildResultSummaryFromDaily,
  buildCampaignRows,
  buildDailyData,
  mergeProfileVisitsIntoResults,
  type TrafficReportWithCampaign,
  type DailyRowWithResultType,
} from '@/lib/traffic-builders'
import { resolveResultCategory } from '@/lib/meta-result-types'
import { redirect } from 'next/navigation'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

type StatsDerived = {
  spend:       number
  impressions: number
  clicks:      number
  conversions: number
  reach:       number
  revenue:     number
  ctr:         number
  cpc:         number
  cpa:         number
  roas:        number
}

function buildAlerts(stats: StatsDerived, results: ReturnType<typeof buildResultSummaryFromDaily>) {
  const alerts: { level: 'critico' | 'atencao' | 'ok'; msg: string }[] = []
  const cpm       = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 0
  const hasVendas = results.some((r) => resolveResultCategory(r.result_type) === 'venda')
  if (hasVendas) {
    if (stats.roas < 1 && stats.spend > 0)
      alerts.push({ level: 'critico', msg: `ROAS abaixo de 1x — você está gastando mais do que retornando.` })
    else if (stats.roas < 2 && stats.spend > 0)
      alerts.push({ level: 'atencao', msg: `ROAS de ${stats.roas.toFixed(2)}x — ainda abaixo do ideal (≥ 2x).` })
    else if (stats.spend > 0)
      alerts.push({ level: 'ok', msg: `ROAS saudável: ${stats.roas.toFixed(2)}x no período.` })
  }
  if (!hasVendas && stats.cpa > 0) {
    if (stats.cpa > 100)
      alerts.push({ level: 'critico', msg: `Custo por resultado alto: ${formatCurrency(stats.cpa)} — revise segmentação ou criativos.` })
    else if (stats.cpa > 50)
      alerts.push({ level: 'atencao', msg: `Custo por resultado: ${formatCurrency(stats.cpa)} — considere otimizar a campanha.` })
    else
      alerts.push({ level: 'ok', msg: `Custo por resultado saudável: ${formatCurrency(stats.cpa)} no período.` })
  }
  if (stats.ctr < 1 && stats.impressions > 0)
    alerts.push({ level: 'critico', msg: `CTR crítico: ${stats.ctr.toFixed(2)}%. Criativos precisam de revisão urgente.` })
  else if (stats.ctr < 2 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CTR de ${stats.ctr.toFixed(2)}% — considere testar novos criativos.` })
  if (!hasVendas && cpm > 50 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CPM de ${formatCurrency(cpm)} por mil impressões — o público pode estar muito restrito.` })
  if (stats.cpc > 15 && stats.clicks > 0)
    alerts.push({ level: 'atencao', msg: `CPC médio alto: ${formatCurrency(stats.cpc)} por clique.` })
  return alerts
}

function buildInsights(dailyData: DailyPoint[], campaignRows: CampaignRow[], stats: StatsDerived, results: ReturnType<typeof buildResultSummaryFromDaily>) {
  const insights: string[] = []
  const hasVendas = results.some((r) => resolveResultCategory(r.result_type) === 'venda')
  if (campaignRows.length > 0) {
    const best = campaignRows[0]
    insights.push(`Melhor campanha: "${best.name}" com ${formatCurrency(best.spend)} investidos e ${best.conversions} resultado(s).`)
  }
  if (dailyData.length >= 2) {
    const peak = dailyData.reduce((prev, curr) => curr.investimento > prev.investimento ? curr : prev)
    if (peak.investimento > 0)
      insights.push(`Pico de investimento em ${peak.date}: ${formatCurrency(peak.investimento)}.`)
  }
  if (stats.ctr >= 3)
    insights.push(`CTR acima da média do mercado (${stats.ctr.toFixed(2)}%) — criativos performando bem.`)
  if (hasVendas && stats.roas >= 2)
    insights.push(`ROAS de ${stats.roas.toFixed(2)}x — cada real investido retornou ${stats.roas.toFixed(2)} em receita.`)
  if (stats.conversions > 0 && stats.cpa > 0)
    insights.push(`Custo médio por resultado: ${formatCurrency(stats.cpa)}.`)
  return insights
}

// ── fetch ────────────────────────────────────────────────────────────────────
async function fetchData(clientId: string, from: string, to: string, isMax: boolean) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!ALLOWED.includes(profile?.role ?? '')) return null

  // Social media: verify assignment to this client
  if (profile?.role === 'social_media') {
    const { data: assignment } = await supabase
      .from('client_assignments')
      .select('client_id')
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .single()
    if (!assignment) return null
  }

  const { data: clientData } = await admin
    .from('clients')
    .select('id, name, meta_last_period_reach, meta_last_period_frequency, meta_last_period_since, meta_last_period_until')
    .eq('id', clientId)
    .single()
  if (!clientData) return null

  // IG account (snapshot agregado v25) — usado pra merge de PROFILE_VISITS.
  // Pós-v25, profile_views não vem mais dia-a-dia: vem agregado do último sync.
  const { data: igAccount } = await admin
    .from('instagram_accounts')
    .select('last_period_profile_views')
    .eq('client_id', clientId)
    .eq('is_primary', true)
    .maybeSingle()

  // Reports query — skip date filter when max
  let reportsQuery = supabase
    .from('traffic_reports')
    .select('id, campaign_id, client_id, period_start, period_end, spend, revenue, impressions, clicks, conversions, reach, result_type, campaigns(name, platform, objective, optimization_goal)')
    .eq('client_id', clientId)
    .order('period_start', { ascending: true })

  if (!isMax) {
    reportsQuery = reportsQuery.lte('period_start', to).gte('period_end', from)
  }

  const { data: reports } = await reportsQuery

  // Daily query — skip date filter when max
  let dailyQuery = admin
    .from('traffic_daily')
    .select('date, campaign_id, result_type, spend, impressions, clicks, conversions')
    .eq('client_id', clientId)
    .order('date', { ascending: true })

  if (!isMax) {
    dailyQuery = dailyQuery.gte('date', from).lte('date', to)
  }

  const { data: dailyRecords, error: dailyErr } = await dailyQuery
  if (dailyErr) console.error('[clientId dashboard] traffic_daily error:', dailyErr.message)

  // Compute actual date range (used for "Máximo" label display and chart)
  const records = dailyRecords ?? []
  const actualFrom = records.length > 0
    ? records.reduce((min, r) => r.date < min ? r.date : min, records[0].date).slice(0, 10)
    : from
  const actualTo = records.length > 0
    ? records.reduce((max, r) => r.date > max ? r.date : max, records[0].date).slice(0, 10)
    : to

  // Previous period CPM (only when not max)
  let prevCpm = 0
  if (!isMax) {
    const periodDays  = differenceInDays(parseISO(to), parseISO(from)) + 1
    const prevEndDate   = format(subDays(parseISO(from), 1), 'yyyy-MM-dd')
    const prevStartDate = format(subDays(parseISO(from), periodDays), 'yyyy-MM-dd')
    const { data: prevDaily } = await admin
      .from('traffic_daily')
      .select('spend, impressions')
      .eq('client_id', clientId)
      .gte('date', prevStartDate)
      .lte('date', prevEndDate)
    const prevSpend       = (prevDaily ?? []).reduce((s, r: { spend: number }) => s + r.spend, 0)
    const prevImpressions = (prevDaily ?? []).reduce((s, r: { impressions: number }) => s + r.impressions, 0)
    prevCpm = prevImpressions > 0 ? (prevSpend / prevImpressions) * 1000 : 0
  }

  return {
    client:       clientData,
    profile,
    reports:      (reports ?? []) as unknown as TrafficReportWithCampaign[],
    dailyRecords: records as DailyRowWithResultType[],
    igAccount:    igAccount ?? null,
    actualFrom,
    actualTo,
    prevCpm,
  }
}

// ── render helpers ────────────────────────────────────────────────────────────
const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', other: 'Outro',
}

function AlertIcon({ level }: { level: 'critico' | 'atencao' | 'ok' }) {
  if (level === 'critico') return <XCircle       className="h-4 w-4 text-red-400 shrink-0"    />
  if (level === 'atencao') return <AlertTriangle  className="h-4 w-4 text-yellow-400 shrink-0" />
  return                          <CheckCircle2   className="h-4 w-4 text-green-400 shrink-0"  />
}

function alertBg(level: 'critico' | 'atencao' | 'ok') {
  if (level === 'critico') return 'bg-red-500/8 border-red-500/20'
  if (level === 'atencao') return 'bg-yellow-500/8 border-yellow-500/20'
  return 'bg-green-500/8 border-green-500/20'
}

function DiagBadge({ label, value, status }: { label: string; value: string; status: 'critico' | 'atencao' | 'ok' }) {
  const colors = {
    critico: 'bg-red-500/10 border-red-500/25 text-red-400',
    atencao: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
    ok:      'bg-green-500/10 border-green-500/25 text-green-400',
  }
  const labels = { critico: 'Crítico', atencao: 'Atenção', ok: 'Tudo certo' }
  return (
    <div className="rounded-xl bg-[#111] border border-white/5 p-4 flex flex-col gap-2">
      <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-xl font-bold text-white">{value}</span>
      <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full border ${colors[status]}`}>
        {labels[status]}
      </span>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────
interface PageProps {
  params:       { clientId: string }
  searchParams: { from?: string; to?: string; max?: string }
}

export default async function ClientTrafficDashboardPage({ params, searchParams }: PageProps) {
  const { clientId } = params
  const isMax = searchParams.max === '1'
  const from  = searchParams.from ?? format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const to    = searchParams.to   ?? format(new Date(), 'yyyy-MM-dd')

  const data = await fetchData(clientId, from, to, isMax)
  if (!data) { redirect('/traffic/dashboard') }

  const { client, profile, reports, dailyRecords, igAccount, actualFrom, actualTo, prevCpm = 0 } = data
  const canEdit  = profile?.role === 'admin' || profile?.role === 'traffic_manager'

  // Stats híbrido: granularidade dia-a-dia (respeita filtro exato) +
  // reach único do último sync (Etapa 13 fix — chamada API extra sem
  // time_increment guardada em clients.meta_last_period_reach).
  const dailyStats         = computeStatsFromDaily(dailyRecords)
  const { revenue }        = computeReachAndRevenue(reports)
  const reach              = client.meta_last_period_reach ?? 0
  const ctr  = dailyStats.impressions > 0 ? (dailyStats.clicks / dailyStats.impressions) * 100 : 0
  const cpc  = dailyStats.clicks > 0 ? dailyStats.spend / dailyStats.clicks : 0
  const cpa  = dailyStats.conversions > 0 ? dailyStats.spend / dailyStats.conversions : 0
  const roas = dailyStats.spend > 0 ? revenue / dailyStats.spend : 0
  const stats: StatsDerived = { ...dailyStats, reach, revenue, ctr, cpc, cpa, roas }

  // Etapa 13 — substitui profile_visits_pending (campanhas PROFILE_VISITS) pelo
  // profile_views agregado do IG. Pós-v25 lê de instagram_accounts (snapshot).
  // Sem IG conectado, remove pending.
  const rawResults = buildResultSummaryFromDaily(dailyRecords)
  const results    = mergeProfileVisitsIntoResults(rawResults, igAccount)
  const hasVendas  = results.some((r) => resolveResultCategory(r.result_type) === 'venda')

  // Mapeia DailyRow → DailyPoint (chart shape: PT keys + data formatada + zero-fill)
  const libDaily = buildDailyData(dailyRecords)
  const dailyMap = new Map(libDaily.map((r) => [r.date, r]))
  const dailyData: DailyPoint[] = isMax
    ? libDaily.map((r) => ({
        date:         format(parseISO(r.date), 'dd/MM', { locale: ptBR }),
        investimento: r.spend,
        conversoes:   r.conversions,
        cliques:      r.clicks,
        impressoes:   r.impressions,
      }))
    : eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((day) => {
        const key = format(day, 'yyyy-MM-dd')
        const lib = dailyMap.get(key)
        return {
          date:         format(day, 'dd/MM', { locale: ptBR }),
          investimento: lib?.spend ?? 0,
          conversoes:   lib?.conversions ?? 0,
          cliques:      lib?.clicks ?? 0,
          impressoes:   lib?.impressions ?? 0,
        }
      })

  // Mapeia CampaignStatsRow → CampaignRow (chart shape: derived metrics + id + campaignType)
  const libCampaigns = buildCampaignRows(reports)
  const campaignRows: CampaignRow[] = libCampaigns.map((c) => ({
    id:           c.campaignId,
    name:         c.name,
    platform:     c.platform,
    spend:        c.spend,
    revenue:      c.revenue,
    clicks:       c.clicks,
    impressions:  c.impressions,
    conversions:  c.conversions,
    ctr:          c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cpc:          c.clicks > 0 ? c.spend / c.clicks : 0,
    cpa:          c.conversions > 0 ? c.spend / c.conversions : 0,
    roas:         c.spend > 0 ? c.revenue / c.spend : 0,
    result_type:  c.result_type ?? '',
    campaignType: resolveResultCategory(c.result_type),
  }))

  const alerts   = buildAlerts(stats, results)
  const insights = buildInsights(dailyData, campaignRows, stats, results)
  const cpm      = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 0

  const ctrStatus:  'critico' | 'atencao' | 'ok' = stats.ctr < 1 ? 'critico' : stats.ctr < 2 ? 'atencao' : 'ok'
  const roasStatus: 'critico' | 'atencao' | 'ok' = stats.roas < 1 ? 'critico' : stats.roas < 2 ? 'atencao' : 'ok'
  const cpaStatus:  'critico' | 'atencao' | 'ok' = hasVendas
    ? (stats.cpa > 80  ? 'critico' : stats.cpa > 40 ? 'atencao' : 'ok')
    : (stats.cpa > 100 ? 'critico' : stats.cpa > 50 ? 'atencao' : 'ok')
  const cpmStatus:  'critico' | 'atencao' | 'ok' = cpm > 100 ? 'critico' : cpm > 50 ? 'atencao' : 'ok'

  const basePath = `/traffic/dashboard/${clientId}`

  return (
    <AppLayout pageTitle={client.name}>
      <div className="space-y-5">

        {/* Cabeçalho */}
        <div className="space-y-3">
          <Link
            href="/traffic/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para clientes
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Suspense fallback={null}>
              <TrafficFilters
                clients={[]}
                currentFrom={from}
                currentTo={to}
                currentClientId={null}
                isMax={isMax}
                actualFrom={actualFrom}
                actualTo={actualTo}
                basePath={basePath}
              />
            </Suspense>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Link
                href={`/traffic/dashboard/${clientId}/instagram`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 text-white/60 font-medium rounded-lg hover:text-white hover:border-[#EACE00]/40 transition-colors text-sm"
              >
                <AtSign className="h-4 w-4" />
                Ver Instagram
              </Link>
              {canEdit && (
                <>
                  <Link
                    href="/traffic/reports/import"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 text-white/60 font-medium rounded-lg hover:text-white hover:border-white/30 transition-colors text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Importar CSV
                  </Link>
                  <Link
                    href="/traffic/reports/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#f5d800] transition-colors text-sm"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Novo Relatório
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Estado vazio */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Nenhum dado no período</h3>
            <p className="text-white/40 text-sm mb-6 max-w-sm">
              Não há relatórios para {client.name} no período selecionado.
            </p>
            {canEdit && (
              <Link
                href="/traffic/reports/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#EACE00] text-black font-bold rounded-lg hover:bg-[#f5d800] transition-colors text-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Primeiro Relatório
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Hero Card */}
            <TrafficHeroCard
              from={isMax ? actualFrom : from}
              to={isMax ? actualTo : to}
              stats={stats}
              campaignCount={campaignRows.length}
              results={results}
              reachPeriodSince={client.meta_last_period_since}
              reachPeriodUntil={client.meta_last_period_until}
            />

            {/* KPI Cards */}
            {(() => {
              const freq         = stats.reach > 0 ? stats.impressions / stats.reach : 0
              const convRate     = stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0
              const bestCampaign = campaignRows.filter(c => c.cpa > 0).sort((a, b) => a.cpa - b.cpa)[0] ?? null
              const cpmDiff      = !isMax && cpm > 0 && prevCpm > 0 ? ((cpm - prevCpm) / prevCpm) * 100 : null

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-[#111] border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Alcance Total</span>
                      <div className="p-1.5 rounded-lg bg-green-400/10">
                        <Users className="h-3.5 w-3.5 text-green-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.reach > 0
                        ? stats.reach >= 1_000_000
                          ? `${(stats.reach / 1_000_000).toFixed(1).replace('.', ',')}M`
                          : stats.reach >= 1_000
                            ? `${(stats.reach / 1_000).toFixed(1).replace('.', ',')}k`
                            : stats.reach.toLocaleString('pt-BR')
                        : '—'}
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">
                      {freq > 0 ? `Frequência média: ${freq.toFixed(1).replace('.', ',')}x` : 'Frequência: —'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#111] border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Melhor Campanha</span>
                      <div className="p-1.5 rounded-lg bg-[#EACE00]/10">
                        <Trophy className="h-3.5 w-3.5 text-[#EACE00]" />
                      </div>
                    </div>
                    <div className="text-base font-bold text-white leading-tight truncate">
                      {bestCampaign ? bestCampaign.name : '—'}
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">
                      {bestCampaign ? `${formatCurrency(bestCampaign.cpa)} por resultado` : 'Sem dados de CPA'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#111] border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Total de Cliques</span>
                      <div className="p-1.5 rounded-lg bg-blue-400/10">
                        <MousePointerClick className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {stats.clicks.toLocaleString('pt-BR')}
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">
                      {convRate > 0
                        ? `Taxa de conversão: ${convRate.toFixed(1).replace('.', ',')}%`
                        : 'Taxa de conversão: —'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#111] border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Custo por Mil (CPM)</span>
                      <div className="p-1.5 rounded-lg bg-purple-400/10">
                        <Layers className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {cpm > 0 ? formatCurrency(cpm) : '—'}
                    </div>
                    <p className={`text-xs mt-0.5 ${cpmDiff === null ? 'text-white/30' : cpmDiff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {cpmDiff === null
                        ? isMax ? 'Período completo' : 'Sem período anterior'
                        : `${cpmDiff > 0 ? '↑' : '↓'} ${Math.abs(cpmDiff).toFixed(1).replace('.', ',')}% vs período anterior`}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Alertas */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-white/80 ${alertBg(a.level)}`}>
                    <AlertIcon level={a.level} />
                    {a.msg}
                  </div>
                ))}
              </div>
            )}

            {/* Gráficos */}
            <TrafficCharts dailyData={dailyData} campaignRows={campaignRows} />

            {/* Destaques */}
            {insights.length > 0 && (
              <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-[#EACE00]" />
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Destaques do período</h3>
                </div>
                <ul className="space-y-2">
                  {insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="text-[#EACE00] mt-0.5">•</span>
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Diagnóstico automático */}
            {stats.spend > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Diagnóstico automático</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DiagBadge label="CTR"  value={stats.ctr > 0 ? `${stats.ctr.toFixed(2).replace('.', ',')}%` : '—'} status={ctrStatus} />
                  {hasVendas ? (
                    <DiagBadge label="ROAS" value={stats.roas > 0 ? `${stats.roas.toFixed(2).replace('.', ',')}x` : '—'} status={roasStatus} />
                  ) : (
                    <DiagBadge label="Custo/Resultado" value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'} status={cpaStatus} />
                  )}
                  {hasVendas ? (
                    <DiagBadge label="CPA"  value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'} status={cpaStatus} />
                  ) : (
                    <DiagBadge label="CPM"  value={cpm > 0 ? formatCurrency(cpm) : '—'} status={cpmStatus} />
                  )}
                </div>
              </div>
            )}

            {/* Tabela de campanhas */}
            <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Campanhas detalhadas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Campanha', 'Plataforma', 'Status', 'Investido', 'CTR', 'CPC', 'Resultados', 'CPA', 'ROAS'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaignRows.map((c) => {
                      const status = hasVendas
                        ? (c.roas >= 2 ? 'ok' : c.roas >= 1 ? 'atencao' : 'critico')
                        : (c.conversions > 0 ? 'ok' : c.spend > 0 ? 'atencao' : 'critico')
                      const statusLabel = { ok: 'Ativo', atencao: 'Atenção', critico: 'Sem resultado' }
                      const statusColor = { ok: 'text-green-400 bg-green-400/10', atencao: 'text-yellow-400 bg-yellow-400/10', critico: 'text-red-400 bg-red-400/10' }
                      return (
                        <tr key={c.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 text-white font-medium max-w-[160px] truncate">{c.name}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50">
                              {PLATFORM_LABEL[c.platform] ?? c.platform}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status]}`}>
                              {statusLabel[status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white whitespace-nowrap">{formatCurrency(c.spend)}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">{c.ctr > 0 ? `${c.ctr.toFixed(2).replace('.', ',')}%` : '—'}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">{c.cpc > 0 ? formatCurrency(c.cpc) : '—'}</td>
                          <td className="px-4 py-3 text-white text-center">{c.conversions}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">{c.cpa > 0 ? formatCurrency(c.cpa) : '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {hasVendas && c.roas > 0 ? (
                              <span className={c.roas >= 2 ? 'text-green-400' : c.roas >= 1 ? 'text-[#EACE00]' : 'text-red-400'}>
                                {c.roas.toFixed(2).replace('.', ',')}x
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
