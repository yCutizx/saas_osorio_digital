'use server'

import { Suspense } from 'react'
import Link from 'next/link'
import { subDays, format, parseISO, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DollarSign, TrendingUp, MousePointerClick,
  PlusCircle, BarChart2, AlertTriangle, CheckCircle2,
  XCircle, Zap, Eye, Upload,
} from 'lucide-react'
import { AppLayout }        from '@/components/layout/app-layout'
import { createClient }     from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TrafficFilters }   from './traffic-filters'
import { TrafficHeroCard }  from './traffic-hero-card'
import type { BusinessMode } from './traffic-hero-card'
import { TrafficCharts }  from './traffic-charts'
import { formatCurrency } from '@/lib/utils'
import type { DailyPoint, CampaignRow } from './traffic-charts'

// ── tipos ───────────────────────────────────────────────────────────────────
type Report = {
  id:           string
  campaign_id:  string
  client_id:    string
  period_start: string
  spend:        number
  revenue:      number | null
  impressions:  number
  clicks:       number
  conversions:  number
  reach:        number
  result_type:  string
  campaigns:    { name: string; platform: string } | null
}

type DailyRecord = {
  date:        string
  spend:       number
  impressions: number
  clicks:      number
  conversions: number
  client_id:   string
  campaign_id: string
}

// ── builders ────────────────────────────────────────────────────────────────
// KPIs time-sensitive (spend/clicks/impressions/conversions) come from traffic_daily
// which has exact per-day rows — correctly responds to date filtering.
// Revenue and reach are metadata from traffic_reports (no per-day equivalent).
function computeStats(dailyRecords: DailyRecord[], reports: Report[]) {
  const spend       = dailyRecords.reduce((s, r) => s + r.spend, 0)
  const clicks      = dailyRecords.reduce((s, r) => s + r.clicks, 0)
  const impressions = dailyRecords.reduce((s, r) => s + r.impressions, 0)
  const conversions = dailyRecords.reduce((s, r) => s + r.conversions, 0)
  const revenue     = reports.reduce((s, r) => s + (r.revenue ?? 0), 0)
  const reach       = reports.reduce((s, r) => s + (r.reach ?? 0), 0)
  const roas = spend > 0 ? revenue / spend : 0
  const ctr  = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc  = clicks > 0 ? spend / clicks : 0
  const cpa  = conversions > 0 ? spend / conversions : 0
  return { spend, revenue, conversions, clicks, impressions, reach, roas, ctr, cpc, cpa }
}

function detectMode(reports: Report[]): BusinessMode {
  if (reports.some(r => (r.revenue ?? 0) > 0)) return 'ecommerce'
  const ecomWords = ['compra', 'purchase', 'venda', 'sale', 'produto', 'checkout']
  if (reports.some(r => ecomWords.some(w => (r.result_type ?? '').toLowerCase().includes(w)))) return 'ecommerce'
  return 'local'
}

function getResultType(reports: Report[]): string {
  const counts = new Map<string, number>()
  for (const r of reports) {
    if (r.result_type) counts.set(r.result_type, (counts.get(r.result_type) ?? 0) + 1)
  }
  let best = '', bestCount = 0
  counts.forEach((c, k) => { if (c > bestCount) { best = k; bestCount = c } })
  return best
}

function buildDailyData(dailyRecords: DailyRecord[], from: string, to: string): DailyPoint[] {
  const map = new Map<string, DailyPoint>()
  for (const r of dailyRecords) {
    const key      = r.date.slice(0, 10)
    const existing = map.get(key) ?? {
      date:         format(parseISO(key), 'dd/MM', { locale: ptBR }),
      investimento: 0, conversoes: 0, cliques: 0, impressoes: 0,
    }
    existing.investimento += r.spend
    existing.conversoes   += r.conversions
    existing.cliques      += r.clicks
    existing.impressoes   += r.impressions
    map.set(key, existing)
  }
  // Preenche todos os dias do intervalo com zero onde não há dados
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) }).map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    return map.get(key) ?? {
      date: format(day, 'dd/MM', { locale: ptBR }),
      investimento: 0, conversoes: 0, cliques: 0, impressoes: 0,
    }
  })
}

