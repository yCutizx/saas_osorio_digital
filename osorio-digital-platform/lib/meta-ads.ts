/**
 * Wrapper da Meta Marketing API.
 *
 * Token: env var META_ACCESS_TOKEN (long-lived 60 dias, perfil pessoal).
 * API version: env var META_API_VERSION (default v21.0).
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 */

import type { MetaInsightRow } from '@/types'
import {
  OPTIMIZATION_GOAL_PRIMARY_ACTION,
  OBJECTIVE_FALLBACK_GOAL,
  RESULT_TYPE_LABELS,
} from './meta-result-types'

const KNOWN_ACTION_TYPES = new Set(Object.keys(RESULT_TYPE_LABELS))

const META_API_BASE = 'https://graph.facebook.com'

function getApiVersion(): string {
  return process.env.META_API_VERSION || 'v21.0'
}

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado')
  return token
}

function getBaseUrl(): string {
  return `${META_API_BASE}/${getApiVersion()}`
}

type MetaErrorBody = { error: { message: string; type: string; code: number } }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MetaDataBody<T> = { data: T[]; paging?: { next?: string; cursors?: any } }
type MetaApiResponse<T> = MetaDataBody<T> | MetaErrorBody

async function fetchMetaApi<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${getBaseUrl()}${path}`)
  url.searchParams.set('access_token', getAccessToken())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  const allData: T[] = []
  let nextUrl: string | null = url.toString()
  let safety = 0

  while (nextUrl && safety < 50) {
    safety++
    const res = await fetch(nextUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Meta API ${res.status}: ${text.slice(0, 500)}`)
    }

    const body = (await res.json()) as MetaApiResponse<T>
    if ('error' in body) {
      throw new Error(`Meta API: ${body.error.message} (code ${body.error.code})`)
    }

    allData.push(...body.data)
    nextUrl = body.paging?.next ?? null
  }

  return allData
}

/** Testa se o token tem acesso à conta de anúncios. */
export async function testAdAccountAccess(
  adAccountId: string,
): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    // /act_XXX retorna objeto único, não data[]. Faz request direto sem usar fetchMetaApi.
    const url = new URL(`${getBaseUrl()}/${id}`)
    url.searchParams.set('access_token', getAccessToken())
    url.searchParams.set('fields', 'id,name,account_status,currency')

    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `${res.status}: ${text.slice(0, 300)}` }
    }
    const body = (await res.json()) as { id?: string; name?: string; error?: { message: string } }
    if (body.error) return { ok: false, error: body.error.message }
    if (!body.name) return { ok: false, error: 'Conta sem nome retornado' }
    return { ok: true, name: body.name }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

/** Busca insights diários de todas as campanhas. */
export async function fetchAccountInsights(opts: {
  adAccountId: string
  since: string
  until: string
}): Promise<MetaInsightRow[]> {
  const id = opts.adAccountId.startsWith('act_') ? opts.adAccountId : `act_${opts.adAccountId}`
  const fields = [
    'campaign_id',
    'campaign_name',
    'objective',
    'date_start',
    'date_stop',
    'spend',
    'impressions',
    'reach',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'frequency',
    'actions',
    'action_values',
  ].join(',')

  const params: Record<string, string> = {
    level: 'campaign',
    time_increment: '1',
    time_range: JSON.stringify({ since: opts.since, until: opts.until }),
    fields,
    limit: '500',
    // Alinha com o que o Ads Manager UI mostra por padrão (default da conta).
    // Fix Etapa 13 — drift de 3-4% em impressions/clicks vs UI.
    action_attribution_windows: JSON.stringify(['7d_click', '1d_view', '1d_ev']),
    use_unified_attribution_setting: 'true',
  }

  return fetchMetaApi<MetaInsightRow>(`/${id}/insights`, params)
}

/**
 * Reach único, frequência e impressões do período inteiro (sem time_increment).
 * Usado pra corrigir o `Math.max(reach)` quebrado do agregador antigo.
 * Retorna null se conta não tiver gasto no período (Meta retorna `data: []`).
 */
export async function fetchAccountReachForPeriod(opts: {
  adAccountId: string
  since: string
  until: string
}): Promise<{ reach: number; frequency: number; impressions: number } | null> {
  const id = opts.adAccountId.startsWith('act_') ? opts.adAccountId : `act_${opts.adAccountId}`
  const params: Record<string, string> = {
    level: 'account',
    time_range: JSON.stringify({ since: opts.since, until: opts.until }),
    fields: 'reach,frequency,impressions',
    action_attribution_windows: JSON.stringify(['7d_click', '1d_view', '1d_ev']),
    use_unified_attribution_setting: 'true',
    // SEM time_increment — Meta devolve 1 linha agregada do período inteiro
  }

  try {
    const rows = await fetchMetaApi<{ reach?: string; frequency?: string; impressions?: string }>(
      `/${id}/insights`,
      params,
    )
    if (rows.length === 0) return null
    return {
      reach:       parseMetaNumber(rows[0].reach),
      frequency:   parseMetaNumber(rows[0].frequency),
      impressions: parseMetaNumber(rows[0].impressions),
    }
  } catch (e) {
    console.error('[fetchAccountReachForPeriod]', e)
    return null
  }
}

