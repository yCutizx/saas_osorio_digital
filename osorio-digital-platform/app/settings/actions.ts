'use server'

import { revalidatePath }    from 'next/cache'
import { redirect }          from 'next/navigation'
import { cookies }           from 'next/headers'
import { z }                 from 'zod'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifyMfaCode,
  generateBackupCodes,
  hashBackupCode,
} from '@/lib/mfa'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ─── Profile ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome muito curto').max(80, 'Nome muito longo'),
  bio: z.string().trim().max(280, 'Bio até 280 caracteres').optional().or(z.literal('')),
})

export async function updateProfile(input: { full_name: string; bio: string }) {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name:  parsed.data.full_name,
      bio:        parsed.data.bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('[settings] updateProfile error', error)
    return { success: false, error: 'Erro ao salvar perfil' }
  }

  revalidatePath('/settings/profile')
  return { success: true }
}

// ─── Email ────────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email inválido'),
})

export async function updateEmail(input: { email: string }) {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const parsed = emailSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  if (parsed.data.email === user.email) {
    return { success: false, error: 'Este já é seu email atual' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email })
  if (error) {
    console.error('[settings] updateEmail error', error)
    return { success: false, error: 'Erro ao iniciar troca de email' }
  }

  return {
    success: true,
    message: 'Enviamos um link de confirmação pro novo email. Clique nele para concluir a troca.',
  }
}

// ─── Password ─────────────────────────────────────────────────────────────────

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword:     z.string().min(8, 'Senha precisa ter no mínimo 8 caracteres'),
})

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  const user = await getAuthUser()
  if (!user?.email) return { success: false, error: 'Não autenticado' }

  const parsed = passwordSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return { success: false, error: 'A nova senha deve ser diferente da atual' }
  }

  const supabase = await createClient()

  // Re-authenticate to verify current password
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email:    user.email,
    password: parsed.data.currentPassword,
  })
  if (signInErr) {
    return { success: false, error: 'Senha atual incorreta' }
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateErr) {
    console.error('[settings] changePassword error', updateErr)
    return { success: false, error: 'Erro ao trocar senha' }
  }

  return { success: true, message: 'Senha alterada com sucesso' }
}

// ─── MFA: Regenerate backup codes ────────────────────────────────────────────

export async function regenerateBackupCodes(totpCode: string) {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const admin = createAdminClient()

  const { data: mfaRow } = await admin
    .from('user_mfa')
    .select('secret, enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mfaRow?.enabled) {
    return { success: false, error: 'MFA não está ativo' }
  }

  if (!verifyMfaCode(totpCode, mfaRow.secret)) {
    return { success: false, error: 'Código inválido' }
  }

  await admin.from('mfa_backup_codes').delete().eq('user_id', user.id)

  const newCodes = generateBackupCodes()
  await admin.from('mfa_backup_codes').insert(
    newCodes.map((code) => ({
      user_id:   user.id,
      code_hash: hashBackupCode(code),
      used:      false,
    }))
  )

  return { success: true, backupCodes: newCodes }
}

// ─── MFA: Reset (forces re-setup on next login) ───────────────────────────────

export async function resetMfa(totpCode: string) {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  const admin = createAdminClient()

  const { data: mfaRow } = await admin
    .from('user_mfa')
    .select('secret, enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mfaRow?.enabled) {
    return { success: false, error: 'MFA não está ativo' }
  }

  if (!verifyMfaCode(totpCode, mfaRow.secret)) {
    return { success: false, error: 'Código inválido' }
  }

  await Promise.all([
    admin.from('user_mfa').delete().eq('user_id', user.id),
    admin.from('mfa_backup_codes').delete().eq('user_id', user.id),
    admin.from('trusted_devices').delete().eq('user_id', user.id),
  ])

  cookies().delete('mfa_verified')
  cookies().delete('trusted_device')

  redirect('/mfa/setup')
}