function buildCampaignRows(dailyRecords: DailyRecord[], reports: Report[]): CampaignRow[] {
  // Campaign metadata lookup (name, platform, revenue) from traffic_reports
  const meta = new Map<string, { name: string; platform: string; revenue: number }>()
  for (const r of reports) {
    const existing = meta.get(r.campaign_id)
    if (!existing) {
      meta.set(r.campaign_id, {
        name:     r.campaigns?.name     ?? 'Sem campanha',
        platform: r.campaigns?.platform ?? 'other',
        revenue:  r.revenue ?? 0,
      })
    } else {
      existing.revenue += r.revenue ?? 0
    }
  }

  // Aggregate time-filtered metrics from traffic_daily
  const agg = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number }>()
  for (const r of dailyRecords) {
    const existing = agg.get(r.campaign_id) ?? { spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    existing.spend       += r.spend
    existing.clicks      += r.clicks
    existing.impressions += r.impressions
    existing.conversions += r.conversions
    agg.set(r.campaign_id, existing)
  }

  return Array.from(agg.entries()).map(([id, c]) => {
    const m = meta.get(id) ?? { name: 'Sem campanha', platform: 'other', revenue: 0 }
    return {
      id,
      name:        m.name,
      platform:    m.platform,
      spend:       c.spend,
      revenue:     m.revenue,
      clicks:      c.clicks,
      impressions: c.impressions,
      conversions: c.conversions,
      ctr:  c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc:  c.clicks > 0 ? c.spend / c.clicks : 0,
      cpa:  c.conversions > 0 ? c.spend / c.conversions : 0,
      roas: c.spend > 0 ? m.revenue / c.spend : 0,
    }
  }).sort((a, b) => b.spend - a.spend)
}

function buildAlerts(stats: ReturnType<typeof computeStats>, mode: BusinessMode) {
  const alerts: { level: 'critico' | 'atencao' | 'ok'; msg: string }[] = []
  const cpm = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 0

  // Alertas de ROAS — apenas e-commerce
  if (mode === 'ecommerce') {
    if (stats.roas < 1 && stats.spend > 0)
      alerts.push({ level: 'critico', msg: `ROAS abaixo de 1x — você está gastando mais do que retornando.` })
    else if (stats.roas < 2 && stats.spend > 0)
      alerts.push({ level: 'atencao', msg: `ROAS de ${stats.roas.toFixed(2)}x — ainda abaixo do ideal (≥ 2x).` })
    else if (stats.spend > 0)
      alerts.push({ level: 'ok', msg: `ROAS saudável: ${stats.roas.toFixed(2)}x no período.` })
  }

  // Alertas de CPA — apenas negócio local (ROAS não se aplica)
  if (mode === 'local' && stats.cpa > 0) {
    if (stats.cpa > 100)
      alerts.push({ level: 'critico', msg: `Custo por resultado alto: ${formatCurrency(stats.cpa)} — revise segmentação ou criativos.` })
    else if (stats.cpa > 50)
      alerts.push({ level: 'atencao', msg: `Custo por resultado: ${formatCurrency(stats.cpa)} — considere otimizar a campanha.` })
    else
      alerts.push({ level: 'ok', msg: `Custo por resultado saudável: ${formatCurrency(stats.cpa)} no período.` })
  }

  // Alertas de CTR — ambos os modos
  if (stats.ctr < 1 && stats.impressions > 0)
    alerts.push({ level: 'critico', msg: `CTR crítico: ${stats.ctr.toFixed(2)}%. Criativos precisam de revisão urgente.` })
  else if (stats.ctr < 2 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CTR de ${stats.ctr.toFixed(2)}% — considere testar novos criativos.` })

  // CPM alto — apenas negócio local (público restrito é mais relevante para conversas/leads)
  if (mode === 'local' && cpm > 50 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CPM de ${formatCurrency(cpm)} por mil impressões — o público pode estar muito restrito.` })

  if (stats.cpc > 15 && stats.clicks > 0)
    alerts.push({ level: 'atencao', msg: `CPC médio alto: ${formatCurrency(stats.cpc)} por clique.` })

  return alerts
}

function buildInsights(dailyData: DailyPoint[], campaignRows: CampaignRow[], stats: ReturnType<typeof computeStats>, mode: BusinessMode) {
  const insights: string[] = []

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

  if (mode === 'ecommerce' && stats.roas >= 2)
    insights.push(`ROAS de ${stats.roas.toFixed(2)}x — cada real investido retornou ${stats.roas.toFixed(2)} em receita.`)

  if (stats.conversions > 0 && stats.cpa > 0)
    insights.push(`Custo médio por resultado: ${formatCurrency(stats.cpa)}.`)

  return insights
}

