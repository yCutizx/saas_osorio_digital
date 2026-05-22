import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InvoiceStatusPill } from '@/components/finance/invoice-status-pill'
import { formatBRL } from '@/lib/finance'
import type { FinancialInvoiceLive } from '@/types'

interface Props {
  invoices: FinancialInvoiceLive[]
}

export function ClientInvoiceHistory({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl bg-[#111] border border-white/5 p-6 text-center">
        <Receipt className="h-6 w-6 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">Sem histórico de faturas ainda.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Histórico</h3>
      </div>
      <ul className="divide-y divide-white/5">
        {invoices.map((inv) => {
          const refLabel  = format(parseISO(inv.reference_month), 'MM/yyyy', { locale: ptBR })
          const paidLabel = inv.paid_at
            ? format(parseISO(inv.paid_at.slice(0, 10)), "dd/MM/yyyy", { locale: ptBR })
            : null
          return (
            <li
              key={inv.id}
              className={cn(
                'flex items-center justify-between gap-3 px-5 py-3 text-sm',
                inv.effective_status === 'overdue' && 'bg-red-500/5 border-l-2 border-red-500/40',
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-white/70 font-medium tabular-nums">{refLabel}</span>
                <span className="text-[#EACE00] tabular-nums">{formatBRL(Number(inv.amount))}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {paidLabel && (
                  <span className="text-xs text-white/40 hidden sm:inline">Pago em {paidLabel}</span>
                )}
                <InvoiceStatusPill
                  status={inv.effective_status}
                  daysOverdue={inv.days_overdue}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
