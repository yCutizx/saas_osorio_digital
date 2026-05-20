/**
 * Builders agregadores de tráfego — extraídos das pages [clientId]/page.tsx e
 * /client/ads/page.tsx pra eliminar duplicação. Server-safe (sem hooks).
 */

import type { TrafficReport } from '@/types'

// ── Tipos compartilhados ───────────────────────────────────────────────────────

export interface TrafficReportWithCampaign extends TrafficReport {
  campaigns?: {
    name:              string
    platform:          string
    objective?:        string | null
    optimization_goal?: string | null
  } | null
}

export interface DailyRecordRow {
  date:        string
  spend:       number | null
  impressions: number | null
  clicks:      number | null
  conversions: number | null
}

export interface DailyRow {
  date:        string
  spend:       number
  impressions: number
  clicks:      number
  conversions: number
}

export interface DailyRowWithResultType {
  date:        string
  campaign_id: string
  result_type: string | null
  spend:       number | null
  impressions: number | null
  clicks:      number | null
  conversions: number | null
}

export interface CampaignStatsRow {
  campaignId:        string
  name:              string
  platform:          string
  objective:         string | null
  optimization_goal: string | null
  result_type:       string | null
  spend:             number
  impressions:       number
  clicks:            number
  conversions:       number
  revenue:           number
}

export interface ResultSummaryItem {
  result_type: string
  count:       number
}

export interface TrafficStats {
  spend:       number
  impressions: number
  clicks:      number
  conversions: number
  revenue:     number
  reach:       number
}

// ── Builders ───────────────────────────────────────────────────────────────────

/**
 * Stats agregados (totais) pro hero card.
 * `reach` agregado como MAX porque alcance não soma (mesma pessoa em dias
 * diferentes ainda é 1 pessoa). Approx — o ideal seria pedir reach unique do
 * período inteiro à Meta, mas o trade-off é aceitável.
 */
export function computeStats(reports: TrafficReportWithCampaign[]): TrafficStats {
  let spend = 0, impressions = 0, clicks = 0, conversions = 0, revenue = 0, reach = 0
  for (const r of reports) {
    spend       += r.spend ?? 0
    impressions += r.impressions ?? 0
    clicks      += r.clicks ?? 0
    conversions += r.conversions ?? 0
    revenue     += r.revenue ?? 0
    reach        = Math.max(reach, r.reach ?? 0)
  }
  return { spend, impressions, clicks, conversions, revenue, reach }
}

/**
 * Agrupa conversions por result_type pra breakdown no hero.
 * Resultado ordenado por count desc, sem zeros.
 */
