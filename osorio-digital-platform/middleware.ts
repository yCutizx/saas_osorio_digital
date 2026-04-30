import { NextResponse } from 'next/server'

const PUBLIC = ['/login', '/reset-password', '/_next', '/favicon.ico']

export function middleware(request: import('next/server').NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // @supabase/ssr stores the session in a cookie whose name contains "auth-token".
  // It may also be chunked (…auth-token.0, auth-token.1, …).
  const cookies = request.cookies.getAll()
  const hasSession = cookies.some((c) => c.name.includes('auth-token'))

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
