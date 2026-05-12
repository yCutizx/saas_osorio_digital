'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers, cookies }  from 'next/headers'
import { logger }            from '@/lib/logger'
import {
  generateMfaSecret,
  generateOtpAuthUrl,
  generateQrCodeDataUrl,
  verifyMfaCode,
  generateBackupCodes,
  hashBackupCode,
  generateDeviceToken,
  parseDeviceName,
} from '@/lib/mfa'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Não autenticado')
  return user
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export async function setupMfa(): Promise<{
  qrCodeDataUrl: string
  secret: string
  manualEntryKey: string
}> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const secret      = generateMfaSecret()
  const otpAuthUrl  = generateOtpAuthUrl(user.email!, secret)
  const qrCodeDataUrl = await generateQrCodeDataUrl(otpAuthUrl)

  const { error } = await admin
    .from('user_mfa')
    .upsert(
      { user_id: user.id, secret, enabled: false },
      { onConflict: 'user_id' }
    )

  if (error) {
    logger.error('mfa/setup: erro ao salvar segredo', { userId: user.id })
    throw new Error('Erro ao iniciar configuração do MFA. Tente novamente.')
  }

  logger.info('mfa/setup: segredo gerado', { userId: user.id })

  // Agrupa o segredo em blocos de 4 chars para facilitar entrada manual
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') ?? secret

  return { qrCodeDataUrl, secret, manualEntryKey }
}

// ─── Activate ─────────────────────────────────────────────────────────────────

export async function activateMfa(code: string): Promise<{
  success: boolean
  backupCodes: string[]
}> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const { data: mfa } = await admin
    .from('user_mfa')
    .select('secret')
    .eq('user_id', user.id)
    .single()

  if (!mfa?.secret) {
    logger.warn('mfa/activate: setup não iniciado', { userId: user.id })
    throw new Error('Configuração do MFA não encontrada. Inicie novamente.')
  }

  if (!verifyMfaCode(code, mfa.secret)) {
    logger.warn('mfa/activate: código inválido', { userId: user.id })
    throw new Error('Código inválido. Verifique o app autenticador e tente novamente.')
  }

  const { error: updateError } = await admin
    .from('user_mfa')
    .update({ enabled: true })
    .eq('user_id', user.id)

  if (updateError) {
    logger.error('mfa/activate: erro ao ativar', { userId: user.id })
    throw new Error('Erro ao ativar o MFA. Tente novamente.')
  }

  const backupCodes = generateBackupCodes(10)

  await admin.from('mfa_backup_codes').delete().eq('user_id', user.id)

  const { error: insertError } = await admin.from('mfa_backup_codes').insert(
    backupCodes.map((c) => ({
      user_id:   user.id,
      code_hash: hashBackupCode(c),
      used:      false,
    }))
  )

  if (insertError) {
    logger.error('mfa/activate: erro ao salvar backup codes', { userId: user.id })
    throw new Error('MFA ativado, mas houve um problema ao gerar os códigos de backup.')
  }

  // User just proved they have the authenticator — mark session as verified
  cookies().set('mfa_verified', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
  })

  logger.info('mfa/activate: MFA ativado com sucesso', { userId: user.id })
  return { success: true, backupCodes }
}

// ─── Verify (durante login) ───────────────────────────────────────────────────

