'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  testAdAccountAccess,
  fetchAccountInsights,
  fetchCampaignStatus,
  fetchAccountReachForPeriod,
  fetchAdAccountTimezone,
  parseMetaNumber,
  extractConversionsAndRevenue,
} from '@/lib/meta-ads'

/**
 * YYYY-MM-DD na timezone especificada (ex: 'America/Sao_Paulo'). Fallback pra
 * ISO UTC se a TZ for inválida ou Intl não estiver disponível.
 */
function formatDateInTZ(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

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

  if (!profile || !['admin', 'traffic_manager'].includes(profile.role)) {
    return { error: 'Sem permissão' as const }
  }
  return { user, profile, admin }
}

export async function testMetaConnectionAction(adAccountId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!adAccountId || !adAccountId.trim()) return { error: 'Ad Account ID obrigatório' }

  const result = await testAdAccountAccess(adAccountId.trim())
  if (!result.ok) return { error: result.error ?? 'Erro desconhecido' }
  return { ok: true as const, account_name: result.name }
}

export async function connectMetaAccountAction(clientId: string, adAccountId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }
  if (!clientId || !adAccountId.trim()) return { error: 'Dados obrigatórios faltando' }

  const test = await testAdAccountAccess(adAccountId.trim())
  if (!test.ok) return { error: `Conta inválida: ${test.error}` }

  const normalized = adAccountId.trim().startsWith('act_')
    ? adAccountId.trim()
    : `act_${adAccountId.trim()}`

  // Busca timezone da conta (best-effort — usada no sync pra alinhar since/until)
  const accountTimezone = await fetchAdAccountTimezone(normalized)

  const { error } = await ctx.admin
    .from('clients')
    .update({
      meta_ad_account_id: normalized,
      meta_account_timezone: accountTimezone,
      meta_connected_at: new Date().toISOString(),
      meta_last_sync_status: null,
      meta_last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) return { error: 'Erro ao salvar' }

  revalidatePath(`/admin/clients/${clientId}/edit`)
  revalidatePath('/admin/clients')
  return { ok: true as const, account_name: test.name }
}

export async function disconnectMetaAccountAction(clientId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }

  await ctx.admin
    .from('clients')
    .update({
      meta_ad_account_id: null,
      meta_business_id: null,
      meta_connected_at: null,
      meta_last_sync_at: null,
      meta_last_sync_status: null,
      meta_last_sync_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  revalidatePath(`/admin/clients/${clientId}/edit`)
  revalidatePath('/admin/clients')
  return { ok: true as const }
}

export async function syncMetaAccountNowAction(clientId: string, daysBack = 30) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }
  return syncClientFromMeta(ctx.admin, clientId, daysBack)
}

/** Sincronização ampla pra recompor histórico (90 dias) — usada pós Etapa 12. */
export async function syncMetaAccountHistoryAction(clientId: string) {
  const ctx = await getAdminCtx()
  if ('error' in ctx) return { error: ctx.error }
  return syncClientFromMeta(ctx.admin, clientId, 90)
}

/**
 * Função pura — usada pela action manual e pelo cron.
 * Não chama auth: o caller (action OR cron) já validou permissão.
 */
