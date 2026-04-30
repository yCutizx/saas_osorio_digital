import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/reset-password']

/**
 * Middleware minimalista para Edge Runtime da Vercel.
 *
 * Não usa @supabase/ssr nem faz chamadas de rede — apenas verifica a
 * presença do cookie de sessão do Supabase para proteger rotas privadas.
 * A validação real do JWT e do papel do usuário ocorre nos Server Components
 * de cada página via createClient() + supabase.auth.getUser().
 *
 * Cookies criados por @supabase/ssr seguem o padrão:
 *   sb-<project-ref>-auth-token          (token completo)
 *   sb-<project-ref>-auth-token.0 / .1   (token dividido em chunks)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas — sempre acessíveis
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Verifica se existe algum cookie de sessão do Supabase
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
