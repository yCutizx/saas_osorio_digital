'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  client_id:          z.string().uuid(),
  company_name:       z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  industry:           z.string().min(1, 'Selecione um segmento'),
  contact_email:      z.string().email('E-mail inválido'),
  contact_phone:      z.string().optional(),
  plan:               z.enum(['basico', 'pro', 'premium'] as const),
  active:             z.string().optional(),
  contract_status:    z.enum(['ativo', 'pausado', 'encerrado'] as const),
  monthly_value:      z.string().optional(),
  renewal_date:       z.string().optional(),
  notes:              z.string().optional(),
  traffic_manager_id: z.string().uuid('Selecione um gestor de tráfego'),
  social_media_id:    z.string().uuid('Selecione um social media'),
})

export type FormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
}

export async function updateClientAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { message: 'Acesso negado.' }

  const result = Schema.safeParse({
    client_id:          formData.get('client_id'),
    company_name:       formData.get('company_name'),
    industry:           formData.get('industry'),
    contact_email:      formData.get('contact_email'),
    contact_phone:      formData.get('contact_phone') || undefined,
    plan:               formData.get('plan'),
    active:             formData.get('active') ?? undefined,
    contract_status:    formData.get('contract_status'),
    monthly_value:      (formData.get('monthly_value') as string) || undefined,
    renewal_date:       (formData.get('renewal_date') as string) || undefined,
    notes:              (formData.get('notes') as string) || undefined,
    traffic_manager_id: formData.get('traffic_manager_id'),
    social_media_id:    formData.get('social_media_id'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as FormState['errors'] }
  }

  const d = result.data

  const { error: clientErr } = await adminSupabase
    .from('clients')
    .update({
      name:            d.company_name,
      industry:        d.industry,
      contact_email:   d.contact_email,
      contact_phone:   d.contact_phone ?? null,
      plan:            d.plan,
      active:          d.active === 'on',
      contract_status: d.contract_status,
      monthly_value:   d.monthly_value ? parseFloat(d.monthly_value) : null,
      renewal_date:    d.renewal_date || null,
      notes:           d.notes ?? null,
    })
    .eq('id', d.client_id)

  if (clientErr) return { message: 'Erro ao atualizar cliente: ' + clientErr.message }

  // Reatribuir equipe: remove existentes e insere novos
  await adminSupabase
    .from('client_assignments')
    .delete()
    .eq('client_id', d.client_id)
    .in('role', ['traffic_manager', 'social_media'])

  await adminSupabase
    .from('client_assignments')
    .insert([
      { client_id: d.client_id, user_id: d.traffic_manager_id, role: 'traffic_manager' },
      { client_id: d.client_id, user_id: d.social_media_id,    role: 'social_media'    },
    ])

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${d.client_id}`)
  redirect(`/admin/clients/${d.client_id}`)
}
