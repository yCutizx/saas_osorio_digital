'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  member_id: z.string().uuid(),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role:      z.enum(['traffic_manager', 'social_media'] as const),
  active:    z.string().optional(),
})

export type FormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  resetLink?: string
}

export async function updateTeamMemberAction(
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
    member_id: formData.get('member_id'),
    full_name: formData.get('full_name'),
    role:      formData.get('role'),
    active:    formData.get('active') ?? undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as FormState['errors'] }
  }

  const d         = result.data
  const clientIds = formData.getAll('client_ids') as string[]

  const { error } = await adminSupabase
    .from('profiles')
    .update({ full_name: d.full_name, role: d.role, active: d.active === 'on' })
    .eq('id', d.member_id)

  if (error) return { message: 'Erro ao atualizar: ' + error.message }

  // Reatribuir clientes — remove todas as atribuições de role do membro e reinsere
  await adminSupabase
    .from('client_assignments')
    .delete()
    .eq('user_id', d.member_id)
    .in('role', ['traffic_manager', 'social_media'])

  if (clientIds.length > 0) {
    await adminSupabase.from('client_assignments').insert(
      clientIds.map((clientId) => ({ client_id: clientId, user_id: d.member_id, role: d.role }))
    )
  }

  revalidatePath('/admin/team')
  revalidatePath(`/admin/team/${d.member_id}`)
  redirect(`/admin/team/${d.member_id}`)
}

export async function resetPasswordAction(
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

  const email = formData.get('email') as string

  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type:  'recovery',
    email,
  })

  if (error || !data) return { message: 'Erro ao gerar link: ' + (error?.message ?? 'desconhecido') }

  return { resetLink: (data as unknown as { properties: { action_link: string } }).properties?.action_link ?? '' }
}
