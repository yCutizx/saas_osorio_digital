import { format, subDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DollarSign, Eye, MousePointerClick, TrendingUp,
  BarChart2, AlertTriangle, CheckCircle2, XCircle, Zap, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { AppLayout }       from '@/components/layout/app-layout'
import { createClient }    from '@/lib/supabase/server'
import { requireMinPlan }  from '@/lib/client-plan'
import { TrafficCharts }   from '@/app/(traffic)/traffic/dashboard/traffic-charts'
import { formatCurrency }  from '@/lib/utils'
import type { DailyPoint, CampaignRow } from '@/app/(traffic)/traffic/dashboard/traffic-charts'

// ── types ────────────────────────────────────────────────────────────────────
type Report = {
  id:           string
  campaign_id:  string
  period_start: string
  spend:        number
  revenue:      number | null
  impressions:  number
  clicks:       number
  conversions:  number
  campaigns:    { name: string; platform: string } | null
}

// ── builders ─────────────────────────────────────────────────────────────────
function computeStats(reports: Report[]) {
  const spend       = reports.reduce((s, r) => s + r.spend, 0)
  const revenue     = reports.reduce((s, r) => s + (r.revenue ?? 0), 0)
  const conversions = reports.reduce((s, r) => s + r.conversions, 0)
  const clicks      = reports.reduce((s, r) => s + r.clicks, 0)
  const impressions = reports.reduce((s, r) => s + r.impressions, 0)
  const roas = spend > 0 ? revenue / spend : 0
  const ctr  = impressions > 0 ? (clicks / impressions) * 100 : 0
  const cpc  = clicks > 0 ? spend / clicks : 0
  const cpa  = conversions > 0 ? spend / conversions : 0
  return { spend, revenue, conversions, clicks, impressions, roas, ctr, cpc, cpa }
}

function buildDailyData(reports: Report[]): DailyPoint[] {
  const map = new Map<string, DailyPoint>()
  for (const r of reports) {
    const existing = map.get(r.period_start) ?? {
      date:         format(parseISO(r.period_start), 'dd/MM', { locale: ptBR }),
      investimento: 0, conversoes: 0, cliques: 0, impressoes: 0,
    }
    existing.investimento += r.spend
    existing.conversoes   += r.conversions
    existing.cliques      += r.clicks
    existing.impressoes   += r.impressions
    map.set(r.period_start, existing)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

function buildCampaignRows(reports: Report[]): CampaignRow[] {
  const map = new Map<string, {
    name: string; platform: string
    spend: number; revenue: number; clicks: number; impressions: number; conversions: number
  }>()
  for (const r of reports) {
    const key = r.campaign_id
    const existing = map.get(key) ?? {
      name: r.campaigns?.name ?? 'Sem campanha',
      platform: r.campaigns?.platform ?? 'other',
      spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0,
    }
    existing.spend       += r.spend
    existing.revenue     += r.revenue ?? 0
    existing.clicks      += r.clicks
    existing.impressions += r.impressions
    existing.conversions += r.conversions
    map.set(key, existing)
  }
  return Array.from(map.entries()).map(([id, c]) => ({
    id,
    name:        c.name,
    platform:    c.platform,
    spend:       c.spend,
    revenue:     c.revenue,
    clicks:      c.clicks,
    impressions: c.impressions,
    conversions: c.conversions,
    ctr:  c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cpc:  c.clicks > 0 ? c.spend / c.clicks : 0,
    cpa:  c.conversions > 0 ? c.spend / c.conversions : 0,
    roas: c.spend > 0 ? c.revenue / c.spend : 0,
  })).sort((a, b) => b.spend - a.spend)
}

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
export default async function ClientAdsPage() {
  await requireMinPlan('pro')

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

  const period    = 30
  const startDate = format(subDays(new Date(), period), 'yyyy-MM-dd')
  const endDate   = format(new Date(), 'yyyy-MM-dd')

  const { data: rawReports } = await supabase
    .from('traffic_reports')
    .select('id, campaign_id, period_start, spend, revenue, impressions, clicks, conversions, campaigns(name, platform)')
    .eq('client_id', clientId)
    .gte('period_start', startDate)
    .lte('period_end', endDate)
    .order('period_start', { ascending: true })

  const reports = (rawReports ?? []) as unknown as Report[]
  const stats        = computeStats(reports)
  const dailyData    = buildDailyData(reports)
  const campaignRows = buildCampaignRows(reports)

  const alerts: { level: 'critico' | 'atencao' | 'ok'; msg: string }[] = []
  if (stats.roas < 1 && stats.spend > 0)
    alerts.push({ level: 'critico', msg: `ROAS abaixo de 1x — investimento não está retornando.` })
  else if (stats.roas < 2 && stats.spend > 0)
    alerts.push({ level: 'atencao', msg: `ROAS de ${stats.roas.toFixed(2)}x — abaixo do ideal (≥ 2x).` })
  else if (stats.spend > 0)
    alerts.push({ level: 'ok', msg: `ROAS saudável: ${stats.roas.toFixed(2)}x no período.` })
  if (stats.ctr < 1 && stats.impressions > 0)
    alerts.push({ level: 'critico', msg: `CTR crítico: ${stats.ctr.toFixed(2)}%. Os criativos precisam de revisão.` })
  else if (stats.ctr < 2 && stats.impressions > 0)
    alerts.push({ level: 'atencao', msg: `CTR de ${stats.ctr.toFixed(2)}% — considere testar novos criativos.` })

  const ctrStatus: 'critico' | 'atencao' | 'ok'  = stats.ctr < 1 ? 'critico' : stats.ctr < 2 ? 'atencao' : 'ok'
  const roasStatus: 'critico' | 'atencao' | 'ok' = stats.roas < 1 ? 'critico' : stats.roas < 2 ? 'atencao' : 'ok'
  const cpaStatus: 'critico' | 'atencao' | 'ok'  = stats.cpa > 80 ? 'critico' : stats.cpa > 40 ? 'atencao' : 'ok'

  return (
    <AppLayout pageTitle="Meus Anúncios">
      <div className="space-y-5">

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-brand-yellow/10 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="h-7 w-7 text-brand-yellow/60" />
            </div>
            <h3 className="text-white font-semibold mb-1">Nenhum dado no período</h3>
            <p className="text-white/40 text-sm max-w-sm">
              Ainda não há relatórios de tráfego para os últimos {period} dias.
            </p>
          </div>
        ) : (
          <>
            {/* Hero Card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#EACE00]/15 to-[#EACE00]/5 border border-[#EACE00]/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-white/50 uppercase tracking-wider mb-1">Resultado principal</p>
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-black text-white leading-none">
                    {stats.conversions.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-white/60 text-base pb-1">
                    conversõe{stats.conversions !== 1 ? 's' : ''} gerada{stats.conversions !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-white/40 text-sm mt-2">
                  em {period} dias · {formatCurrency(stats.spend)} investidos
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-xs text-white/40 uppercase tracking-wider">ROAS</span>
                <span className={`text-3xl font-bold ${stats.roas >= 2 ? 'text-green-400' : stats.roas >= 1 ? 'text-brand-yellow' : 'text-red-400'}`}>
                  {stats.roas > 0 ? `${stats.roas.toFixed(2).replace('.', ',')}x` : '—'}
                </span>
                {stats.roas >= 2 && <span className="text-green-400 text-xs flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />Acima da meta</span>}
                {stats.roas > 0 && stats.roas < 2 && <span className="text-yellow-400 text-xs flex items-center gap-1"><ArrowDownRight className="h-3 w-3" />Abaixo da meta</span>}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Investimento', value: formatCurrency(stats.spend),       icon: DollarSign,       color: 'text-brand-yellow', bg: 'bg-brand-yellow/10' },
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
                  <p className="text-xs text-white/30 mt-0.5">últimos {period} dias</p>
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
                  <Zap className="h-4 w-4 text-brand-yellow" />
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">Diagnóstico automático</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <DiagBadge label="CTR"  value={stats.ctr > 0 ? `${stats.ctr.toFixed(2).replace('.', ',')}%` : '—'}   status={ctrStatus}  />
                  <DiagBadge label="ROAS" value={stats.roas > 0 ? `${stats.roas.toFixed(2).replace('.', ',')}x` : '—'}  status={roasStatus} />
                  <DiagBadge label="CPA"  value={stats.cpa > 0 ? formatCurrency(stats.cpa) : '—'}                        status={cpaStatus}  />
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
                          <span className={c.roas >= 2 ? 'text-green-400' : c.roas >= 1 ? 'text-brand-yellow' : 'text-red-400'}>
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
