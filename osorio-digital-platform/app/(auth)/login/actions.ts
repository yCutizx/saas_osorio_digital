'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ROLE_REDIRECTS: Record<string, string> = {
  admin:           '/admin/dashboard',
  traffic_manager: '/traffic/dashboard',
  social_media:    '/social/dashboard',
  client:          '/client/home',
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const message = error.message === 'Invalid login credentials'
      ? 'E-mail ou senha incorretos.'
      : 'Ocorreu um erro. Tente novamente.'
    redirect(`/login?error=${encodeURIComponent(message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=Sessão+inválida')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const destination = profile?.role ? ROLE_REDIRECTS[profile.role] : '/login'

  revalidatePath('/', 'layout')
  redirect(destination ?? '/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent('Erro ao enviar e-mail. Verifique o endereço.')}`)
  }

  redirect('/login?success=E-mail+de+recuperação+enviado!')
}
