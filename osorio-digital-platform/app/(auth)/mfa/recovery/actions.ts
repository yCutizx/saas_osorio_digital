'use server'

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger }            from '@/lib/logger'
import { Resend }            from 'resend'
import crypto                from 'crypto'

const resend    = new Resend(process.env.RESEND_API_KEY)
const FROM      = process.env.EMAIL_FROM ?? 'noreply@osoriodigital.com.br'
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const TOKEN_TTL = 15 * 60 * 1000 // 15 minutes

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Não autenticado')
  return user
}

export async function requestMfaRecovery(): Promise<{ success: boolean }> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const token     = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL).toISOString()

  // Invalidate old tokens
  await admin.from('mfa_recovery_tokens').delete().eq('user_id', user.id)

  const { error } = await admin.from('mfa_recovery_tokens').insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used:       false,
  })

  if (error) {
    logger.error('mfa/recovery-request: erro ao salvar token', { userId: user.id })
    throw new Error('Erro ao gerar o link de recuperação. Tente novamente.')
  }

  const link = `${APP_URL}/mfa/recovery/confirm?token=${token}`

  const { error: emailError } = await resend.emails.send({
    from:    FROM,
    to:      user.email!,
    subject: 'Recuperação de acesso MFA — Osório Digital',
    html: `
      <p>Olá,</p>
      <p>Você solicitou a recuperação do acesso MFA.</p>
      <p>Clique no link abaixo para desativar o MFA e recuperar o acesso à sua conta:</p>
      <p><a href="${link}">${link}</a></p>
      <p>Este link expira em 15 minutos.</p>
      <p>Se você não fez esta solicitação, ignore este e-mail.</p>
    `,
  })

  if (emailError) {
    logger.error('mfa/recovery-request: erro ao enviar email', { userId: user.id })
    throw new Error('Erro ao enviar o e-mail de recuperação. Tente novamente.')
  }

  logger.info('mfa/recovery-request: link enviado', { userId: user.id })
  return { success: true }
}

export async function confirmMfaRecovery(token: string): Promise<{ success: boolean }> {
  const user  = await getAuthUser()
  const admin = createAdminClient()

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const now       = new Date().toISOString()

  const { data: record } = await admin
    .from('mfa_recovery_tokens')
    .select('id')
    .eq('user_id', user.id)
    .eq('token_hash', tokenHash)
    .eq('used', false)
    .gt('expires_at', now)
    .maybeSingle()

  if (!record) {
    logger.warn('mfa/recovery-confirm: token inválido ou expirado', { userId: user.id })
    throw new Error('Link de recuperação inválido ou expirado.')
  }

  await Promise.all([
    admin.from('mfa_recovery_tokens').update({ used: true }).eq('id', record.id),
    admin.from('user_mfa').delete().eq('user_id', user.id),
    admin.from('mfa_backup_codes').delete().eq('user_id', user.id),
    admin.from('trusted_devices').delete().eq('user_id', user.id),
  ])

  logger.info('mfa/recovery-confirm: MFA removido por recuperação', { userId: user.id })
  return { success: true }
}
