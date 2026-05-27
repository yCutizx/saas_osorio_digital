'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  seller_id: z.string().uuid(),
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role:      z.enum(['vendedor', 'sdr', 'closer'] as const),
})

export type FormState = {
  errors?:  Partial<Record<string, string[]>>
  message?: string
  ok?:      boolean
}

export async function updateCommercialSellerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { message: 'Acesso negado.' }

  const result = Schema.safeParse({
    seller_id: formData.get('seller_id'),
    full_name: formData.get('full_name'),
    role:      formData.get('role'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as FormState['errors'] }
  }

  const d = result.data

  // Confirma que o alvo é seller comercial
  const { data: target } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', d.seller_id)
    .maybeSingle()
  if (!target || !['vendedor', 'sdr', 'closer'].includes(target.role)) {
    return { message: 'Profile inválido ou fora do escopo comercial.' }
  }

  const { error } = await admin
    .from('profiles')
    .update({
      full_name:  d.full_name,
      role:       d.role,
      updated_at: new Date().toISOString(),
    })
    .eq('id', d.seller_id)

  if (error) return { message: 'Erro ao salvar: ' + error.message }

  revalidatePath('/admin/commercial/team')
  revalidatePath(`/admin/commercial/team/${d.seller_id}`)
  revalidatePath(`/admin/commercial/team/${d.seller_id}/edit`)
  revalidatePath('/admin/commercial')
  return { ok: true }
}
