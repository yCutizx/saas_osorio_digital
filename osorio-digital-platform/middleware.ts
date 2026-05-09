import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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
  // Skip for API routes using Bearer auth (server-to-server webhooks)
  const hasBearerAuth = request.headers.get('authorization')?.startsWith('Bearer ')
  let response: NextResponse

  if (isApi && hasBearerAuth) {
    response = NextResponse.next({ request })
  } else {
    const { supabaseResponse } = await updateSession(request)
    response = supabaseResponse
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