// ── fetch ────────────────────────────────────────────────────────────────────
async function fetchDashboardData(from: string, to: string, clientId?: string) {
  const supabase   = await createClient()
  const startDate  = from
  const endDate    = to

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  let clientsQuery = supabase.from('clients').select('id, name').eq('active', true).order('name')
  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length === 0) return { clients: [], reports: [], dailyRecords: [], profile }
    clientsQuery = clientsQuery.in('id', ids)
  }
  const { data: clients } = await clientsQuery

  let reportsQuery = supabase
    .from('traffic_reports')
    .select('id, campaign_id, client_id, period_start, spend, revenue, impressions, clicks, conversions, reach, result_type, campaigns(name, platform)')
    .lte('period_start', endDate)
    .gte('period_end', startDate)
    .order('period_start', { ascending: true })

  if (clientId) {
    reportsQuery = reportsQuery.eq('client_id', clientId)
  } else if (profile?.role !== 'admin' && clients?.length) {
    reportsQuery = reportsQuery.in('client_id', clients.map((c) => c.id))
  }

  const { data: reports } = await reportsQuery

  // Busca dados diários para o gráfico (traffic_daily).
  // Usa admin client para contornar RLS (tabela sem políticas de leitura).
  // client_id é sempre filtrado explicitamente para escopo correto.
  const admin = createAdminClient()
  let dailyQuery = admin
    .from('traffic_daily')
    .select('date, spend, impressions, clicks, conversions, client_id, campaign_id')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (clientId) {
    dailyQuery = dailyQuery.eq('client_id', clientId)
  } else if (clients?.length) {
    dailyQuery = dailyQuery.in('client_id', clients.map((c) => c.id))
  }

  const { data: dailyRecords, error: dailyErr } = await dailyQuery
  if (dailyErr) console.error('[dashboard] traffic_daily query error:', dailyErr.message)

  // Filtra o dropdown para mostrar apenas clientes com dados no período
  const clientIdsWithReports = new Set((reports ?? []).map((r) => r.client_id))
  const clientsWithReports = (clients ?? []).filter((c) => clientIdsWithReports.has(c.id))

  return {
    clients:      clientsWithReports,
    reports:      (reports ?? []) as unknown as Report[],
    dailyRecords: (dailyRecords ?? []) as DailyRecord[],
    profile,
  }
}

// ── helpers de render ────────────────────────────────────────────────────────
const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', other: 'Outro',
}

function AlertIcon({ level }: { level: 'critico' | 'atencao' | 'ok' }) {
  if (level === 'critico') return <XCircle    className="h-4 w-4 text-red-400 shrink-0"    />
  if (level === 'atencao') return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
  return                          <CheckCircle2  className="h-4 w-4 text-green-400 shrink-0"  />
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
  searchParams: { from?: string; to?: string; client?: string }
}

