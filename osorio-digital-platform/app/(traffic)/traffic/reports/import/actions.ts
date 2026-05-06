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

export type ImportState = { message?: string; success?: boolean; saved?: number; skipped?: number }

export async function importMetaReportAction(
  clientId: string,
  rows: unknown[],
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

  const parsed = z.array(RowSchema).safeParse(rows)
  if (!parsed.success)
    return { message: 'Dados inválidos: ' + parsed.error.issues[0]?.message }

  let saved   = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of parsed.data) {
    // 1. Find or create campaign by (client_id, name, platform)
    let campaignId: string

    const { data: existingCamp } = await admin
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId)
      .eq('name', row.campaign_name)
      .eq('platform', 'meta')
      .maybeSingle()

    if (existingCamp) {
      campaignId = existingCamp.id
      await admin.from('campaigns').update({ status: row.status }).eq('id', campaignId)
    } else {
      const { data: newCamp, error: campErr } = await admin
        .from('campaigns')
        .insert({ client_id: clientId, name: row.campaign_name, platform: 'meta', status: row.status })
        .select('id')
        .single()

      if (campErr || !newCamp) { errors.push(row.campaign_name); continue }
      campaignId = newCamp.id
    }

    // 2. Check if report already exists for this exact period
    const { data: existingReport } = await admin
      .from('traffic_reports')
      .select('id')
      .eq('client_id', clientId)
      .eq('campaign_id', campaignId)
      .eq('period_start', row.period_start)
      .eq('period_end', row.period_end)
      .maybeSingle()

    if (existingReport) {
      skipped++
      continue
    }

    // 3. Insert new report for this period
    const { error: repErr } = await admin.from('traffic_reports').insert({
      client_id:    clientId,
      campaign_id:  campaignId,
      period_start: row.period_start,
      period_end:   row.period_end,
      impressions:  row.impressions,
      clicks:       row.clicks,
      conversions:  row.results,
      spend:        row.spend,
      cpm:          row.cpm  || null,
      cpc:          row.cpc  || null,
      ctr:          row.ctr  || null,
    })

    if (repErr) errors.push(row.campaign_name)
    else saved++
  }

  if (saved === 0 && skipped === 0)
    return { message: `Nenhum registro salvo.${errors.length ? ' Erros: ' + errors.join(', ') : ''}` }

  return { success: true, saved, skipped }
}
