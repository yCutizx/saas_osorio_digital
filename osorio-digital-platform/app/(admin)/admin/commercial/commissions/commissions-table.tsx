import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Ban, HandCoins, Phone, Handshake, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/finance'
import {
  formatCommissionStatus,
  getCommissionStatusColor,
  getSellerRoleLabel,
} from '@/lib/commissions'
import { MarkPaidModal } from './mark-paid-modal'
import { CancelModal } from './cancel-modal'
import type { CommissionStatus, SellerRole } from '@/types'

export interface CommissionRow {
  id:                  string
  seller_user_id:      string
  client_id:           string
  source_invoice_id:   string
  source_seller_role:  SellerRole
  source_month_index:  number
  base_amount:         number
  commission_pct:      number | null
  commission_fixed:    number | null
  commission_amount:   number
  status:              CommissionStatus
  paid_at:             string | null
  paid_amount:         number | null
  paid_by:             string | null
  payment_method:      string | null
  notes:               string | null
  created_at:          string
  updated_at:          string
  seller_name:         string | null
  seller_email:        string
  client_name:         string
  reference_month:     string
  source_paid_at:      string | null
}

const ROLE_CONFIG: Record<SellerRole, { icon: React.ElementType; classes: string }> = {
  vendedor: { icon: HandCoins, classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  sdr:      { icon: Phone,     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  closer:   { icon: Handshake, classes: 'bg-green-500/15 text-green-400 border-green-500/25' },
}

const STATUS_ORDER: Record<CommissionStatus, number> = {
  pending:  0,
  paid:     1,
  canceled: 2,
}

interface Props {
  rows: CommissionRow[]
}

export function CommissionsTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-[#111] border border-white/5 p-10 text-center">
        <Receipt className="h-7 w-7 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">Nenhuma comissão encontrada com esses filtros.</p>
      </div>
    )
  }

  // pending (asc created_at) → paid (desc paid_at) → canceled (desc updated_at)
  const sorted = [...rows].sort((a, b) => {
    const ra = STATUS_ORDER[a.status] ?? 99
    const rb = STATUS_ORDER[b.status] ?? 99
    if (ra !== rb) return ra - rb
    if (a.status === 'pending') return a.created_at.localeCompare(b.created_at)
    if (a.status === 'paid')    return (b.paid_at ?? '').localeCompare(a.paid_at ?? '')
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
  })

  return (
    <div className="rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Comissões</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['Vendedor', 'Papel', 'Cliente', 'Ref.', 'Mês', 'Base', 'Comissão', 'Status', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((r) => {
              const roleConf = ROLE_CONFIG[r.source_seller_role] ?? ROLE_CONFIG.vendedor
              const RoleIcon = roleConf.icon
              const refLabel = format(parseISO(r.reference_month), 'MM/yyyy', { locale: ptBR })
              return (
                <tr key={r.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="text-white font-medium truncate">{r.seller_name ?? '—'}</p>
                    <p className="text-[10px] text-white/40 truncate">{r.seller_email}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium', roleConf.classes)}>
                      <RoleIcon className="h-3 w-3" />
                      {getSellerRoleLabel(r.source_seller_role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/80 max-w-[180px] truncate">{r.client_name}</td>
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">{refLabel}</td>
                  <td className="px-4 py-3 text-white/70 whitespace-nowrap">Mês {r.source_month_index}</td>
                  <td className="px-4 py-3 text-white/70 tabular-nums whitespace-nowrap">{formatBRL(Number(r.base_amount))}</td>
                  <td className="px-4 py-3 text-[#EACE00] font-semibold tabular-nums whitespace-nowrap">
                    {formatBRL(Number(r.commission_amount))}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', getCommissionStatusColor(r.status))}>
                      {formatCommissionStatus(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <MarkPaidModal
                          commission={{
                            id:                r.id,
                            seller_name:       r.seller_name ?? r.seller_email,
                            client_name:       r.client_name,
                            reference_month:   r.reference_month,
                            commission_amount: Number(r.commission_amount),
                          }}
                        />
                        <CancelModal commissionId={r.id} />
                      </div>
                    )}
                    {r.status === 'paid' && r.paid_at && (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-green-400/70"
                        title={`Pago em ${format(parseISO(r.paid_at.slice(0, 10)), 'dd/MM/yyyy', { locale: ptBR })}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {r.status === 'canceled' && (
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
