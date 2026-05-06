'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const RowSchema = z.object({
  campaign_name: z.string().min(1),
  status:        z.enum(['active', 'paused']),
  results:       z.number().int().min(0),
  reach:         z.number().int().min(0),
  spend:         z.number().min(0),
  impressions:   z.number().int().min(0),
  cpm:           z.number().min(0),
  clicks:        z.number().int().min(0),
  cpc:           z.number().min(0),
  ctr:           z.number().min(0),
  cpa:           z.number().min(0),
  result_type:   z.string(),
  period_start:  z.string().min(1),
  period_end:    z.string().min(1),
})

const DailyRowSchema = z.object({
  campaign_name: z.string().min(1),
  date:          z.string().min(1),
  spend:         z.number().min(0),
  impressions:   z.number().int().min(0),
  clicks:        z.number().int().min(0),
  results:       z.number().int().min(0),
})

export type ImportState = { message?: string; success?: boolean; saved?: number; skipped?: number }

export async function importMetaReportAction(
  clientId: string,
  grouped: unknown[],
  daily: unknown[],
): Promise<ImportState> {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'traffic_manager'].includes(profile?.role ?? ''))
    return { message: 'Acesso negado.' }

  if (!z.string().uuid().safeParse(clientId).success)
    return { message: 'Cliente inválido.' }

  const parsedGrouped = z.array(RowSchema).safeParse(grouped)
  if (!parsedGrouped.success)
    return { message: 'Dados inválidos: ' + parsedGrouped.error.issues[0]?.message }

  const parsedDaily = z.array(DailyRowSchema).safeParse(daily)
  if (!parsedDaily.success)
    return { message: 'Dados diários inválidos: ' + parsedDaily.error.issues[0]?.message }

  let saved   = 0
  let skipped = 0
  const errors: string[] = []

  // Mapa campaign_name → campaign_id (populado conforme upsert)
  const campaignIdMap = new Map<string, string>()

  for (const row of parsedGrouped.data) {
    // 1. Upsert campaign: insere se não existe, atualiza status se já existe
    const { data: camp, error: campErr } = await admin
      .from('campaigns')
      .upsert(
        { client_id: clientId, name: row.campaign_name, platform: 'meta', status: row.status },
        { onConflict: 'client_id,name,platform' },
      )
      .select('id')
      .single()

    if (campErr || !camp) {
      console.error('[import] campaign upsert error:', campErr?.message, row.campaign_name)
      errors.push(row.campaign_name)
      continue
    }
    const campaignId = camp.id
    campaignIdMap.set(row.campaign_name.toLowerCase(), campaignId)

    // 2. Verifica se já existe relatório para este período exato
    const { data: existingReport, error: repSelectErr } = await admin
      .from('traffic_reports')
      .select('id')
      .eq('client_id', clientId)
      .eq('campaign_id', campaignId)
      .eq('period_start', row.period_start)
      .eq('period_end', row.period_end)
      .maybeSingle()

    if (repSelectErr) {
      console.error('[import] report select error:', repSelectErr.message, row.campaign_name)
      errors.push(row.campaign_name)
      continue
    }

    if (existingReport) {
      skipped++
      continue
    }

    // 3. Insere novo relatório agregado
    const { error: repErr } = await admin.from('traffic_reports').insert({
      client_id:    clientId,
      campaign_id:  campaignId,
      period_start: row.period_start,
      period_end:   row.period_end,
      impressions:  row.impressions,
      clicks:       row.clicks,
      conversions:  row.results,
      spend:        row.spend,
      reach:        row.reach       || 0,
      result_type:  row.result_type || '',
      cpm:          row.cpm  || null,
      cpc:          row.cpc  || null,
      ctr:          row.ctr  || null,
    })

    if (repErr) {
      console.error('[import] report insert error:', repErr.message, row.campaign_name)
      errors.push(row.campaign_name)
    } else {
      saved++
    }
  }

  // 4. Insere dados diários em traffic_daily (upsert por date — ignora duplicatas)
  const dailyToInsert = parsedDaily.data
    .map((dr) => {
      const campaignId = campaignIdMap.get(dr.campaign_name.toLowerCase())
      if (!campaignId) return null
      return {
        client_id:   clientId,
        campaign_id: campaignId,
        date:        dr.date,
        spend:       dr.spend,
        impressions: dr.impressions,
        clicks:      dr.clicks,
        conversions: dr.results,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  console.log(`[import] daily rows to insert: ${dailyToInsert.length}`)

  if (dailyToInsert.length > 0) {
    const { error: dailyErr, count } = await admin
      .from('traffic_daily')
      .upsert(dailyToInsert, { onConflict: 'client_id,campaign_id,date', count: 'exact' })

    if (dailyErr) {
      console.error('[import] traffic_daily upsert error:', dailyErr.message)
      return { message: `Erro ao salvar dados diários (gráfico): ${dailyErr.message}` }
    }
    console.log(`[import] traffic_daily upserted: ${count ?? dailyToInsert.length} rows`)
  } else {
    console.warn('[import] dailyToInsert is empty — campaign name mismatch or no daily rows')
  }

  if (saved === 0 && skipped === 0)
    return { message: `Nenhum registro salvo.${errors.length ? ' Erros: ' + errors.join(', ') : ''}` }

  return { success: true, saved, skipped }
}

export async function clearClientDataAction(clientId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'traffic_manager'].includes(profile?.role ?? ''))
    return { error: 'Acesso negado.' }

  if (!z.string().uuid().safeParse(clientId).success)
    return { error: 'Cliente inválido.' }

  await admin.from('traffic_daily').delete().eq('client_id', clientId)
  await admin.from('traffic_reports').delete().eq('client_id', clientId)
  await admin.from('campaigns').delete().eq('client_id', clientId).eq('platform', 'meta')

  console.log(`[clear] dados de tráfego deletados para client_id=${clientId}`)
  return {}
}