export function buildResultSummary(reports: TrafficReportWithCampaign[]): ResultSummaryItem[] {
  const map = new Map<string, number>()
  for (const r of reports) {
    if (!r.result_type) continue
    const cur = map.get(r.result_type) ?? 0
    map.set(r.result_type, cur + (r.conversions ?? 0))
  }
  return Array.from(map.entries())
    .map(([result_type, count]) => ({ result_type, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * Stats a partir de traffic_daily (granularidade dia-a-dia, respeita filtro
 * exato). revenue/reach NÃO entram aqui — usar `computeReachAndRevenue` no
 * reports (que tem esses campos).
 */
export function computeStatsFromDaily(daily: DailyRowWithResultType[]): {
  spend:       number
  impressions: number
  clicks:      number
  conversions: number
} {
  let spend = 0, impressions = 0, clicks = 0, conversions = 0
  for (const r of daily) {
    spend       += r.spend ?? 0
    impressions += r.impressions ?? 0
    clicks      += r.clicks ?? 0
    conversions += r.conversions ?? 0
  }
  return { spend, impressions, clicks, conversions }
}

/**
 * Reach e revenue de reports — métricas que não vivem em traffic_daily.
 * Aproximação aceitável (raro filtrar com precisão; reach unique por dia
 * exigiria fetch dedicado à Meta API).
 */
export function computeReachAndRevenue(reports: TrafficReportWithCampaign[]): {
  reach:   number
  revenue: number
} {
  let reach = 0
  let revenue = 0
  for (const r of reports) {
    reach    = Math.max(reach, r.reach ?? 0)
    revenue += r.revenue ?? 0
  }
  return { reach, revenue }
}

/**
 * Etapa 13 — cruzamento de PROFILE_VISITS Meta com Instagram Graph.
 *
 * Quando há campanhas com optimization_goal=PROFILE_VISITS, o extractor grava
 * `result_type='profile_visits_pending'` (porque a Meta Marketing API não tem
 * action_type confiável pra esse goal — o dado real vem do IG Graph).
 *
 * Pós-v25: `profile_views` deixou de ser dia-a-dia e passou a vir agregado por
 * período. Lemos do snapshot em `instagram_accounts.last_period_profile_views`.
 * Se IG não conectado (account null) ou sem profile_views, remove o pending.
 */
export function mergeProfileVisitsIntoResults(
  results: ResultSummaryItem[],
  igAccount: { last_period_profile_views: number | null } | null,
): ResultSummaryItem[] {
  const hasPending = results.some((r) => r.result_type === 'profile_visits_pending')
  if (!hasPending) return results

  const total = igAccount?.last_period_profile_views ?? 0
  const withoutPending = results.filter((r) => r.result_type !== 'profile_visits_pending')

  if (total === 0) return withoutPending

  return [...withoutPending, { result_type: 'profile_views', count: total }]
    .sort((a, b) => b.count - a.count)
}

/**
 * Breakdown por result_type usando traffic_daily — respeita filtro exato.
 */
export function buildResultSummaryFromDaily(daily: DailyRowWithResultType[]): ResultSummaryItem[] {
  const map = new Map<string, number>()
  for (const r of daily) {
    if (!r.result_type) continue
    const cur = map.get(r.result_type) ?? 0
    map.set(r.result_type, cur + (r.conversions ?? 0))
  }
  return Array.from(map.entries())
    .map(([result_type, count]) => ({ result_type, count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * Série diária pro line chart. Datas em formato ISO (yyyy-MM-dd) — a UI formata.
 */
export function buildDailyData(daily: DailyRecordRow[]): DailyRow[] {
  const byDate = new Map<string, DailyRow>()
  for (const row of daily) {
    const key = row.date.slice(0, 10)
    const cur = byDate.get(key) ?? { date: key, spend: 0, impressions: 0, clicks: 0, conversions: 0 }
    cur.spend       += row.spend ?? 0
    cur.impressions += row.impressions ?? 0
    cur.clicks      += row.clicks ?? 0
    cur.conversions += row.conversions ?? 0
    byDate.set(key, cur)
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Agrega reports por campanha pra tabela. Métricas derivadas (ctr/cpc/cpa/roas)
 * a UI calcula em cima dessa base — separação raw/derivado.
 */
export function buildCampaignRows(reports: TrafficReportWithCampaign[]): CampaignStatsRow[] {
  const byCampaign = new Map<string, CampaignStatsRow>()
  for (const r of reports) {
    const id  = r.campaign_id
    const cur = byCampaign.get(id) ?? {
      campaignId:        id,
      name:              r.campaigns?.name ?? '—',
      platform:          r.campaigns?.platform ?? '—',
      objective:         r.campaigns?.objective ?? null,
      optimization_goal: r.campaigns?.optimization_goal ?? null,
      result_type:       r.result_type ?? null,
      spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0,
    }
    cur.spend       += r.spend ?? 0
    cur.impressions += r.impressions ?? 0
    cur.clicks      += r.clicks ?? 0
    cur.conversions += r.conversions ?? 0
    cur.revenue     += r.revenue ?? 0
    // Se múltiplas rows da mesma campanha tiverem result_types diferentes,
    // mantém o primeiro não-nulo (em geral todas iguais; edge case raro).
    if (r.result_type && !cur.result_type) cur.result_type = r.result_type
    byCampaign.set(id, cur)
  }
  return Array.from(byCampaign.values()).sort((a, b) => b.spend - a.spend)
}
