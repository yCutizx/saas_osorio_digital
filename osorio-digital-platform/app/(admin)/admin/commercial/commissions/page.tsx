import { format, startOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createAdminClient } from '@/lib/supabase/admin'
import { CommissionsKpiCards } from './kpi-cards'
import { CommissionsFilters } from './filters'
import { CommissionsTable, type CommissionRow } from './commissions-table'

interface PageProps {
  searchParams: {
    status?:    string
    seller_id?: string
    client_id?: string
    month?:     string  // yyyy-mm
  }
}

export default async function CommercialCommissionsPage({ searchParams }: PageProps) {
  const admin = createAdminClient()

  // Auth guard via layout pai (/admin/commercial/layout.tsx)
  const status   = searchParams.status   ?? 'all'
  const sellerId = searchParams.seller_id ?? 'all'
  const clientId = searchParams.client_id ?? 'all'
  const month    = searchParams.month    ?? 'all'

  const [
    { data: rawRows },
    { data: sellersList },
    { data: clientsList },
  ] = await Promise.all([
    admin.from('commission_invoices_with_meta').select('*'),
    admin
      .from('profiles')
      .select('id, full_name, email')
      .in('role', ['vendedor', 'sdr', 'closer'])
      .eq('active', true)
      .order('full_name'),
    admin.from('clients').select('id, name').order('name'),
  ])

  const allRows = (rawRows ?? []) as unknown as CommissionRow[]
  const sellers = sellersList ?? []
  const clients = clientsList ?? []

  // Aplica filtros
  const filtered = allRows.filter((r) => {
    if (status   !== 'all' && r.status         !== status)   return false
    if (sellerId !== 'all' && r.seller_user_id !== sellerId) return false
    if (clientId !== 'all' && r.client_id      !== clientId) return false
    if (month    !== 'all' && r.reference_month.slice(0, 7) !== month) return false
    return true
  })

  // KPIs (sobre o conjunto filtrado)
  const toPay = filtered
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + Number(r.commission_amount ?? 0), 0)
  const paid = filtered
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + Number(r.paid_amount ?? r.commission_amount ?? 0), 0)
  const canceledCount = filtered.filter((r) => r.status === 'canceled').length

  // Opções do filtro de mês (últimos 12 + atual + 1 futuro)
  const monthOptions: { value: string; label: string }[] = []
  for (let i = -12; i <= 1; i++) {
    const d = i < 0 ? subMonths(new Date(), -i) : addMonths(new Date(), i)
    const value = format(startOfMonth(d), 'yyyy-MM')
    const label = format(d, 'MMM/yy', { locale: ptBR })
    monthOptions.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }

  return (
    <div className="space-y-6">
      <CommissionsKpiCards
        toPay={toPay}
        paid={paid}
        canceledCount={canceledCount}
      />

      <CommissionsFilters
        status={status}
        sellerId={sellerId}
        clientId={clientId}
        month={month}
        sellers={sellers}
        clients={clients}
        months={monthOptions}
      />

      <CommissionsTable rows={filtered} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
