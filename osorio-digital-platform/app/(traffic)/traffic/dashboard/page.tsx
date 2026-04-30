import { Suspense } from 'react'
import Link from 'next/link'
import { subDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign, Target, TrendingUp, MousePointerClick, PlusCircle, BarChart2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { TrafficFilters } from './traffic-filters'
import { TrafficCharts } from './traffic-charts'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { SpendDataPoint } from '@/components/charts/spend-area-chart'
import type { CampaignDataPoint } from '@/components/charts/campaign-bar-chart'

// ── tipos internos ──────────────────────────────────────────
type Report = {
  id: string
  campaign_id: string
  client_id: string
  period_start: string
  spend: number
  revenue: number | null
  impressions: number
  clicks: number
  conversions: number
  campaigns: { name: string; platform: string } | null
}

// ── agregações ──────────────────────────────────────────────
function computeStats(reports: Report[]) {
  const totalSpend       = reports.reduce((s, r) => s + r.spend, 0)
  const totalRevenue     = reports.reduce((s, r) => s + (r.revenue ?? 0), 0)
  const totalConversions = reports.reduce((s, r) => s + r.conversions, 0)
  const totalClicks      = reports.reduce((s, r) => s + r.clicks, 0)
  const totalImpressions = reports.reduce((s, r) => s + r.impressions, 0)
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const ctr  = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  return { totalSpend, totalRevenue, totalConversions, roas, ctr }
}

function buildAreaData(reports: Report[]): SpendDataPoint[] {
  const map = new Map<string, SpendDataPoint>()

  for (const r of reports) {
    const label = format(parseISO(r.period_start), 'dd/MM', { locale: ptBR })
    const existing = map.get(r.period_start) ?? { date: label, investimento: 0, receita: 0 }
    existing.investimento += r.spend
    existing.receita      += r.revenue ?? 0
    map.set(r.period_start, existing)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

function buildCampaignData(reports: Report[]): CampaignDataPoint[] {
  const map = new Map<string, CampaignDataPoint>()

  for (const r of reports) {
    const key  = r.campaign_id
    const name = r.campaigns?.name ?? 'Sem campanha'
    const plat = r.campaigns?.platform ?? 'other'

    const existing = map.get(key) ?? {
      campanha: name, plataforma: plat,
      investimento: 0, receita: 0, conversoes: 0,
    }
    existing.investimento += r.spend
    existing.receita      += r.revenue ?? 0
    existing.conversoes   += r.conversions
    map.set(key, existing)
  }

  return Array.from(map.values()).sort((a, b) => b.investimento - a.investimento)
}

// ── busca de dados ──────────────────────────────────────────
async function fetchDashboardData(period: number, clientId?: string) {
  const supabase = await createClient()

  const startDate = format(subDays(new Date(), period), 'yyyy-MM-dd')
  const endDate   = format(new Date(), 'yyyy-MM-dd')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  // Clientes acessíveis
  let clientsQuery = supabase.from('clients').select('id, name').eq('active', true).order('name')

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id').eq('user_id', user.id)
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length === 0) return { clients: [], reports: [], profile }
    clientsQuery = clientsQuery.in('id', ids)
  }

  const { data: clients } = await clientsQuery

  // Relatórios
  let reportsQuery = supabase
    .from('traffic_reports')
    .select('id, campaign_id, client_id, period_start, spend, revenue, impressions, clicks, conversions, campaigns(name, platform)')
    .gte('period_start', startDate)
    .lte('period_end', endDate)
    .order('period_start', { ascending: true })

  if (clientId) {
    reportsQuery = reportsQuery.eq('client_id', clientId)
  } else if (profile?.role !== 'admin' && clients?.length) {
    reportsQuery = reportsQuery.in('client_id', clients.map((c) => c.id))
  }

  const { data: reports } = await reportsQuery

  return { clients: clients ?? [], reports: (reports ?? []) as unknown as Report[], profile }
}

// ── página ──────────────────────────────────────────────────
interface PageProps {
  searchParams: { period?: string; client?: string }
}

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', other: 'Outro',
}

