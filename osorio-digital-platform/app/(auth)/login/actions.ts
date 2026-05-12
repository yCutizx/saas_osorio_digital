'use server'

import { revalidatePath } from 'next/cache'
import { redirect }       from 'next/navigation'
import { headers }        from 'next/headers'
import { createClient }   from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies }        from 'next/headers'

const ROLE_REDIRECTS: Record<string, string> = {
  admin:           '/admin/dashboard',
  traffic_manager: '/traffic/dashboard',
  social_media:    '/social/dashboard',
  client:          '/client/home',
}

const GENERIC_ERROR = 'E-mail ou senha incorretos.'
const MAX_ATTEMPTS  = 5
const BLOCK_MS      = 30 * 60 * 1000 // 30 minutos

function getIp(): string {
  const h = headers()
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  )
}

export async function login(formData: FormData) {
  const email    = ((formData.get('email')    as string) ?? '').toLowerCase().trim()
  const password =  (formData.get('password') as string) ?? ''
  const ip       = getIp()
  const admin    = createAdminClient()

  // ── Verificação de bloqueio por tentativas excessivas ──────────────────────
  const windowStart = new Date(Date.now() - BLOCK_MS).toISOString()

  const { data: failures } = await admin
    .from('login_attempts')
    .select('created_at')
    .eq('email', email)
    .eq('success', false)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: true })

  if ((failures?.length ?? 0) >= MAX_ATTEMPTS) {
    const unlockAt  = new Date(failures![0].created_at).getTime() + BLOCK_MS
    const remaining = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000))
    const unit      = remaining === 1 ? 'minuto' : 'minutos'
    redirect(`/login?error=${encodeURIComponent(
      `Conta bloqueada por muitas tentativas. Tente novamente em ${remaining} ${unit}.`
    )}`)
  }

  // ── Autenticação ───────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Registrar falha (sem expor o motivo ao usuário)
    await admin.from('login_attempts').insert({ email, ip_address: ip, success: false })
    redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`)
  }

  // Registrar sucesso
  await admin.from('login_attempts').insert({ email, ip_address: ip, success: true })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Check MFA status — redirect if setup required or verification needed
  const admin2 = createAdminClient()
  const { data: mfa } = await admin2
    .from('user_mfa')
    .select('enabled')
    .eq('user_id', user!.id)
    .maybeSingle()

  if (!mfa?.enabled) {
    revalidatePath('/', 'layout')
    redirect('/mfa/setup')
  }

  // Clear stale mfa_verified so middleware re-checks
  cookies().delete('mfa_verified')

  // Check trusted device
  const deviceToken = cookies().get('trusted_device')?.value
  if (deviceToken) {
    const { data: device } = await admin2
      .from('trusted_devices')
      .select('id')
      .eq('user_id', user!.id)
      .eq('device_token', deviceToken)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (device) {
      // Device trusted — set mfa_verified and go to dashboard
      cookies().set('mfa_verified', user!.id, {
        httpOnly: true,
        sameSite: 'lax',
        path:     '/',
        secure:   process.env.NODE_ENV === 'production',
      })
      revalidatePath('/', 'layout')
      redirect(ROLE_REDIRECTS[profile?.role ?? ''] ?? '/login')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/mfa/verify')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email    = (formData.get('email') as string) ?? ''

  // Sempre tenta o reset mas nunca revela se o e-mail existe
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/reset-password`,
  })

  redirect('/login?success=' + encodeURIComponent(
    'Se este e-mail estiver cadastrado, você receberá as instruções em breve.'
  ))
}
