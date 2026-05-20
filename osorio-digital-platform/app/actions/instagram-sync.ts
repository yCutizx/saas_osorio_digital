'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchPagesWithIG,
  fetchIGProfileInsights,
  fetchIGAccountInfo,
} from '@/lib/instagram-graph'

type AdminClient = ReturnType<typeof createAdminClient>

async function getAdminCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'traffic_manager', 'social_media'].includes(profile.role)) {
    return { error: 'Sem permissão' as const }
  }
  return { user, profile, admin }
}

/**
 * Pages do user + IG vinculado de cada. Filtra apenas Pages SEM IG
 * (qualquer IG vinculado a Page é Business ou Creator — Personal não vincula).
 * Validação fina de Business/Creator agora roda no connectIGAccountAction.
 */
export async function listAvailableIGAccountsAction() {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  try {
    const pages = await fetchPagesWithIG()
    const accounts = pages.filter((p) => p.ig_user_id !== null)
    return { ok: true as const, accounts }
  } catch (e) {
    console.error('[listAvailableIGAccountsAction]', e)
    return { error: e instanceof Error ? e.message : 'Erro ao buscar contas' }
  }
}

/**
 * Conecta uma conta IG a um cliente.
 *
 * Validação de Business/Creator é IMPLÍCITA pelo vínculo Page→IG:
 * - Pages do Facebook só aceitam IG Business/Creator vinculado (Personal não vincula)
 * - O field `account_type` foi removido da Graph API v22+ (não dá mais pra checar)
 *
 * Salvamos `account_kind='business'` por convenção — é metadata interna nossa.
 */
export async function connectIGAccountAction(opts: {
  clientId:   string
  igUserId:   string
  igUsername: string
  pageId:     string
  pageName:   string
}) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  const { error } = await ctx.admin
    .from('instagram_accounts')
    .upsert({
      client_id:        opts.clientId,
      ig_user_id:       opts.igUserId,
      ig_username:      opts.igUsername,
      account_kind:     'business',
      page_id:          opts.pageId,
      page_name:        opts.pageName,
      connected_at:     new Date().toISOString(),
      last_sync_status: null,
      last_sync_error:  null,
      is_primary:       true,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'client_id,ig_user_id' })

  if (error) return { error: 'Erro ao salvar conexão' }

  revalidatePath(`/admin/clients/${opts.clientId}/edit`)
  revalidatePath(`/traffic/dashboard/${opts.clientId}/instagram`)
  revalidatePath('/client/instagram')
  return { ok: true as const }
}

/** Remove conexão IG do cliente. Mantém histórico em instagram_daily. */
export async function disconnectIGAccountAction(clientId: string, igUserId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  await ctx.admin
    .from('instagram_accounts')
    .delete()
    .eq('client_id', clientId)
    .eq('ig_user_id', igUserId)

  revalidatePath(`/admin/clients/${clientId}/edit`)
  return { ok: true as const }
}

/** Sync manual (UI button). Default 7d; histórico usa 30d (limite da API). */
export async function syncIGAccountNowAction(clientId: string, daysBack = 7) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }
  return syncIGFromGraph(ctx.admin, clientId, daysBack)
}

export async function syncIGAccountHistoryAction(clientId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }
  return syncIGFromGraph(ctx.admin, clientId, 30)
}

/**
 * Função pura — usada pelas actions UI e pelo cron.
 * Não chama auth: o caller já validou permissão.
 */
export async function syncIGFromGraph(
  admin: AdminClient,
  clientId: string,
  daysBack: number,
): Promise<{ ok: true; days: number } | { error: string }> {
  const { data: account } = await admin
    .from('instagram_accounts')
    .select('ig_user_id, ig_username')
    .eq('client_id', clientId)
    .eq('is_primary', true)
    .maybeSingle()

  if (!account?.ig_user_id) return { error: 'Conta IG não conectada' }

  await admin
    .from('instagram_accounts')
    .update({ last_sync_status: 'pending', last_sync_error: null })
    .eq('client_id', clientId)
    .eq('ig_user_id', account.ig_user_id)

  try {
    const until = new Date()
    const since = new Date()
    // API IG limita janela em ~30 dias pra metrics period=day
    since.setDate(since.getDate() - Math.min(daysBack, 29))

    const sinceStr = since.toISOString().slice(0, 10)
    const untilStr = until.toISOString().slice(0, 10)

    console.log('[IG sync v25]', { clientId, daysBack, sinceStr, untilStr })

    // 2 chamadas internas (diária + agregada — v25)
    const { daily, aggregated } = await fetchIGProfileInsights({
      igUserId: account.ig_user_id,
      since:    sinceStr,
      until:    untilStr,
    })

    // Snapshot de followers (a Meta não expõe histórico per-day fora de contas
    // muito grandes; gravamos o número atual em todas as linhas do sync).
    const accountInfo  = await fetchIGAccountInfo(account.ig_user_id)
    const followersNow = accountInfo?.followers_count ?? 0

    // Diário — reach + follower_count por dia. Colunas legacy ficam 0 (não são
    // mais populadas pela v25, deixadas no schema pra não quebrar histórico).
    for (const row of daily) {
      await admin
        .from('instagram_daily')
        .upsert({
          client_id:             clientId,
          ig_user_id:            account.ig_user_id,
          date:                  row.date,
          reach:                 row.reach,
          follower_count:        followersNow,
          impressions:           0,
          views:                 0,
          profile_views:         0,
          profile_links_taps:    0,
          website_clicks:        0,
          email_contacts:        0,
          phone_call_clicks:     0,
          text_message_clicks:   0,
          get_directions_clicks: 0,
        }, { onConflict: 'client_id,ig_user_id,date' })
    }

    // Agregado do período → snapshot em instagram_accounts.
    await admin
      .from('instagram_accounts')
      .update({
        last_sync_at:                    new Date().toISOString(),
        last_sync_status:                'success',
        last_sync_error:                 null,
        ig_username:                     accountInfo?.username ?? account.ig_username,
        last_period_since:               sinceStr,
        last_period_until:               untilStr,
        last_period_views:               aggregated.views,
        last_period_profile_views:       aggregated.profile_views,
        last_period_website_clicks:      aggregated.website_clicks,
        last_period_profile_links_taps:  aggregated.profile_links_taps,
        last_period_total_interactions:  aggregated.total_interactions,
        last_period_likes:               aggregated.likes,
        last_period_comments:            aggregated.comments,
        last_period_shares:              aggregated.shares,
        last_period_saves:               aggregated.saves,
        last_period_accounts_engaged:    aggregated.accounts_engaged,
      })
      .eq('client_id', clientId)
      .eq('ig_user_id', account.ig_user_id)

    revalidatePath(`/admin/clients/${clientId}/edit`)
    revalidatePath(`/traffic/dashboard/${clientId}/instagram`)
    revalidatePath('/client/instagram')
    revalidatePath(`/traffic/dashboard/${clientId}`)
    revalidatePath('/client/ads')

    return { ok: true as const, days: daily.length }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido'
    await admin
      .from('instagram_accounts')
      .update({
        last_sync_at:     new Date().toISOString(),
        last_sync_status: 'error',
        last_sync_error:  message.slice(0, 500),
      })
      .eq('client_id', clientId)
      .eq('ig_user_id', account.ig_user_id)

    return { error: message }
  }
}
