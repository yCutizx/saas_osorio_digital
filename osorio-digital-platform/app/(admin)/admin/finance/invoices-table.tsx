import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Ban, Receipt } from 'lucide-react'
import { InvoiceStatusPill } from '@/components/finance/invoice-status-pill'
import { MarkAsPaidModal } from './mark-as-paid-modal'
import { formatBRL } from '@/lib/finance'
import type { FinancialInvoiceLive } from '@/types'

interface ClientMap { [id: string]: string }

interface Props {
  invoices: FinancialInvoiceLive[]
  clients:  ClientMap
}

const STATUS_ORDER: Record<string, number> = {
  overdue:  0,
  pending:  1,
  paid:     2,
  canceled: 3,
}

export function InvoicesTable({ invoices, clients }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl bg-[#111] border border-white/5 p-10 text-center">
        <Receipt className="h-7 w-7 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">Nenhuma fatura encontrada com esses filtros.</p>
      </div>
    )
  }

  // Ordena: overdue (desc days_overdue) → pending (asc due_date) → paid → canceled
  const sorted = [...invoices].sort((a, b) => {
    const ra = STATUS_ORDER[a.effective_status] ?? 99
    const rb = STATUS_ORDER[b.effective_status] ?? 99
    if (ra !== rb) return ra - rb
    if (a.effective_status === 'overdue') return b.days_overdue - a.days_overdue
    return a.due_date.localeCompare(b.due_date)
  })

  return (
    <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Faturas</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['Cliente', 'Ref.', 'Vence', 'Valor', 'Status', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((inv) => {
              const clientName = clients[inv.client_id] ?? '—'
              const refLabel   = format(parseISO(inv.reference_month), 'MM/yyyy', { locale: ptBR })
              const dueLabel   = format(parseISO(inv.due_date),        'dd/MM/yyyy', { locale: ptBR })
              return (
                <tr key={inv.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{clientName}</td>
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{refLabel}</td>
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{dueLabel}</td>
                  <td className="px-4 py-3 text-white tabular-nums whitespace-nowrap">{formatBRL(Number(inv.amount))}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <InvoiceStatusPill
                      status={inv.effective_status}
                      daysOverdue={inv.days_overdue}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(inv.effective_status === 'pending' || inv.effective_status === 'overdue') && (
                      <MarkAsPaidModal
                        invoice={{
                          id:              inv.id,
                          client_name:     clientName,
                          reference_month: inv.reference_month,
                          due_date:        inv.due_date,
                          amount:          Number(inv.amount),
                        }}
                      />
                    )}
                    {inv.effective_status === 'paid' && inv.paid_at && (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-green-400/70"
                        title={`Pago em ${format(parseISO(inv.paid_at.slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR })}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {inv.effective_status === 'canceled' && (
                      <span className="inline-flex items-center gap-1 text-xs text-white/30" title="Cancelada">
                        <Ban className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
