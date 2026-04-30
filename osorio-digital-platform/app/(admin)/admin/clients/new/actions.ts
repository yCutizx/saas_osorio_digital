'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  company_name:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  industry:            z.string().min(1, 'Selecione um segmento'),
  contact_email:       z.string().email('E-mail inválido'),
  contact_phone:       z.string().optional(),
  password:            z.string().min(8, 'Mínimo de 8 caracteres.').optional().or(z.literal('')),
  plan:                z.enum(['basico', 'pro', 'premium'] as const),
  traffic_manager_id:  z.string().uuid('Selecione um gestor de tráfego'),
  social_media_id:     z.string().uuid('Selecione um social media'),
})

export type FormState = {
  errors?: Partial<Record<keyof z.infer<typeof Schema>, string[]>>
  message?: string
}

export async function createClientAction(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  // Verificar que o usuário logado é admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { message: 'Acesso negado.' }

  // Validar campos
  const result = Schema.safeParse({
    company_name:       formData.get('company_name'),
    industry:           formData.get('industry'),
    contact_email:      formData.get('contact_email'),
    contact_phone:      formData.get('contact_phone') || undefined,
    password:           formData.get('password') || '',
    plan:               formData.get('plan'),
    traffic_manager_id: formData.get('traffic_manager_id'),
    social_media_id:    formData.get('social_media_id'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as FormState['errors'] }
  }

  const d = result.data

  // 1. Criar registro do cliente
  const { data: clientRecord, error: clientErr } = await supabase
    .from('clients')
    .insert({
      name:          d.company_name,
      industry:      d.industry,
      contact_email: d.contact_email,
      contact_phone: d.contact_phone ?? null,
      plan:          d.plan,
      active:        true,
    })
    .select('id')
    .single()

  if (clientErr || !clientRecord) {
    return { message: 'Erro ao salvar cliente: ' + (clientErr?.message ?? 'erro desconhecido') }
  }

  // 2. Criar usuário no Supabase Auth
  const tempPassword = d.password || generateTempPassword()

  const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
    email:         d.contact_email,
    password:      tempPassword,
    email_confirm: true,
    user_metadata: { full_name: d.company_name, role: 'client' },
  })

  if (authErr || !authData.user) {
    // Desfaz criação do cliente se o usuário já existe ou outro erro
    await adminSupabase.from('clients').delete().eq('id', clientRecord.id)
    const msg = authErr?.message?.includes('already been registered')
      ? 'Já existe um usuário com esse e-mail.'
      : 'Erro ao criar acesso do cliente: ' + (authErr?.message ?? 'erro desconhecido')
    return { message: msg }
  }

  // 3. Garantir que o perfil foi criado com role correto
  await adminSupabase
    .from('profiles')
    .update({ role: 'client', full_name: d.company_name })
    .eq('id', authData.user.id)

  // 4. Criar vínculos (cliente ↔ equipe responsável)
  const { error: assignErr } = await adminSupabase
    .from('client_assignments')
    .insert([
      { client_id: clientRecord.id, user_id: authData.user.id, role: 'client' },
      { client_id: clientRecord.id, user_id: d.traffic_manager_id, role: 'traffic_manager' },
      { client_id: clientRecord.id, user_id: d.social_media_id,    role: 'social_media' },
    ])

  if (assignErr) {
    // Não é crítico — cliente foi criado, apenas log
    console.error('Erro ao criar atribuições:', assignErr.message)
  }

  // 5. Redirecionar com senha temporária para exibir uma única vez
  redirect(
    `/admin/clients?created=1&email=${encodeURIComponent(d.contact_email)}&pwd=${encodeURIComponent(tempPassword)}`
  )
}

function generateTempPassword(): string {
  const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$!'
  const all     = upper + lower + digits + special

  // Garante pelo menos um de cada tipo
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)]

  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)]
  }

  // Embaralha para não ter padrão previsível
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}
