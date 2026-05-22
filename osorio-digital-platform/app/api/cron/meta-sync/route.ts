import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncClientFromMeta } from '@/app/actions/meta-sync'
import {
  generateMonthlyInvoices,
  notifyUpcomingInvoices,
  notifyOverdueInvoices,
} from '@/app/actions/financial'

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

  // Etapa 15 — Módulo Financeiro (rodam ANTES do sync Meta; isoladas em
  // try/catch pra não bloquear sync se uma falhar)
  let financeGen: unknown = null
  let financeUpc: unknown = null
  let financeOvd: unknown = null

  try {
    financeGen = await generateMonthlyInvoices(admin)
    console.log('[finance cron] generateMonthlyInvoices:', financeGen)
  } catch (e) {
    console.error('[finance cron] generateMonthlyInvoices ERRO:', e instanceof Error ? e.message : e)
  }

  try {
    financeUpc = await notifyUpcomingInvoices(admin)
    console.log('[finance cron] notifyUpcomingInvoices:', financeUpc)
  } catch (e) {
    console.error('[finance cron] notifyUpcomingInvoices ERRO:', e instanceof Error ? e.message : e)
  }

  try {
    financeOvd = await notifyOverdueInvoices(admin)
    console.log('[finance cron] notifyOverdueInvoices:', financeOvd)
  } catch (e) {
    console.error('[finance cron] notifyOverdueInvoices ERRO:', e instanceof Error ? e.message : e)
  }

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
    finance: {
      generated: financeGen,
      upcoming:  financeUpc,
      overdue:   financeOvd,
    },
  })
}
