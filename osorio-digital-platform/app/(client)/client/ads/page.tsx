import { Suspense } from 'react'
import { format, subDays, parseISO, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  BarChart2, AlertTriangle, CheckCircle2, XCircle, Zap,
} from 'lucide-react'
import { AppLayout }        from '@/components/layout/app-layout'
import { createClient }     from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMinPlan }   from '@/lib/client-plan'
import { TrafficCharts }    from '@/app/(traffic)/traffic/dashboard/traffic-charts'
import { TrafficFilters }   from '@/app/(traffic)/traffic/dashboard/traffic-filters'
import { TrafficHeroCard }  from '@/app/(traffic)/traffic/dashboard/traffic-hero-card'
import { formatCurrency }   from '@/lib/utils'
import type { DailyPoint, CampaignRow } from '@/app/(traffic)/traffic/dashboard/traffic-charts'
import {
  computeStatsFromDaily,
  computeReachAndRevenue,
  buildResultSummaryFromDaily,
  buildCampaignRows,
  buildDailyData,
  type TrafficReportWithCampaign,
  type DailyRowWithResultType,
} from '@/lib/traffic-builders'
import { resolveResultCategory } from '@/lib/meta-result-types'

// ── helpers ───────────────────────────────────────────────────────────────────
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

// ── page ──────────────────────────────────────────────────────────────────────
interface PageProps {
  searchParams: { from?: string; to?: string }
}

