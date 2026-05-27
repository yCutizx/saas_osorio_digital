'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const Schema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email:     z.string().email('E-mail inválido'),
  role:      z.enum(['vendedor', 'sdr', 'closer'] as const),
  password:  z.string().min(8, 'Mínimo de 8 caracteres').optional().or(z.literal('')),
})

export type FormState = {
  errors?:  Partial<Record<string, string[]>>
  message?: string
}

export async function createCommercialSellerAction(
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
    full_name: formData.get('full_name'),
    email:     formData.get('email'),
    role:      formData.get('role'),
    password:  formData.get('password') || '',
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as FormState['errors'] }
  }

  const d       = result.data
  const tempPwd = d.password || generateTempPassword()

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email:         d.email,
    password:      tempPwd,
    email_confirm: true,
    user_metadata: { full_name: d.full_name, role: d.role },
  })

  if (authErr || !authData.user) {
    const msg = authErr?.message?.includes('already been registered')
      ? 'Já existe um usuário com esse e-mail.'
      : 'Erro ao criar usuário: ' + (authErr?.message ?? 'erro desconhecido')
    return { message: msg }
  }

  // Garante role/nome corretos (trigger pode ter criado com defaults)
  const { error: upErr } = await admin
    .from('profiles')
    .update({ role: d.role, full_name: d.full_name })
    .eq('id', authData.user.id)

  if (upErr) {
    return { message: 'Usuário criado mas erro ao definir função: ' + upErr.message }
  }

  revalidatePath('/admin/commercial/team')
  revalidatePath('/admin/commercial')
  redirect(`/admin/commercial/team?created=1&name=${encodeURIComponent(d.full_name)}&pwd=${encodeURIComponent(tempPwd)}`)
}

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '@#$!'
  const all = upper + lower + digits + special
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)]
  for (let i = 4; i < 12; i++) pwd += all[Math.floor(Math.random() * all.length)]
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}
