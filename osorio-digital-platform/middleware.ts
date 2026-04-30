import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Rotas públicas (acessíveis sem login)
const PUBLIC_ROUTES = ['/login', '/reset-password']

// Rotas por papel de usuário
const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin/dashboard',
  traffic_manager: '/traffic/dashboard',
  social_media: '/social/dashboard',
  client: '/client/home',
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  // Se não está logado e a rota não é pública → redireciona para login
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Se está logado e tenta acessar rota pública → redireciona para seu dashboard
  if (user && isPublicRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role as string | undefined
    const destination = role ? ROLE_ROUTES[role] : '/login'

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = destination ?? '/login'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Ignora arquivos estáticos e internos do Next.js
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
