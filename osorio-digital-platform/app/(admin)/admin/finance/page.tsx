import { format, parseISO, startOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { KpiCards } from './kpi-cards'
import { FinanceFilters } from './finance-filters'
import { InvoicesTable } from './invoices-table'
import { FinanceCharts, type MRRPoint, type PaymentsPoint } from './finance-charts'
import { computeMRR, todayBRT, parseYMD } from '@/lib/finance'
import type { FinancialInvoiceLive } from '@/types'

interface PageProps {
  searchParams: {
    status?:    string
    client_id?: string
    month?:     string  // yyyy-mm
  }
}

export default async function AdminFinancePage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  // ── Filtros ──────────────────────────────────────────────────────────────
  const status   = searchParams.status   ?? 'all'
  const clientId = searchParams.client_id ?? 'all'
  const month    = searchParams.month    ?? 'all'

  // ── Fetch ────────────────────────────────────────────────────────────────
  const [
    { data: contracts },
    { data: clientList },
    { data: rawInvoices },
  ] = await Promise.all([
    admin.from('financial_contracts').select('id, client_id, monthly_value, status').eq('status', 'active'),
    admin.from('clients').select('id, name').order('name'),
    admin.from('financial_invoices_live').select('*'),
  ])

  const activeContracts = contracts ?? []
  const clients         = clientList ?? []
  const allInvoices     = (rawInvoices ?? []) as unknown as FinancialInvoiceLive[]

  const clientNameMap: Record<string, string> = {}
  for (const c of clients) clientNameMap[c.id] = c.name

  // Aplica filtros pra tabela
  const filtered = allInvoices.filter((inv) => {
    if (status !== 'all'   && inv.effective_status !== status) return false
    if (clientId !== 'all' && inv.client_id !== clientId)      return false
    if (month !== 'all'    && inv.reference_month.slice(0, 7) !== month) return false
    return true
  })

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const mrr           = computeMRR(activeContracts.map((c) => ({ monthly_value: Number(c.monthly_value) })))
  const today         = todayBRT()
  const { year, month: m } = parseYMD(today)
  const currentMonthKey = `${year}-${String(m).padStart(2, '0')}`

  const paidThisMonth = allInvoices.filter(
    (i) => i.effective_status === 'paid' && i.paid_at?.slice(0, 7) === currentMonthKey,
  )
  const receivedMonth      = paidThisMonth.reduce((s, i) => s + Number(i.paid_amount ?? i.amount), 0)
  const receivedMonthCount = paidThisMonth.length

  const toReceiveList   = allInvoices.filter((i) => i.effective_status === 'pending' && i.reference_month.slice(0, 7) === currentMonthKey)
  const toReceive       = toReceiveList.reduce((s, i) => s + Number(i.amount), 0)
  const toReceiveCount  = toReceiveList.length

  const overdueList     = allInvoices.filter((i) => i.effective_status === 'overdue')
  const overdueTotal    = overdueList.reduce((s, i) => s + Number(i.amount), 0)
  const overdueCount    = overdueList.length

  const atRiskList      = overdueList.filter((i) => i.days_overdue > 15)
  const atRisk          = atRiskList.reduce((s, i) => s + Number(i.amount), 0)
  const atRiskCount     = atRiskList.length

  // ── Opções dos filtros ──────────────────────────────────────────────────
  const monthOptions: { value: string; label: string }[] = []
  for (let i = -12; i <= 1; i++) {
    const d = i < 0 ? subMonths(new Date(), -i) : addMonths(new Date(), i)
    const value = format(startOfMonth(d), 'yyyy-MM')
    const label = format(d, "MMM/yy", { locale: ptBR })
    monthOptions.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }

  // ── Charts: últimos 6 meses ──────────────────────────────────────────────
  const mrrData: MRRPoint[]         = []
  const paymentsData: PaymentsPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const d        = subMonths(new Date(), i)
    const ymKey    = format(startOfMonth(d), 'yyyy-MM')
    const label    = format(d, 'MMM/yy', { locale: ptBR })
    const labelCap = label.charAt(0).toUpperCase() + label.slice(1)

    // MRR histórico = soma das invoices do mês (proxy razoável; reflect real)
    const mrrForMonth = allInvoices
      .filter((inv) => inv.reference_month.slice(0, 7) === ymKey && inv.effective_status !== 'canceled')
      .reduce((s, inv) => s + Number(inv.amount), 0)
    mrrData.push({ month: labelCap, mrr: mrrForMonth })

    // Pagamentos do mês de referência: pagos no prazo (paid_at <= due_date) vs após
    const ofMonth = allInvoices.filter((inv) => inv.reference_month.slice(0, 7) === ymKey)
    let emDia    = 0
    let atrasado = 0
    for (const inv of ofMonth) {
      if (inv.effective_status === 'paid') {
        const paidDate = inv.paid_at?.slice(0, 10) ?? null
        const due      = inv.due_date
        if (paidDate && paidDate <= due) emDia    += Number(inv.paid_amount ?? inv.amount)
        else                              atrasado += Number(inv.paid_amount ?? inv.amount)
      } else if (inv.effective_status === 'overdue') {
        atrasado += Number(inv.amount)
      }
    }
    paymentsData.push({ month: labelCap, em_dia: emDia, atrasado })
  }

  return (
    <AppLayout pageTitle="Financeiro">
      <div className="space-y-5">
        <KpiCards
          mrr={mrr}
          receivedMonth={receivedMonth}
          receivedMonthCount={receivedMonthCount}
          toReceive={toReceive}
          toReceiveCount={toReceiveCount}
          overdue={overdueTotal}
          overdueCount={overdueCount}
          atRisk={atRisk}
          atRiskCount={atRiskCount}
        />

        <FinanceFilters
          status={status}
          clientId={clientId}
          month={month}
          clients={clients}
          months={monthOptions}
        />

        <InvoicesTable invoices={filtered} clients={clientNameMap} />

        <FinanceCharts mrrData={mrrData} paymentsData={paymentsData} />

        {/* footer "última atualização" */}
        <p className="text-xs text-white/30 text-right">
          Status atualizados em tempo real (view live). Geração mensal automática às 03h BRT do dia 1.
        </p>
      </div>
    </AppLayout>
  )
}

// Evita pré-render em build: depende de auth/banco
export const dynamic = 'force-dynamic'

// silence unused import (parseISO usado indiretamente nos filhos via lib)
void parseISO