export async function syncClientFromMeta(
  admin: AdminClient,
  clientId: string,
  daysBack: number,
): Promise<{ ok: true; campaigns: number; rows: number } | { error: string }> {
  const { data: client, error: clientErr } = await admin
    .from('clients')
    .select('id, name, meta_ad_account_id, meta_account_timezone')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) return { error: 'Cliente não encontrado' }
  if (!client.meta_ad_account_id) return { error: 'Cliente não conectado à Meta' }

  await admin
    .from('clients')
    .update({ meta_last_sync_status: 'pending', meta_last_sync_error: null })
    .eq('id', clientId)

  try {
    // Calcula since/until na TZ da Ad Account (fallback BRT) — evita pular um
    // dia quando o cron/manual roda em UTC e o cliente está em BRT.
    const accountTz = client.meta_account_timezone ?? 'America/Sao_Paulo'
    const until = new Date()
    const since = new Date()
    since.setDate(since.getDate() - daysBack)
    const sinceStr = formatDateInTZ(since, accountTz)
    const untilStr = formatDateInTZ(until, accountTz)

    const [campaignsStatus, insights] = await Promise.all([
      fetchCampaignStatus(client.meta_ad_account_id),
      fetchAccountInsights({
        adAccountId: client.meta_ad_account_id,
        since: sinceStr,
        until: untilStr,
      }),
    ])

    // Upsert de campanhas — guarda optimization_goal + objective pra usar no extractor
    const campaignIdMap = new Map<string, {
      dbId:              string
      optimization_goal: string | null
      objective:         string | null
    }>()

    for (const cs of campaignsStatus) {
      const platformStatus: 'active' | 'paused' | 'finished' =
        cs.status === 'ACTIVE' ? 'active' :
        cs.status === 'PAUSED' ? 'paused' :
        'finished'

      const { data: existing } = await admin
        .from('campaigns')
        .select('id')
        .eq('client_id', clientId)
        .eq('name', cs.name)
        .eq('platform', 'meta')
        .maybeSingle()

      if (existing) {
        await admin
          .from('campaigns')
          .update({
            status: platformStatus,
            objective: cs.objective,
            optimization_goal: cs.optimization_goal,
            start_date: cs.start_time ? cs.start_time.slice(0, 10) : null,
            end_date: cs.stop_time ? cs.stop_time.slice(0, 10) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        campaignIdMap.set(cs.id, {
          dbId: existing.id,
          optimization_goal: cs.optimization_goal,
          objective: cs.objective,
        })
      } else {
        const { data: created } = await admin
          .from('campaigns')
          .insert({
            client_id: clientId,
            name: cs.name,
            platform: 'meta',
            status: platformStatus,
            objective: cs.objective,
            optimization_goal: cs.optimization_goal,
            start_date: cs.start_time ? cs.start_time.slice(0, 10) : null,
            end_date: cs.stop_time ? cs.stop_time.slice(0, 10) : null,
          })
          .select('id')
          .single()
        if (created) {
          campaignIdMap.set(cs.id, {
            dbId: created.id,
            optimization_goal: cs.optimization_goal,
            objective: cs.objective,
          })
        }
      }
    }

    // Agregado por campanha pra traffic_reports
    type Agg = {
      spend: number
      impressions: number
      reach: number
      clicks: number
      conversions: number
      revenue: number
      period_start: string
      period_end: string
      result_type: string | null
    }
    const periodAgg = new Map<string, Agg>()

    let dailyRows = 0

    for (const row of insights) {
      const campaignInfo = campaignIdMap.get(row.campaign_id)
      if (!campaignInfo) continue
      const campaignDbId = campaignInfo.dbId

      const { conversions, revenue, result_type } = extractConversionsAndRevenue(
        row,
        campaignInfo.optimization_goal,
        campaignInfo.objective,
      )

      await admin
        .from('traffic_daily')
        .upsert({
          client_id:   clientId,
          campaign_id: campaignDbId,
          date:        row.date_start,
          result_type,
          spend:       parseMetaNumber(row.spend),
          impressions: Math.round(parseMetaNumber(row.impressions)),
          clicks:      Math.round(parseMetaNumber(row.clicks)),
          conversions: Math.round(conversions),
        }, { onConflict: 'client_id,campaign_id,date' })

      dailyRows++

      const key = `${campaignDbId}|${sinceStr}|${untilStr}`
      const current = periodAgg.get(key) ?? {
        spend: 0, impressions: 0, reach: 0, clicks: 0,
        conversions: 0, revenue: 0,
        period_start: sinceStr, period_end: untilStr,
        result_type,
      }
      current.spend       += parseMetaNumber(row.spend)
      current.impressions += parseMetaNumber(row.impressions)
      current.reach        = Math.max(current.reach, parseMetaNumber(row.reach))
      current.clicks      += parseMetaNumber(row.clicks)
      current.conversions += conversions
      current.revenue     += revenue
      if (!current.result_type && result_type) current.result_type = result_type
      periodAgg.set(key, current)
    }

    for (const [key, agg] of periodAgg) {
      const [campaignDbId, ps, pe] = key.split('|')

      const ctr  = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0
      const cpc  = agg.clicks > 0 ? agg.spend / agg.clicks : 0
      const cpm  = agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0
      const roas = agg.spend > 0 && agg.revenue > 0 ? agg.revenue / agg.spend : null

      const { data: existingReport } = await admin
        .from('traffic_reports')
        .select('id')
        .eq('client_id', clientId)
        .eq('campaign_id', campaignDbId)
        .eq('period_start', ps)
        .eq('period_end', pe)
        .maybeSingle()

      if (existingReport) {
        await admin
          .from('traffic_reports')
          .update({
            spend:       agg.spend,
            impressions: Math.round(agg.impressions),
            clicks:      Math.round(agg.clicks),
            conversions: Math.round(agg.conversions),
            revenue:     agg.revenue || null,
            reach:       Math.round(agg.reach),
            cpm, cpc, ctr, roas,
            result_type: agg.result_type,
          })
          .eq('id', existingReport.id)
      } else {
        await admin.from('traffic_reports').insert({
          client_id:    clientId,
          campaign_id:  campaignDbId,
          period_start: ps,
          period_end:   pe,
          spend:        agg.spend,
          impressions:  Math.round(agg.impressions),
          clicks:       Math.round(agg.clicks),
          conversions:  Math.round(agg.conversions),
          revenue:      agg.revenue || null,
          reach:        Math.round(agg.reach),
          cpm, cpc, ctr, roas,
          result_type:  agg.result_type,
        })
      }
    }

    // Reach único do período inteiro (sem time_increment) — Etapa 13 fix.
    // Best-effort: se falhar, sync continua sem desestabilizar.
    const periodReach = await fetchAccountReachForPeriod({
      adAccountId: client.meta_ad_account_id,
      since: sinceStr,
      until: untilStr,
    })

    const finalPayload: Record<string, unknown> = {
      meta_last_sync_at: new Date().toISOString(),
      meta_last_sync_status: 'success',
      meta_last_sync_error: null,
    }
    if (periodReach) {
      finalPayload.meta_last_period_reach       = Math.round(periodReach.reach)
      finalPayload.meta_last_period_frequency   = periodReach.frequency
      finalPayload.meta_last_period_impressions = Math.round(periodReach.impressions)
      finalPayload.meta_last_period_since       = sinceStr
      finalPayload.meta_last_period_until       = untilStr
    }

    await admin
      .from('clients')
      .update(finalPayload)
      .eq('id', clientId)

    revalidatePath(`/admin/clients/${clientId}/edit`)
    revalidatePath(`/traffic/dashboard/${clientId}`)
    revalidatePath('/client/ads')

    return { ok: true as const, campaigns: campaignIdMap.size, rows: dailyRows }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido'
    await admin
      .from('clients')
      .update({
        meta_last_sync_at: new Date().toISOString(),
        meta_last_sync_status: 'error',
        meta_last_sync_error: message.slice(0, 500),
      })
      .eq('id', clientId)

    revalidatePath(`/admin/clients/${clientId}/edit`)
    return { error: message }
  }
}