export default async function TrafficDashboardPage({ searchParams }: PageProps) {
  const period   = Math.min(Math.max(parseInt(searchParams.period ?? '30'), 7), 90)
  const clientId = searchParams.client

  const data = await fetchDashboardData(period, clientId)
  if (!data) return null

  const { clients, reports, profile } = data
  const stats       = computeStats(reports)
  const areaData    = buildAreaData(reports)
  const campaignData = buildCampaignData(reports)

  const statCards = [
    {
      label:  'Total Investido',
      value:  formatCurrency(stats.totalSpend),
      icon:   DollarSign,
      color:  'text-brand-yellow',
      bg:     'bg-brand-yellow/10',
    },
    {
      label:  'Conversões',
      value:  formatNumber(stats.totalConversions),
      icon:   Target,
      color:  'text-green-400',
      bg:     'bg-green-400/10',
    },
    {
      label:  'ROAS Médio',
      value:  `${stats.roas.toFixed(2).replace('.', ',')}x`,
      icon:   TrendingUp,
      color:  'text-blue-400',
      bg:     'bg-blue-400/10',
    },
    {
      label:  'CTR Médio',
      value:  `${stats.ctr.toFixed(2).replace('.', ',')}%`,
      icon:   MousePointerClick,
      color:  'text-purple-400',
      bg:     'bg-purple-400/10',
    },
  ]

  const isAdmin = profile?.role === 'admin'

  return (
    <AppLayout pageTitle="Gestão de Tráfego">
      <div className="space-y-6">

        {/* Cabeçalho com filtros e botão */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Suspense fallback={null}>
            <TrafficFilters
              clients={clients}
              currentPeriod={String(period)}
              currentClientId={clientId ?? null}
            />
          </Suspense>
          {(isAdmin || profile?.role === 'traffic_manager') && (
            <Link
              href="/traffic/reports/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-black font-semibold rounded-lg hover:bg-brand-yellow/90 transition-colors text-sm shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              Novo Relatório
            </Link>
          )}
        </div>

        {/* Estado vazio */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-brand-yellow/10 rounded-2xl flex items-center justify-center mb-4">
              <BarChart2 className="h-7 w-7 text-brand-yellow/60" />
            </div>
            <h3 className="text-foreground font-semibold mb-1">Nenhum dado no período</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              {clients.length === 0
                ? 'Você ainda não tem clientes atribuídos.'
                : `Não há relatórios nos últimos ${period} dias. Adicione um relatório ou rode o SQL de dados de exemplo.`}
            </p>
            {(isAdmin || profile?.role === 'traffic_manager') && clients.length > 0 && (
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
            {/* Cards de métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => (
                <Card key={card.label} className="bg-card border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                      <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-2xl font-bold text-foreground">{card.value}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">últimos {period} dias</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos */}
            <TrafficCharts areaData={areaData} campaignData={campaignData} />

            {/* Tabela de relatórios recentes */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Relatórios Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Data', 'Campanha', 'Plataforma', 'Investido', 'Receita', 'Conversões', 'ROAS'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reports.slice(0, 20).map((r) => {
                        const roas = r.spend > 0 && r.revenue ? r.revenue / r.spend : 0
                        return (
                          <tr key={r.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                              {format(parseISO(r.period_start), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-4 py-3 text-foreground max-w-[180px] truncate">
                              {r.campaigns?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                {PLATFORM_LABEL[r.campaigns?.platform ?? ''] ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-foreground whitespace-nowrap">
                              {formatCurrency(r.spend)}
                            </td>
                            <td className="px-4 py-3 text-green-400 whitespace-nowrap">
                              {r.revenue ? formatCurrency(r.revenue) : '—'}
                            </td>
                            <td className="px-4 py-3 text-foreground text-center">
                              {r.conversions}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={roas >= 2 ? 'text-green-400' : roas >= 1 ? 'text-brand-yellow' : 'text-red-400'}>
                                {roas > 0 ? `${roas.toFixed(2).replace('.', ',')}x` : '—'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  )
}
