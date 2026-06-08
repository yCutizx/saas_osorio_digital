import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncIGFromGraph } from '@/app/actions/instagram-sync'

export const maxDuration = 300
export const dynamic     = 'force-dynamic'

export async function GET(request: Request) {
  const auth           = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return NextResponse.json({ error: 'CRON_SECRET não configurado' }, { status: 500 })
  }
  if (auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Clientes ativos com IG conectado (instagram_accounts.is_primary)
  const { data: accounts, error } = await admin
    .from('instagram_accounts')
    .select('client_id, clients!inner(id, name, active)')
    .eq('is_primary', true)

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar contas IG' }, { status: 500 })
  }

  type Result = {
    client_id:   string
    client_name: string
    ok:          boolean
    error?:      string
    days?:       number
  }

  const results: Result[] = []

  for (const row of accounts ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (row as any).clients
    if (!c?.active) continue

    try {
      const r = await syncIGFromGraph(admin, row.client_id, 7)
      if ('error' in r) {
        results.push({ client_id: row.client_id, client_name: c.name, ok: false, error: r.error })
      } else {
        results.push({ client_id: row.client_id, client_name: c.name, ok: true, days: r.days })
      }
    } catch (e) {
      results.push({
        client_id:   row.client_id,
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
