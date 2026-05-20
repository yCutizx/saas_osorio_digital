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

// ── Insights diários do perfil ─────────────────────────────────────────────────

export interface IGInsightDailyRow {
  date:                  string
  impressions:           number
  views:                 number
  reach:                 number
  profile_views:         number
  profile_links_taps:    number
  website_clicks:        number
  email_contacts:        number
  phone_call_clicks:     number
  text_message_clicks:   number
  get_directions_clicks: number
}

type IGMetricPayload = {
  name:        string
  total_value?: { value: number }
  values?:     Array<{ value: number; end_time: string }>
}

function accumulate(
  out: Record<string, Record<string, number>>,
  payload: IGMetricPayload[],
) {
  for (const m of payload) {
    for (const v of m.values ?? []) {
      const date = v.end_time.slice(0, 10)
      if (!out[date]) out[date] = {}
      out[date][m.name] = v.value
    }
  }
}

/**
 * Busca insights diários (perfil-level). Janela máxima ~30 dias pela API.
 *
 * Estratégia de fallback (v22+ deprecations):
 * - `impressions`/`profile_views` foram deprecated em algumas contas
 * - Se a chamada principal falhar, tenta `views`/`profile_links_taps`
 *
 * Métricas total_value (CTAs) vão em chamada separada — exigem
 * `metric_type=total_value` desde v18+.
 */
export async function fetchIGProfileInsights(opts: {
  igUserId: string
  since:    string // YYYY-MM-DD
  until:    string // YYYY-MM-DD
}): Promise<IGInsightDailyRow[]> {
  const sinceTs = Math.floor(new Date(opts.since).getTime() / 1000)
  const untilTs = Math.floor(new Date(opts.until).getTime() / 1000)

  const collected: Record<string, Record<string, number>> = {}

  // 1) Métricas regulares — tenta legacy, faz fallback pra v22+
  try {
    const legacy = await fetchIGApi<IGMetricPayload>(`/${opts.igUserId}/insights`, {
      metric: 'impressions,reach,profile_views,website_clicks',
      period: 'day',
      since:  String(sinceTs),
      until:  String(untilTs),
    })
    accumulate(collected, legacy)
  } catch (e) {
    console.warn('[IG insights] métricas legacy falharam, tentando v22+ fallback:', e)
    try {
      const v22 = await fetchIGApi<IGMetricPayload>(`/${opts.igUserId}/insights`, {
        metric: 'views,reach,profile_links_taps,website_clicks',
        period: 'day',
        since:  String(sinceTs),
        until:  String(untilTs),
      })
      accumulate(collected, v22)
    } catch (e2) {
      console.error('[IG insights] fallback v22+ também falhou:', e2)
    }
  }

  // 2) CTAs (total_value)
  try {
    const cta = await fetchIGApi<IGMetricPayload>(`/${opts.igUserId}/insights`, {
      metric:      'email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks',
      period:      'day',
      metric_type: 'total_value',
      since:       String(sinceTs),
      until:       String(untilTs),
    })
    accumulate(collected, cta)
  } catch (e) {
    console.warn('[IG insights] CTAs falharam (conta pode não ter histórico):', e)
  }

  return Object.entries(collected)
    .map(([date, m]) => ({
      date,
      impressions:           m.impressions           ?? 0,
      views:                 m.views                 ?? 0,
      reach:                 m.reach                 ?? 0,
      profile_views:         m.profile_views         ?? 0,
      profile_links_taps:    m.profile_links_taps    ?? 0,
      website_clicks:        m.website_clicks        ?? 0,
      email_contacts:        m.email_contacts        ?? 0,
      phone_call_clicks:     m.phone_call_clicks     ?? 0,
      text_message_clicks:   m.text_message_clicks   ?? 0,
      get_directions_clicks: m.get_directions_clicks ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// ── Info do perfil (snapshot atual) ────────────────────────────────────────────

export interface IGAccountInfo {
  username:        string
  followers_count: number
  account_type:    string
}

/** Snapshot atual: followers e account_type. Meta IG não expõe histórico de followers. */
export async function fetchIGAccountInfo(igUserId: string): Promise<IGAccountInfo | null> {
  try {
    const data = await fetchIGApi<IGAccountInfo>(`/${igUserId}`, {
      fields: 'username,followers_count,account_type',
    })
    return data[0] ?? null
  } catch (e) {
    console.error('[fetchIGAccountInfo]', e)
    return null
  }
}
