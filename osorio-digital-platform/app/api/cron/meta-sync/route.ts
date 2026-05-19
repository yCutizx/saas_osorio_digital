import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncClientFromMeta } from '@/app/actions/meta-sync'

export const maxDuration = 300 // Hobby caps at 60s, Pro permite 300s
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const expectedSecret = process.env.META_CRON_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: 'META_CRON_SECRET não configurado' }, { status: 500 })
  }

  if (auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: clients, error } = await admin
    .from('clients')
    .select('id, name')
    .not('meta_ad_account_id', 'is', null)
    .eq('active', true)

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }

  const results: Array<{
    client_id: string
    client_name: string
    ok: boolean
    error?: string
    campaigns?: number
    rows?: number
  }> = []

  // Sequential para evitar rate limit da Meta
  for (const c of clients ?? []) {
    try {
      const r = await syncClientFromMeta(admin, c.id, 7)
      if ('error' in r) {
        results.push({ client_id: c.id, client_name: c.name, ok: false, error: r.error })
      } else {
        results.push({
          client_id:   c.id,
          client_name: c.name,
          ok:          true,
          campaigns:   r.campaigns,
          rows:        r.rows,
        })
      }
    } catch (e) {
      results.push({
        client_id:   c.id,
        client_name: c.name,
        ok:          false,
        error:       e instanceof Error ? e.message : 'Erro inesperado',
      })
    }
  }

  return NextResponse.json({
    timestamp:     new Date().toISOString(),
    total_clients: results.length,
    success_count: results.filter((r) => r.ok).length,
    error_count:   results.filter((r) => !r.ok).length,
    results,
  })
}
