/**
 * Wrapper da Meta Marketing API.
 *
 * Token: env var META_ACCESS_TOKEN (long-lived 60 dias, perfil pessoal).
 * API version: env var META_API_VERSION (default v21.0).
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 */

import type { MetaInsightRow } from '@/types'

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
  }

  return fetchMetaApi<MetaInsightRow>(`/${id}/insights`, params)
}

/** Status atual de cada campanha (ACTIVE/PAUSED/...). */
export async function fetchCampaignStatus(adAccountId: string): Promise<
  Array<{
    id: string
    name: string
    status: string
    objective: string
    start_time: string | null
    stop_time: string | null
  }>
> {
  const id = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
  const data = await fetchMetaApi<{
    id: string
    name: string
    status: string
    objective: string
    start_time?: string
    stop_time?: string
  }>(`/${id}/campaigns`, {
    fields: 'id,name,status,objective,start_time,stop_time',
    limit: '500',
  })

  return data.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objective: c.objective,
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

const CONVERSION_TYPES = [
  'purchase',
  'omni_purchase',
  'lead',
  'leadgen.other',
  'complete_registration',
  'submit_application',
  'subscribe',
  'add_to_cart',
  'initiate_checkout',
  'onsite_conversion.purchase',
  'onsite_web_purchase',
  'offsite_conversion.fb_pixel_purchase',
]

/** Extrai conversions / revenue / result_type das actions[] da Meta. */
export function extractConversionsAndRevenue(row: MetaInsightRow): {
  conversions: number
  revenue: number
  result_type: string | null
} {
  let conversions = 0
  let revenue = 0
  const typeCounts: Record<string, number> = {}

  for (const a of row.actions ?? []) {
    const value = parseMetaNumber(a.value)
    typeCounts[a.action_type] = (typeCounts[a.action_type] ?? 0) + value
    if (CONVERSION_TYPES.some((t) => a.action_type === t || a.action_type.includes(t))) {
      conversions += value
    }
  }

  for (const av of row.action_values ?? []) {
    const value = parseMetaNumber(av.value)
    if (av.action_type.includes('purchase')) {
      revenue += value
    }
  }

  const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  const result_type = sorted.length > 0 ? sorted[0][0] : null

  return { conversions, revenue, result_type }
}