/**
 * Timezone da Ad Account (ex: 'America/Sao_Paulo'). Usada pra calcular
 * since/until alinhado com a data calendário da conta — evita drift quando
 * server (UTC) atravessa meia-noite mas o cliente ainda está no dia anterior.
 */
export async function fetchAdAccountTimezone(adAccountId: string): Promise<string | null> {
  try {
    const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    // /act_XXX retorna objeto único — request direto sem fetchMetaApi
    const url = new URL(`${getBaseUrl()}/${id}`)
    url.searchParams.set('access_token', getAccessToken())
    url.searchParams.set('fields', 'timezone_name')
    const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
    if (!res.ok) return null
    const body = (await res.json()) as { timezone_name?: string }
    return body.timezone_name ?? null
  } catch {
    return null
  }
}

/** Status atual de cada campanha (ACTIVE/PAUSED/...) + optimization_goal quando disponível. */
export async function fetchCampaignStatus(adAccountId: string): Promise<
  Array<{
    id: string
    name: string
    status: string
    objective: string
    optimization_goal: string | null
    start_time: string | null
    stop_time: string | null
  }>
> {
  const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  // `optimization_goal` no endpoint /campaigns só vem em campanhas mais recentes ou
  // quando explicitamente definido no nível da campanha — na maioria mora no AdSet.
  // Quando vier null, o extractor cai no fallback baseado em `objective`.
  const data = await fetchMetaApi<{
    id: string
    name: string
    status: string
    objective: string
    optimization_goal?: string
    start_time?: string
    stop_time?: string
  }>(`/${id}/campaigns`, {
    fields: 'id,name,status,objective,optimization_goal,start_time,stop_time',
    limit: '500',
  })

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
    optimization_goal: c.optimization_goal ?? null,
    start_time: c.start_time ?? null,
    stop_time: c.stop_time ?? null,
  }))
}

/** Meta API retorna tudo como string — parse seguro. */
export function parseMetaNumber(v: string | number | undefined | null): number {
  if (v === undefined || v === null) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Extrai resultado primário, conversões totais e revenue de uma linha de insight.
 *
 * Estratégia (Etapa 12):
 * 1. Determina o `optimization_goal` efetivo (explícito ou inferido do `objective`)
 * 2. Procura no `actions[]` o `action_type` correspondente ao goal
 *    → match: `result_type` = esse action_type, `conversions` = valor dele
 * 3. Fallback: action_type categorizado de maior valor (em RESULT_TYPE_LABELS)
 * 4. Último recurso: action_type bruto mais frequente
 * 5. Edge case (ambos null E sem actions): conversions=0, result_type=null
 * 6. Revenue: soma action_values com 'purchase' no nome (lógica original)
 */
export function extractConversionsAndRevenue(
  row: MetaInsightRow,
  optimizationGoal: string | null,
  objective: string | null,
): { conversions: number; revenue: number; result_type: string | null } {
  // Goal efetivo: explícito > inferido do objective > null
  const effectiveGoal =
    optimizationGoal ??
    (objective ? OBJECTIVE_FALLBACK_GOAL[objective] ?? null : null)

  // PROFILE_VISITS não tem action_type confiável no Marketing API — vem do
  // Instagram Graph (cruzamento via mergeProfileVisitsIntoResults). Marca como
  // pending pra o dashboard fazer o merge.
  if (effectiveGoal === 'PROFILE_VISITS') {
    let revenuePV = 0
    for (const av of row.action_values ?? []) {
      if (av.action_type.includes('purchase')) revenuePV += parseMetaNumber(av.value)
    }
    return { conversions: 0, revenue: revenuePV, result_type: 'profile_visits_pending' }
  }

  // Totais por action_type
  const actionTotals: Record<string, number> = {}
  for (const a of row.actions ?? []) {
    const value = parseMetaNumber(a.value)
    actionTotals[a.action_type] = (actionTotals[a.action_type] ?? 0) + value
  }

  let result_type: string | null = null
  let conversions = 0

  // 1) Match priorizado pelo optimization_goal
  if (effectiveGoal && OPTIMIZATION_GOAL_PRIMARY_ACTION[effectiveGoal]) {
    const candidates = OPTIMIZATION_GOAL_PRIMARY_ACTION[effectiveGoal]
    for (const candidate of candidates) {
      if (actionTotals[candidate] !== undefined && actionTotals[candidate] > 0) {
        result_type = candidate
        conversions = actionTotals[candidate]
        break
      }
    }
  }

  // 2) Fallback: maior action_type categorizado (KNOWN_ACTION_TYPES)
  if (!result_type && Object.keys(actionTotals).length > 0) {
    const knownActions = Object.entries(actionTotals)
      .filter(([type]) => KNOWN_ACTION_TYPES.has(type))
      .sort((a, b) => b[1] - a[1])

    if (knownActions.length > 0) {
      result_type = knownActions[0][0]
      conversions = knownActions[0][1]
    } else {
      // 3) Último recurso: action_type bruto mais frequente
      const sorted = Object.entries(actionTotals).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) {
        result_type = sorted[0][0]
        conversions = sorted[0][1]
      }
    }
  }

  // Revenue (lógica original — só action_values com 'purchase')
  let revenue = 0
  for (const av of row.action_values ?? []) {
    const value = parseMetaNumber(av.value)
    if (av.action_type.includes('purchase')) {
      revenue += value
    }
  }

  return {
    conversions: Math.round(conversions),
    revenue,
    result_type,
  }
}
