/**
 * Wrapper da Instagram Graph API.
 *
 * Reusa `META_ACCESS_TOKEN` (long-lived) — o token precisa ter sido emitido com
 * os escopos: pages_show_list, pages_read_engagement, instagram_basic,
 * instagram_manage_insights.
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/reference
 *
 * Etapa 13.
 */

const META_API_BASE = 'https://graph.facebook.com'

function getApiVersion(): string {
  return process.env.META_API_VERSION || 'v22.0'
}

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error('META_ACCESS_TOKEN não configurado')
  return token
}

function getBaseUrl(): string {
  return `${META_API_BASE}/${getApiVersion()}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBody = Record<string, any>

/**
 * GET no Graph com paginação automática. Retorna array — se o endpoint devolver
 * um objeto único (ex: /{ig-user-id}), embrulha em `[obj]`.
 */
async function fetchIGApi<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
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
      throw new Error(`IG API ${res.status}: ${text.slice(0, 500)}`)
    }

    const body = (await res.json()) as AnyBody
    if (body.error) throw new Error(`IG API: ${body.error.message} (code ${body.error.code ?? '?'})`)

    if (Array.isArray(body.data)) {
      allData.push(...(body.data as T[]))
    } else {
      allData.push(body as T)
      break // objeto único — sem paginação
    }
    nextUrl = body.paging?.next ?? null
  }

  return allData
}

// ── Discovery: Pages do user + IG vinculado ────────────────────────────────────

export interface PageWithIG {
  page_id:     string
  page_name:   string
  ig_user_id:  string | null
  ig_username: string | null
}

/**
 * Lista Pages do token + IG vinculado de cada uma.
 *
 * Estratégia (fix pós-Etapa 13): UMA chamada `/me/accounts` pedindo
 * `instagram_business_account` de uma vez (em vez de N+1 chamadas seriais).
 * Usernames são puxados em paralelo (`Promise.all`). `account_type` foi
 * removido do discovery — passou a ser validado só no `connectIGAccountAction`
 * (era a fonte de falha silenciosa que zerava a lista).
 */
export async function fetchPagesWithIG(): Promise<PageWithIG[]> {
  const pages = await fetchIGApi<{
    id:                          string
    name:                        string
    instagram_business_account?: { id: string }
  }>('/me/accounts', {
    fields: 'id,name,instagram_business_account',
    limit:  '100',
  })

  const pagesWithIG = pages.filter((p) => p.instagram_business_account?.id)

  // Sem IG vinculado em nenhuma Page — retorna mesmo assim com ig_user_id=null
  // pra UI poder informar "nenhuma conta vinculada".
  if (pagesWithIG.length === 0) {
    return pages.map((p) => ({
      page_id:     p.id,
      page_name:   p.name,
      ig_user_id:  null,
      ig_username: null,
    }))
  }

  // Usernames em paralelo — 17 calls ≈ <2s vs ~15s serial.
  const usernameResults = await Promise.all(
    pagesWithIG.map(async (p) => {
      const igId = p.instagram_business_account!.id
      try {
        const info = await fetchIGApi<{ username?: string }>(`/${igId}`, { fields: 'username' })
        return { igId, username: info[0]?.username ?? null }
      } catch (e) {
        console.warn(`[fetchPagesWithIG] username de ${igId} falhou:`, e)
        return { igId, username: null }
      }
    }),
  )
  const usernameMap = new Map(usernameResults.map((r) => [r.igId, r.username]))

  return pages.map((p) => ({
    page_id:     p.id,
    page_name:   p.name,
    ig_user_id:  p.instagram_business_account?.id ?? null,
    ig_username: p.instagram_business_account
      ? (usernameMap.get(p.instagram_business_account.id) ?? null)
      : null,
  }))
}

// ── Insights do perfil (API v25 — 2 grupos) ────────────────────────────────────

export interface IGInsightDailyRow {
  date:           string
  reach:          number
  follower_count: number  // novos seguidores no dia
}

export interface IGPeriodAggregated {
  views:              number  // impressões (renomeado de impressions)
  profile_views:      number
  website_clicks:     number
  profile_links_taps: number
  total_interactions: number
  likes:              number
  comments:           number
  shares:             number
  saves:              number
  accounts_engaged:   number
}

/**
 * Busca insights do perfil IG (API v25).
 *
 * A Meta dividiu as métricas IG em 2 grupos a partir da v25:
 * - Grupo A (period=day, sem metric_type): retornam série diária
 *   → reach, follower_count
 * - Grupo B (metric_type=total_value): retornam total agregado do período
 *   → views, profile_views, website_clicks, profile_links_taps,
 *     total_interactions, likes, comments, shares, saves, accounts_engaged
 *
 * Janela máxima ~30 dias pela API.
 */
export async function fetchIGProfileInsights(opts: {
  igUserId: string
  since:    string // YYYY-MM-DD
  until:    string // YYYY-MM-DD
}): Promise<{ daily: IGInsightDailyRow[]; aggregated: IGPeriodAggregated }> {
  // Forçar UTC nas bordas pra ts ficar previsível independente de TZ do server.
  const sinceTs = Math.floor(new Date(opts.since + 'T00:00:00Z').getTime() / 1000)
  const untilTs = Math.floor(new Date(opts.until + 'T23:59:59Z').getTime() / 1000)

  console.log('[IG insights v25]', {
    igUserId:      opts.igUserId,
    sinceStr:      opts.since,
    untilStr:      opts.until,
    sinceTs,
    untilTs,
    sinceTsAsDate: new Date(sinceTs * 1000).toISOString(),
    untilTsAsDate: new Date(untilTs * 1000).toISOString(),
  })

  // ── Grupo A: diárias ────────────────────────────────────────────────────────
  const dailyByDate: Record<string, { reach: number; follower_count: number }> = {}

  try {
    const dailyResults = await fetchIGApi<{
      name:   string
      values: Array<{ value: number; end_time: string }>
    }>(`/${opts.igUserId}/insights`, {
      metric: 'reach,follower_count',
      period: 'day',
      since:  String(sinceTs),
      until:  String(untilTs),
    })

    for (const m of dailyResults) {
      for (const v of m.values ?? []) {
        const date = v.end_time.slice(0, 10)
        if (!dailyByDate[date]) dailyByDate[date] = { reach: 0, follower_count: 0 }
        if (m.name === 'reach')          dailyByDate[date].reach          = v.value
        if (m.name === 'follower_count') dailyByDate[date].follower_count = v.value
      }
    }
  } catch (e) {
    console.error('[IG daily metrics] erro:', e)
  }

  // ── Grupo B: agregadas do período ──────────────────────────────────────────
  const aggregated: IGPeriodAggregated = {
    views:              0,
    profile_views:      0,
    website_clicks:     0,
    profile_links_taps: 0,
    total_interactions: 0,
    likes:              0,
    comments:           0,
    shares:             0,
    saves:              0,
    accounts_engaged:   0,
  }

  try {
    const totalResults = await fetchIGApi<{
      name:         string
      total_value?: { value: number }
    }>(`/${opts.igUserId}/insights`, {
      metric:      'views,profile_views,website_clicks,profile_links_taps,total_interactions,likes,comments,shares,saves,accounts_engaged',
      period:      'day',
      metric_type: 'total_value',
      since:       String(sinceTs),
      until:       String(untilTs),
    })

    for (const m of totalResults) {
      const value = m.total_value?.value ?? 0
      if (m.name in aggregated) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (aggregated as any)[m.name] = value
      }
    }
  } catch (e) {
    console.error('[IG aggregated metrics] erro:', e)
  }

  const daily = Object.entries(dailyByDate)
    .map(([date, data]) => ({ date, reach: data.reach, follower_count: data.follower_count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  console.log('[IG insights v25 result]', {
    dailyCount:       daily.length,
    aggregatedTotals: aggregated,
  })

  return { daily, aggregated }
}

// ── Info do perfil (snapshot atual) ────────────────────────────────────────────

export interface IGAccountInfo {
  username:        string
  followers_count: number
}

/**
 * Snapshot atual: followers e username. Meta IG não expõe histórico de followers.
 *
 * NOTA: campo `account_type` foi removido do endpoint `/{ig-user-id}` na API v22+
 * (retorna `Error 100: nonexisting field`). A validação de Business/Creator é
 * implícita pelo vínculo Page→IG — Personal não consegue vincular a Page.
 */
export async function fetchIGAccountInfo(igUserId: string): Promise<IGAccountInfo | null> {
  try {
    const data = await fetchIGApi<IGAccountInfo>(`/${igUserId}`, {
      fields: 'username,followers_count',
    })
    return data[0] ?? null
  } catch (e) {
    console.error('[fetchIGAccountInfo]', e)
    return null
  }
}
