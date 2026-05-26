import { NextRequest, NextResponse } from 'next/server'
import { updateSession }  from '@/lib/supabase/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ORIGINS = [
  'https://app.osoriodigital.com.br',
  'http://localhost:3000',
  process.env.NEXT_PUBLIC_SITE_URL ?? '',
].filter(Boolean)

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options':  'nosniff',
  'X-Frame-Options':         'DENY',
  'X-XSS-Protection':        '1; mode=block',
  'Referrer-Policy':         'strict-origin-when-cross-origin',
  'Permissions-Policy':      'camera=(), microphone=(), geolocation=()',
  'Vary':                    'Accept-Encoding',
}

function applySecurity(response: NextResponse, requestId: string) {
  response.headers.set('X-Request-ID', requestId)
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(k, v)
  }
}

function applyCors(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin',  origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Signature')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  const requestId = crypto.randomUUID()
  const origin    = request.headers.get('origin') ?? ''
  const isApi     = pathname.startsWith('/api/')

  // ── API-specific guards ──────────────────────────────────────────────────────
  if (isApi) {
    // Block empty User-Agent (simple bot filter)
    const ua = request.headers.get('user-agent')
    if (!ua?.trim()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // CORS preflight
    if (method === 'OPTIONS') {
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new NextResponse(null, { status: 403 })
      }
      const res = new NextResponse(null, { status: 204 })
      if (origin) applyCors(res, origin)
      applySecurity(res, requestId)
      return res
    }
  }

  // ── Supabase session refresh ─────────────────────────────────────────────────
  const hasBearerAuth = request.headers.get('authorization')?.startsWith('Bearer ')
  let response: NextResponse
  let sessionUser: { id: string } | null = null

  if (isApi && hasBearerAuth) {
    response = NextResponse.next({ request })
  } else {
    const result = await updateSession(request)
    response    = result.supabaseResponse
    sessionUser = result.user
  }

  // ── Etapa 16 — Guard de /seller/* (roles comerciais + admin) ─────────────────
  // Roles comerciais (vendedor/sdr/closer) só acessam /seller/*. Admin entra
  // pra inspecionar. Outros roles → redirect pra /login (fail-safe).
  const isSellerRoute = pathname.startsWith('/seller/')
  if (isSellerRoute) {
    if (!sessionUser) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      const r = NextResponse.redirect(redirectUrl)
      applySecurity(r, requestId)
      return r
    }
    try {
      const admin = createAdminClient()
      const { data: profile } = await admin
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .maybeSingle()
      const role = profile?.role as string | undefined
      if (!role || !['admin', 'vendedor', 'sdr', 'closer'].includes(role)) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        const r = NextResponse.redirect(redirectUrl)
        applySecurity(r, requestId)
        return r
      }
    } catch { /* fail open — DB indisponível não trava acesso já autenticado */ }
  }

  // ── MFA enforcement (authenticated, non-API, non-MFA, non-auth routes) ───────
  const isMfaRoute  = pathname.startsWith('/mfa/')
  const isAuthRoute = pathname === '/login' || pathname.startsWith('/reset-password') || pathname === '/'
  const shouldCheck = sessionUser && !isApi && !isMfaRoute && !isAuthRoute

  if (shouldCheck) {
    const mfaVerified   = request.cookies.get('mfa_verified')?.value
    const alreadyPassed = mfaVerified === sessionUser!.id

    if (!alreadyPassed) {
      // Check trusted device before DB lookup for MFA status
      const deviceToken = request.cookies.get('trusted_device')?.value
      let trustedDevice = false

      if (deviceToken) {
        try {
          const admin = createAdminClient()
          const { data: device } = await admin
            .from('trusted_devices')
            .select('id')
            .eq('user_id', sessionUser!.id)
            .eq('device_token', deviceToken)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()
          trustedDevice = !!device
        } catch { /* ignore — fail open for device check, MFA check handles it */ }
      }

      if (trustedDevice) {
        // Stamp the mfa_verified cookie so future requests skip the DB
        response.cookies.set('mfa_verified', sessionUser!.id, {
          httpOnly: true,
          sameSite: 'lax',
          path:     '/',
          secure:   process.env.NODE_ENV === 'production',
        })
      } else {
        // Check if MFA is enabled
        try {
          const admin = createAdminClient()
          const { data: mfa } = await admin
            .from('user_mfa')
            .select('enabled')
            .eq('user_id', sessionUser!.id)
            .maybeSingle()

          const redirectTo = !mfa?.enabled ? '/mfa/setup' : '/mfa/verify'
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = redirectTo
          const redirectResponse = NextResponse.redirect(redirectUrl)
          applySecurity(redirectResponse, requestId)
          return redirectResponse
        } catch { /* fail open — don't block if DB is unreachable */ }
      }
    }
  }

  // ── Security headers on all responses ────────────────────────────────────────
  applySecurity(response, requestId)

  // ── CORS headers for API responses ───────────────────────────────────────────
  if (isApi && origin && ALLOWED_ORIGINS.includes(origin)) {
    applyCors(response, origin)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
