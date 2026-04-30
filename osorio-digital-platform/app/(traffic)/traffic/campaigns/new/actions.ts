'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({
  client_id:      z.string().uuid('Selecione um cliente'),
  name:           z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  platform:       z.enum(['meta', 'google', 'tiktok', 'linkedin', 'other'] as const),
  objective:      z.string().optional(),
  budget_monthly: z.coerce.number().min(0).optional(),
  start_date:     z.string().optional(),
  end_date:       z.string().optional(),
})

export type FormState = {
  errors?: Partial<Record<keyof z.infer<typeof Schema>, string[]>>
  message?: string
}

export async function createCampaignAction(
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
    client_id:      formData.get('client_id'),
    name:           formData.get('name'),
    platform:       formData.get('platform'),
    objective:      formData.get('objective') || undefined,
    budget_monthly: formData.get('budget_monthly') || undefined,
    start_date:     formData.get('start_date') || undefined,
    end_date:       formData.get('end_date') || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as FormState['errors'] }
  }

  const d = result.data

  const { error } = await supabase.from('campaigns').insert({
    client_id:      d.client_id,
    name:           d.name,
    platform:       d.platform,
    objective:      d.objective ?? null,
    budget_monthly: d.budget_monthly ?? null,
    start_date:     d.start_date ?? null,
    end_date:       d.end_date ?? null,
    status:         'active',
  })

  if (error) {
    return { message: 'Erro ao criar campanha: ' + error.message }
  }

  redirect('/traffic/campaigns')
}