export async function verifyMfaLogin(
  code: string,
  trustDevice: boolean
): Promise<{ success: boolean; deviceToken?: string }> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const { data: mfa } = await admin
    .from('user_mfa')
    .select('secret')
    .eq('user_id', user.id)
    .eq('enabled', true)
    .single()

  if (!mfa) {
    logger.warn('mfa/verify-login: MFA não ativo para o usuário', { userId: user.id })
    throw new Error('MFA não configurado para esta conta.')
  }

  if (!verifyMfaCode(code, mfa.secret)) {
    logger.warn('mfa/verify-login: código inválido', { userId: user.id })
    throw new Error('Código inválido. Tente novamente.')
  }

  logger.info('mfa/verify-login: código TOTP validado', { userId: user.id })

  // Set session-scoped mfa_verified cookie (value = userId for security)
  cookies().set('mfa_verified', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
  })

  if (!trustDevice) return { success: true }

  const h           = headers()
  const userAgent   = h.get('user-agent') ?? ''
  const deviceToken = generateDeviceToken()
  const deviceName  = parseDeviceName(userAgent)
  const expiresAt   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await admin.from('trusted_devices').insert({
    user_id:      user.id,
    device_token: deviceToken,
    device_name:  deviceName,
    last_used_at: new Date().toISOString(),
    expires_at:   expiresAt,
  })

  if (error) {
    logger.error('mfa/verify-login: erro ao salvar dispositivo confiável', { userId: user.id })
    return { success: true }
  }

  cookies().set('trusted_device', deviceToken, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   30 * 24 * 60 * 60,
  })

  logger.info('mfa/verify-login: dispositivo confiado registrado', { userId: user.id, deviceName })
  return { success: true, deviceToken }
}

// ─── Backup Code ──────────────────────────────────────────────────────────────

export async function verifyBackupCode(code: string): Promise<{ success: boolean }> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const codeHash = hashBackupCode(code)

  const { data: backup } = await admin
    .from('mfa_backup_codes')
    .select('id')
    .eq('user_id', user.id)
    .eq('code_hash', codeHash)
    .eq('used', false)
    .single()

  if (!backup) {
    logger.warn('mfa/backup-code: código inválido ou já utilizado', { userId: user.id })
    return { success: false }
  }

  const { error } = await admin
    .from('mfa_backup_codes')
    .update({ used: true })
    .eq('id', backup.id)

  if (error) {
    logger.error('mfa/backup-code: erro ao marcar código como usado', { userId: user.id })
    return { success: false }
  }

  cookies().set('mfa_verified', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
  })

  logger.info('mfa/backup-code: código de backup utilizado', { userId: user.id })
  return { success: true }
}

// ─── Disable ──────────────────────────────────────────────────────────────────

export async function disableMfa(currentCode: string): Promise<{ success: boolean }> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const { data: mfa } = await admin
    .from('user_mfa')
    .select('secret')
    .eq('user_id', user.id)
    .eq('enabled', true)
    .single()

  if (!mfa) {
    throw new Error('MFA não está ativo nesta conta.')
  }

  if (!verifyMfaCode(currentCode, mfa.secret)) {
    logger.warn('mfa/disable: código inválido', { userId: user.id })
    throw new Error('Código inválido. O MFA não foi desativado.')
  }

  await Promise.all([
    admin.from('user_mfa').delete().eq('user_id', user.id),
    admin.from('mfa_backup_codes').delete().eq('user_id', user.id),
    admin.from('trusted_devices').delete().eq('user_id', user.id),
  ])

  logger.info('mfa/disable: MFA desativado', { userId: user.id })
  return { success: true }
}

// ─── Trusted Devices ──────────────────────────────────────────────────────────

export async function listTrustedDevices(): Promise<{
  id: string
  device_name: string
  last_used_at: string
  expires_at: string
}[]> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const { data } = await admin
    .from('trusted_devices')
    .select('id, device_name, last_used_at, expires_at')
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .order('last_used_at', { ascending: false })

  return data ?? []
}

export async function revokeTrustedDevice(deviceId: string): Promise<{ success: boolean }> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const { error } = await admin
    .from('trusted_devices')
    .delete()
    .eq('id', deviceId)
    .eq('user_id', user.id)

  if (error) {
    logger.error('mfa/revoke-device: erro ao revogar', { userId: user.id, deviceId })
    throw new Error('Erro ao revogar o dispositivo.')
  }

  logger.info('mfa/revoke-device: dispositivo revogado', { userId: user.id, deviceId })
  return { success: true }
}

export async function checkTrustedDevice(deviceToken: string): Promise<boolean> {
  const user  = await getAuthUser()
  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { data: device } = await admin
    .from('trusted_devices')
    .select('id')
    .eq('user_id', user.id)
    .eq('device_token', deviceToken)
    .gt('expires_at', now)
    .single()

  if (!device) return false

  await admin
    .from('trusted_devices')
    .update({ last_used_at: now })
    .eq('id', device.id)

  return true
}
