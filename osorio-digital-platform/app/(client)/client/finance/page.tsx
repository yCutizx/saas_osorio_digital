import { Receipt } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireMinPlan } from '@/lib/client-plan'
import { ClientFinanceHeroCard, type ClientFinanceState } from './client-finance-hero-card'
import { ClientInvoiceHistory } from './client-invoice-history'
import type { FinancialInvoiceLive } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ClientFinancePage() {
  await requireMinPlan('basico')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assignment } = await supabase
    .from('client_assignments')
    .select('client_id')
    .eq('user_id', user.id)
    .eq('role', 'client')
    .single()

  const clientId = assignment?.client_id

  if (!clientId) {
    return (
      <AppLayout pageTitle="Financeiro">
        <EmptyContractCard />
      </AppLayout>
    )
  }

  const admin = createAdminClient()

  const [
    { data: clientRow },
    { data: contracts },
    { data: rawInvoices },
  ] = await Promise.all([
    admin.from('clients').select('id, name').eq('id', clientId).single(),
    admin.from('financial_contracts').select('id, status').eq('client_id', clientId).eq('status', 'active').maybeSingle(),
    admin.from('financial_invoices_live')
      .select('*')
      .eq('client_id', clientId)
      .order('reference_month', { ascending: false })
      .limit(12),
  ])

  if (!contracts) {
    return (
      <AppLayout pageTitle="Financeiro">
        <EmptyContractCard />
      </AppLayout>
    )
  }

  const allInvoices = (rawInvoices ?? []) as unknown as FinancialInvoiceLive[]

  // Invoice "atual" = primeira overdue OU primeira pending (mais próxima do vencimento)
  const overdue = allInvoices.filter((i) => i.effective_status === 'overdue')
                              .sort((a, b) => b.days_overdue - a.days_overdue)[0]
  const pending = allInvoices.filter((i) => i.effective_status === 'pending')
                              .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]

  const current = overdue ?? pending ?? null

  let heroState: ClientFinanceState = 'em_dia'
  if (current) {
    if (current.effective_status === 'overdue') {
      heroState = 'atrasado'
    } else {
      const daysUntilDue = differenceInDays(parseISO(current.due_date), new Date())
      heroState = daysUntilDue <= 3 ? 'a_vencer' : 'em_dia'
    }
  }

  const history = allInvoices.slice(0, 6)

  return (
    <AppLayout pageTitle="Financeiro">
      <div className="space-y-5">
        {current ? (
          <ClientFinanceHeroCard
            state={heroState}
            clientName={clientRow?.name ?? 'Cliente'}
            amount={Number(current.amount)}
            dueDate={current.due_date}
            daysOverdue={current.days_overdue}
          />
        ) : (
          <div className="rounded-2xl bg-[#111] border border-white/5 p-6 text-center">
            <Receipt className="h-6 w-6 text-white/20 mx-auto mb-2" />
            <p className="text-white/60 text-sm">Nenhuma fatura em aberto no momento.</p>
          </div>
        )}

        <ClientInvoiceHistory invoices={history} />
      </div>
    </AppLayout>
  )
}

function EmptyContractCard() {
  return (
    <div className="rounded-2xl bg-[#111] border border-white/5 p-10 text-center max-w-md mx-auto">
      <Receipt className="h-7 w-7 text-white/20 mx-auto mb-3" />
      <h3 className="text-white font-semibold mb-1">Nenhum contrato ativo</h3>
      <p className="text-white/40 text-sm">Fale com seu gestor pra detalhes.</p>
    </div>
  )
}
