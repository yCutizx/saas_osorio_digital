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
 * Conecta uma conta IG a um cliente. Faz 1 chamada extra pra validar
 * account_type aqui (movido do discovery — evita N+1 calls no listing).
 * Rejeita Personal.
 */
export async function connectIGAccountAction(opts: {
  clientId:    string
  igUserId:    string
  igUsername:  string
  pageId:      string
  pageName:    string
}) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  let accountKind: 'business' | 'creator' | null = null
  try {
    const info = await fetchIGAccountInfo(opts.igUserId)
    if      (info?.account_type === 'BUSINESS')      accountKind = 'business'
    else if (info?.account_type === 'MEDIA_CREATOR') accountKind = 'creator'
  } catch (e) {
    console.warn('[connectIGAccountAction] erro buscando account_type:', e)
  }

  if (!accountKind) {
    return {
      error: 'Conta IG precisa ser Business ou Creator (não Personal). Verifique nas configurações do Instagram.',
    }
  }

  const { error } = await ctx.admin
    .from('instagram_accounts')
    .upsert({
      client_id:         opts.clientId,
      ig_user_id:        opts.igUserId,
      ig_username:       opts.igUsername,
      account_kind:      accountKind,
      page_id:           opts.pageId,
      page_name:         opts.pageName,
      connected_at:      new Date().toISOString(),
      last_sync_status:  null,
      last_sync_error:   null,
      is_primary:        true,
      updated_at:        new Date().toISOString(),
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
    since.setDate(since.getDate() - Math.min(daysBack, 30))

    const sinceStr = since.toISOString().slice(0, 10)
    const untilStr = until.toISOString().slice(0, 10)

    const insights = await fetchIGProfileInsights({
      igUserId: account.ig_user_id,
      since:    sinceStr,
      until:    untilStr,
    })

    // Snapshot atual de followers — Meta não expõe histórico per-day fora de
    // contas muito grandes, então gravamos o número de "agora" em todas as
    // linhas do sync. Cron diário cria pontos suficientes pra evolução.
    const accountInfo = await fetchIGAccountInfo(account.ig_user_id)
    const followersNow = accountInfo?.followers_count ?? 0

    for (const row of insights) {
      await admin
        .from('instagram_daily')
        .upsert({
          client_id:             clientId,
          ig_user_id:            account.ig_user_id,
          date:                  row.date,
          impressions:           row.impressions,
          views:                 row.views,
          reach:                 row.reach,
          profile_views:         row.profile_views,
          profile_links_taps:    row.profile_links_taps,
          website_clicks:        row.website_clicks,
          follower_count:        followersNow,
          email_contacts:        row.email_contacts,
          phone_call_clicks:     row.phone_call_clicks,
          text_message_clicks:   row.text_message_clicks,
          get_directions_clicks: row.get_directions_clicks,
        }, { onConflict: 'client_id,ig_user_id,date' })
    }

    await admin
      .from('instagram_accounts')
      .update({
        last_sync_at:     new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error:  null,
        ig_username:      accountInfo?.username ?? account.ig_username,
      })
      .eq('client_id', clientId)
      .eq('ig_user_id', account.ig_user_id)

    revalidatePath(`/admin/clients/${clientId}/edit`)
    revalidatePath(`/traffic/dashboard/${clientId}/instagram`)
    revalidatePath('/client/instagram')
    revalidatePath(`/traffic/dashboard/${clientId}`)
    revalidatePath('/client/ads')

    return { ok: true as const, days: insights.length }
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
