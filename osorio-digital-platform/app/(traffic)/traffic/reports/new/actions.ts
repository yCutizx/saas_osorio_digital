'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({
  client_id:    z.string().uuid('Selecione um cliente'),
  campaign_id:  z.string().uuid('Selecione uma campanha'),
  period_start: z.string().min(1, 'Data inicial obrigatória'),
  period_end:   z.string().min(1, 'Data final obrigatória'),
  impressions:  z.coerce.number().int().min(0),
  clicks:       z.coerce.number().int().min(0),
  conversions:  z.coerce.number().int().min(0),
  spend:        z.coerce.number().min(0, 'Valor inválido'),
  revenue:      z.coerce.number().min(0).optional(),
}).refine((d) => d.period_end >= d.period_start, {
  message: 'Data final deve ser igual ou posterior à inicial',
  path: ['period_end'],
})

export type FormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
}

export async function createReportAction(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'traffic_manager'].includes(profile?.role ?? '')) {
    return { message: 'Acesso negado.' }
  }

  const result = Schema.safeParse({
    client_id:    formData.get('client_id'),
    campaign_id:  formData.get('campaign_id'),
    period_start: formData.get('period_start'),
    period_end:   formData.get('period_end'),
    impressions:  formData.get('impressions'),
    clicks:       formData.get('clicks'),
    conversions:  formData.get('conversions'),
    spend:        formData.get('spend'),
    revenue:      formData.get('revenue') || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const d = result.data

  // Calcular métricas derivadas
  const cpm  = d.impressions > 0 ? (d.spend / d.impressions) * 1000 : null
  const cpc  = d.clicks > 0 ? d.spend / d.clicks : null
  const ctr  = d.impressions > 0 ? d.clicks / d.impressions : null
  const roas = d.spend > 0 && d.revenue ? d.revenue / d.spend : null

  const { error } = await supabase.from('traffic_reports').insert({
    client_id:    d.client_id,
    campaign_id:  d.campaign_id,
    period_start: d.period_start,
    period_end:   d.period_end,
    impressions:  d.impressions,
    clicks:       d.clicks,
    conversions:  d.conversions,
    spend:        d.spend,
    revenue:      d.revenue ?? null,
    cpm,
    cpc,
    ctr,
    roas,
  })

  if (error) {
    return { message: 'Erro ao salvar relatório: ' + error.message }
  }

  redirect(`/traffic/dashboard?client=${d.client_id}&period=30`)
}