export default async function ClientAdsPage({ searchParams }: PageProps) {
  await requireMinPlan('basico')

  const supabase  = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  const clientId = assignment?.client_id
  if (!clientId) {
    return (
      <AppLayout pageTitle="Meus Anúncios">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart2 className="h-10 w-10 text-white/20 mb-4" />
          <p className="text-white/40 text-sm">Nenhum dado disponível no momento.</p>
        </div>
      </AppLayout>
    )
  }

  const startDate = searchParams.from ?? format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const endDate   = searchParams.to   ?? format(new Date(), 'yyyy-MM-dd')

  const { data: rawReports } = await supabase
    .from('traffic_reports')
    .select('id, campaign_id, client_id, period_start, period_end, spend, revenue, impressions, clicks, conversions, reach, result_type, campaigns(name, platform, objective, optimization_goal)')
    .eq('client_id', clientId)
    .lte('period_start', endDate)
    .gte('period_end', startDate)
    .order('period_start', { ascending: true })

  const admin = createAdminClient()
  const { data: rawDaily } = await admin
    .from('traffic_daily')
    .select('date, campaign_id, result_type, spend, impressions, clicks, conversions')
    .eq('client_id', clientId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const reports      = (rawReports ?? []) as unknown as TrafficReportWithCampaign[]
  const dailyRecords = (rawDaily   ?? []) as DailyRowWithResultType[]

  // Stats híbrido: granularidade dia-a-dia (respeita filtro exato) + reach/revenue
  // de reports (que não vivem em traffic_daily).
  const dailyStats         = computeStatsFromDaily(dailyRecords)
  const { reach, revenue } = computeReachAndRevenue(reports)
  const ctr  = dailyStats.impressions > 0 ? (dailyStats.clicks / dailyStats.impressions) * 100 : 0
  const cpc  = dailyStats.clicks > 0 ? dailyStats.spend / dailyStats.clicks : 0
  const cpa  = dailyStats.conversions > 0 ? dailyStats.spend / dailyStats.conversions : 0
  const roas = dailyStats.spend > 0 ? revenue / dailyStats.spend : 0
  const stats = { ...dailyStats, reach, revenue, ctr, cpc, cpa, roas }

  const results   = buildResultSummaryFromDaily(dailyRecords)
  const hasVendas = results.some((r) => resolveResultCategory(r.result_type) === 'venda')

  // Mapeia DailyRow → DailyPoint (chart shape: PT keys + data formatada + zero-fill)
  const libDaily = buildDailyData(dailyRecords)
  const dailyMap = new Map(libDaily.map((r) => [r.date, r]))
  const dailyData: DailyPoint[] = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((day) => {
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

  // Mapeia CampaignStatsRow → CampaignRow (chart shape: derived metrics)
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

  const cpm = stats.impressions > 0 ? (stats.spend / stats.impressions) * 1000 : 0

  const alerts: { level: 'critico' | 'atencao' | 'ok'; msg: string }[] = []
  if (hasVendas) {
    if (stats.roas < 1 && stats.spend > 0)
      alerts.push({ level: 'critico', msg: `ROAS abaixo de 1x — investimento não está retornando.` })
    else if (stats.roas < 2 && stats.spend > 0)
      alerts.push({ level: 'atencao', msg: `ROAS de ${stats.roas.toFixed(2)}x — abaixo do ideal (≥ 2x).` })
    else if (stats.spend > 0)
      alerts.push({ level: 'ok', msg: `ROAS saudável: ${stats.roas.toFixed(2)}x no período.` })
  }
  if (!hasVendas && stats.cpa > 0) {
    if (stats.cpa > 100)
      alerts.push({ level: 'critico', msg: `Custo por resultado alto: ${formatCurrency(stats.cpa)} — fale com seu gestor de tráfego.` })
    else if (stats.cpa > 50)
      alerts.push({ level: 'atencao', msg: `Custo por resultado: ${formatCurrency(stats.cpa)} — existe espaço para otimização.` })
    else
      alerts.push({ level: 'ok', msg: `Custo por resultado saudável: ${formatCurrency(stats.cpa)} no período.` })
  }
  if (stats.ctr < 1 && stats.impressions > 0)
    alerts.push({ level: 'critico', msg: `CTR crítico: ${stats.ctr.toFixed(2)}%. Os criativos precisam de revisão.` })
  else if (stats.ctr < 2 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CTR de ${stats.ctr.toFixed(2)}% — considere testar novos criativos.` })
  if (!hasVendas && cpm > 50 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CPM de ${formatCurrency(cpm)} por mil impressões — o público pode estar muito restrito.` })

  const ctrStatus:  'critico' | 'atencao' | 'ok' = stats.ctr < 1 ? 'critico' : stats.ctr < 2 ? 'atencao' : 'ok'
  const roasStatus: 'critico' | 'atencao' | 'ok' = stats.roas < 1 ? 'critico' : stats.roas < 2 ? 'atencao' : 'ok'
  const cpaStatus:  'critico' | 'atencao' | 'ok' = hasVendas
    ? (stats.cpa > 80  ? 'critico' : stats.cpa > 40 ? 'atencao' : 'ok')
    : (stats.cpa > 100 ? 'critico' : stats.cpa > 50 ? 'atencao' : 'ok')
  const cpmStatus:  'critico' | 'atencao' | 'ok' = cpm > 100 ? 'critico' : cpm > 50 ? 'atencao' : 'ok'

  return (
    <AppLayout pageTitle="Meus Anúncios">
      <div className="space-y-5">

        {/* ── Filtro de período ─────────────────────────────────── */}
        <Suspense fallback={null}>
          <TrafficFilters
            clients={[]}
            currentFrom={startDate}
            currentTo={endDate}
            currentClientId={null}
            basePath="/client/ads"
          />
        </Suspense>

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="h-7 w-7 text-[#EACE00]/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Nenhum dado no período</h3>
            <p className="text-white/40 text-sm max-w-sm">
              Ainda não há relatórios de tráfego no período selecionado.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Card */}
            <TrafficHeroCard
              from={startDate}
              to={endDate}
              stats={stats}
              campaignCount={campaignRows.length}
              results={results}
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Investimento', value: formatCurrency(stats.spend),       icon: DollarSign,       color: 'text-[#EACE00]', bg: 'bg-[#EACE00]/10' },
                { label: 'Impressões',   value: stats.impressions >= 1000 ? `${(stats.impressions / 1000).toFixed(1)}k` : String(stats.impressions), icon: Eye, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                { label: 'CPC Médio',    value: stats.cpc > 0 ? formatCurrency(stats.cpc) : '—',           icon: MousePointerClick, color: 'text-blue-400',   bg: 'bg-blue-400/10' },
                { label: 'CTR Médio',    value: stats.ctr > 0 ? `${stats.ctr.toFixed(2).replace('.', ',')}%` : '—', icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
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

            {/* Diagnóstico */}
            {stats.spend > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-[#EACE00]" />
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">Diagnóstico automático</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DiagBadge label="CTR"  value={stats.ctr > 0 ? `${stats.ctr.toFixed(2).replace('.', ',')}%` : '—'} status={ctrStatus} />
                  {hasVendas ? (
                    <DiagBadge label="ROAS" value={stats.roas > 0 ? `${stats.roas.toFixed(2).replace('.', ',')}x` : '—'} status={roasStatus} />
                  ) : (
                    <DiagBadge label="Custo/Resultado" value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'} status={cpaStatus} />
                  )}
                  {hasVendas ? (
                    <DiagBadge label="CPA" value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'} status={cpaStatus} />
                  ) : (
                    <DiagBadge label="CPM" value={cpm > 0 ? formatCurrency(cpm) : '—'} status={cpmStatus} />
                  )}
                </div>
              </div>
            )}

            {/* Tabela de campanhas */}
            <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Minhas campanhas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Campanha', 'Plataforma', 'Investido', 'CTR', 'CPC', 'Conversões', 'CPA', 'ROAS'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {campaignRows.map((c) => (
                      <tr key={c.id} className="hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3 text-white font-medium max-w-[160px] truncate">{c.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50">
                            {PLATFORM_LABEL[c.platform] ?? c.platform}
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
                          <span className={c.roas >= 2 ? 'text-green-400' : c.roas >= 1 ? 'text-[#EACE00]' : 'text-red-400'}>
                            {c.roas > 0 ? `${c.roas.toFixed(2).replace('.', ',')}x` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
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
