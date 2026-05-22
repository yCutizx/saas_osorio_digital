import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign, Receipt, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { InvoiceStatusPill } from './invoice-status-pill'
import { ContractForm } from './contract-form'
import { TransactionModal } from './transaction-modal'
import { formatBRL, getContractStatusLabel } from '@/lib/finance'
import type { FinancialContract, FinancialInvoiceLive, FinancialTransaction, TransactionType } from '@/types'

interface Props {
  clientId: string
}

const TX_TYPE_LABEL: Record<TransactionType, string> = {
  income:     'Receita',
  expense:    'Despesa',
  refund:     'Reembolso',
  adjustment: 'Ajuste',
}

/** income/refund inflam o caixa; expense/adjustment podem ser positivo ou negativo. */
function isPositive(type: TransactionType): boolean {
  return type === 'income' || type === 'refund'
}

export async function FinancialSection({ clientId }: Props) {
  const admin = createAdminClient()

  const [
    { data: rawContract },
    { data: rawInvoices },
    { data: rawTransactions },
  ] = await Promise.all([
    admin.from('financial_contracts')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    admin.from('financial_invoices_live')
      .select('*')
      .eq('client_id', clientId)
      .order('reference_month', { ascending: false })
      .limit(12),
    admin.from('financial_transactions')
      .select('*')
      .eq('client_id', clientId)
      .order('transaction_date', { ascending: false })
      .limit(10),
  ])

  const contract     = (rawContract     ?? null) as FinancialContract | null
  const invoices     = (rawInvoices     ?? []) as unknown as FinancialInvoiceLive[]
  const transactions = (rawTransactions ?? []) as unknown as FinancialTransaction[]

  return (
    <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#EACE00]" />
          <h3 className="text-sm font-semibold text-[#F5F5F0]">Financeiro</h3>
        </div>
        <div className="flex items-center gap-2">
          <ContractForm clientId={clientId} existingContract={contract} />
          <TransactionModal
            clientId={clientId}
            invoices={invoices.map((i) => ({
              id:    i.id,
              label: `${format(parseISO(i.reference_month), 'MM/yyyy', { locale: ptBR })} · ${formatBRL(Number(i.amount))}`,
            }))}
          />
        </div>
      </div>

      {/* Contrato vigente */}
      {contract ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Valor mensal"     value={formatBRL(Number(contract.monthly_value))} icon={TrendingUp} accent />
          <Stat label="Dia de vencimento" value={`Dia ${contract.billing_day}`}            icon={Receipt} />
          <Stat label="Início"            value={format(parseISO(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })} icon={Receipt} />
          <Stat label="Status"            value={getContractStatusLabel(contract.status)}  icon={Receipt} />
        </div>
      ) : (
        <div className="rounded-lg bg-[#0A0A0A] border border-[#222] p-4 text-center">
          <p className="text-white/50 text-sm">Nenhum contrato ativo. Clique em <strong className="text-[#EACE00]">Criar contrato</strong> pra começar.</p>
        </div>
      )}

      {contract?.notes && (
        <div className="rounded-lg bg-[#0A0A0A] border border-[#222] p-3 text-xs text-white/60">
          <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Observação</span>
          <p className="whitespace-pre-wrap">{contract.notes}</p>
        </div>
      )}

      {/* Histórico de faturas */}
      <div>
        <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Histórico de faturas</h4>
        {invoices.length === 0 ? (
          <p className="text-white/40 text-xs">Sem faturas ainda.</p>
        ) : (
          <ul className="divide-y divide-[#222] rounded-lg border border-[#222] overflow-hidden">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[#0A0A0A]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-white/70 tabular-nums">{format(parseISO(inv.reference_month), 'MM/yyyy', { locale: ptBR })}</span>
                  <span className="text-[#EACE00] tabular-nums">{formatBRL(Number(inv.amount))}</span>
                  <span className="text-white/30 text-xs hidden sm:inline">vence {format(parseISO(inv.due_date), 'dd/MM', { locale: ptBR })}</span>
                </div>
                <InvoiceStatusPill status={inv.effective_status} daysOverdue={inv.days_overdue} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Transações */}
      <div>
        <h4 className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Transações extras</h4>
        {transactions.length === 0 ? (
          <p className="text-white/40 text-xs">Nenhuma transação lançada.</p>
        ) : (
          <ul className="divide-y divide-[#222] rounded-lg border border-[#222] overflow-hidden">
            {transactions.map((tx) => {
              const positive = isPositive(tx.type)
              const Icon     = positive ? ArrowUpRight : ArrowDownRight
              return (
                <li key={tx.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[#0A0A0A]">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${positive ? 'text-green-400' : 'text-red-400'}`} />
                    <span className="text-white/60 text-xs">{format(parseISO(tx.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">{TX_TYPE_LABEL[tx.type]}</span>
                    <span className="text-white/70 truncate">{tx.description}</span>
                  </div>
                  <span className={`tabular-nums font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
                    {positive ? '+' : '−'}{formatBRL(Number(tx.amount))}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function Stat({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-[#0A0A0A] border border-[#222] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3 w-3 ${accent ? 'text-[#EACE00]' : 'text-white/30'}`} />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-bold tabular-nums ${accent ? 'text-[#EACE00]' : 'text-white'}`}>{value}</div>
    </div>
  )
}