export default async function TrafficDashboardPage({ searchParams }: PageProps) {
  const from     = searchParams.from ?? format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const to       = searchParams.to   ?? format(new Date(), 'yyyy-MM-dd')
  const clientId = searchParams.client

  const data = await fetchDashboardData(from, to, clientId)
  if (!data) return null

  const { clients, reports, dailyRecords, profile } = data
  const isAdmin = profile?.role === 'admin'
  const canEdit = isAdmin || profile?.role === 'traffic_manager'
  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null

  const stats        = computeStats(dailyRecords, reports)
  const mode         = detectMode(reports)
  const dailyData    = buildDailyData(dailyRecords, from, to)
  const campaignRows = buildCampaignRows(dailyRecords, reports)
  const alerts       = buildAlerts(stats, mode)
  const insights     = buildInsights(dailyData, campaignRows, stats, mode)
  const resultType   = getResultType(reports)
  const cpm          = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 0

  const ctrStatus:  'critico' | 'atencao' | 'ok' = stats.ctr < 1 ? 'critico' : stats.ctr < 2 ? 'atencao' : 'ok'
  const roasStatus: 'critico' | 'atencao' | 'ok' = stats.roas < 1 ? 'critico' : stats.roas < 2 ? 'atencao' : 'ok'
  const cpaStatus:  'critico' | 'atencao' | 'ok' = mode === 'local'
    ? (stats.cpa > 100 ? 'critico' : stats.cpa > 50 ? 'atencao' : 'ok')
    : (stats.cpa > 80  ? 'critico' : stats.cpa > 40 ? 'atencao' : 'ok')
  const cpmStatus:  'critico' | 'atencao' | 'ok' = cpm > 100 ? 'critico' : cpm > 50 ? 'atencao' : 'ok'

  return (
    <AppLayout pageTitle="Gestão de Tráfego">
      <div className="space-y-5">

        {/* ── Cabeçalho / Filtros ─────────────────────────────────── */}
        <div className="space-y-3">
          {selectedClient && (
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">Cliente:</span>
              <span className="text-white font-semibold text-sm">{selectedClient.name}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Suspense fallback={null}>
            <TrafficFilters
              clients={clients}
              currentFrom={from}
              currentTo={to}
              currentClientId={clientId ?? null}
            />
          </Suspense>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <Link
                href="/traffic/reports/import"
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 text-white/60 font-medium rounded-lg hover:text-white hover:border-white/30 transition-colors text-sm"
              >
                <Upload className="h-4 w-4" />
                Importar CSV
              </Link>
              <Link
                href="/traffic/reports/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-black font-semibold rounded-lg hover:bg-brand-yellow/90 transition-colors text-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Novo Relatório
              </Link>
            </div>
          )}
          </div>
        </div>

        {/* ── Estado vazio ─────────────────────────────────────────── */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-brand-yellow/10 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="h-7 w-7 text-brand-yellow/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Nenhum dado no período</h3>
            <p className="text-white/40 text-sm mb-6 max-w-sm">
              {clients.length === 0
                ? 'Você ainda não tem clientes atribuídos.'
                : 'Não há relatórios no período selecionado.'}
            </p>
            {canEdit && clients.length > 0 && (
              <Link
                href="/traffic/reports/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-black font-semibold rounded-lg hover:bg-brand-yellow/90 transition-colors text-sm"
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar Primeiro Relatório
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* ── Hero Card ──────────────────────────────────────────── */}
            <TrafficHeroCard
              from={from}
              to={to}
              stats={stats}
              campaignCount={campaignRows.length}
              resultType={resultType}
              mode={mode}
            />

            {/* ── KPI Cards secundários ─────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Investimento',  value: formatCurrency(stats.spend),       icon: DollarSign,       color: 'text-brand-yellow', bg: 'bg-brand-yellow/10' },
                { label: 'Impressões',    value: stats.impressions >= 1000 ? `${(stats.impressions / 1000).toFixed(1)}k` : String(stats.impressions), icon: Eye, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                { label: 'CPC Médio',     value: stats.cpc > 0 ? formatCurrency(stats.cpc) : '—',           icon: MousePointerClick, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                { label: 'CTR Médio',     value: stats.ctr > 0 ? `${stats.ctr.toFixed(2).replace('.', ',')}%` : '—', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl bg-[#111] border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-white/40 uppercase tracking-wider">{card.label}</span>
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                      <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                  <p className="text-xs text-white/30 mt-0.5">no período</p>
                </div>
              ))}
            </div>

            {/* ── Alertas de performance ────────────────────────────── */}
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

            {/* ── Gráficos ─────────────────────────────────────────── */}
            <TrafficCharts dailyData={dailyData} campaignRows={campaignRows} />

            {/* ── Destaques do período ──────────────────────────────── */}
            {insights.length > 0 && (
              <div className="rounded-2xl bg-[#111] border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-brand-yellow" />
                  <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Destaques do período</h3>
                </div>
                <ul className="space-y-2">
                  {insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <span className="text-brand-yellow mt-0.5">•</span>
                      {ins}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Diagnóstico automático ────────────────────────────── */}
            {stats.spend > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Diagnóstico automático</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DiagBadge label="CTR"  value={stats.ctr > 0 ? `${stats.ctr.toFixed(2).replace('.', ',')}%` : '—'} status={ctrStatus} />
                  {mode === 'ecommerce' ? (
                    <DiagBadge label="ROAS" value={stats.roas > 0 ? `${stats.roas.toFixed(2).replace('.', ',')}x` : '—'} status={roasStatus} />
                  ) : (
                    <DiagBadge label="Custo/Resultado" value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'} status={cpaStatus} />
                  )}
                  {mode === 'ecommerce' ? (
                    <DiagBadge label="CPA"  value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'} status={cpaStatus} />
                  ) : (
                    <DiagBadge label="CPM"  value={cpm > 0 ? formatCurrency(cpm) : '—'} status={cpmStatus} />
                  )}
                </div>
              </div>
            )}

            {/* ── Tabela de campanhas ───────────────────────────────── */}
            <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Campanhas detalhadas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Campanha', 'Plataforma', 'Status', 'Investido', 'CTR', 'CPC', 'Resultados', 'CPA', 'ROAS'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaignRows.map((c) => {
                      const status = mode === 'ecommerce'
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
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                            {c.ctr > 0 ? `${c.ctr.toFixed(2).replace('.', ',')}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                            {c.cpc > 0 ? formatCurrency(c.cpc) : '—'}
                          </td>
                          <td className="px-4 py-3 text-white text-center">{c.conversions}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                            {c.cpa > 0 ? formatCurrency(c.cpa) : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {mode === 'ecommerce' && c.roas > 0 ? (
                              <span className={c.roas >= 2 ? 'text-green-400' : c.roas >= 1 ? 'text-brand-yellow' : 'text-red-400'}>
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
