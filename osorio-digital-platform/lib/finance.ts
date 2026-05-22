/**
 * Helpers puros do módulo financeiro (Etapa 15).
 * Sem hooks, sem chamadas de banco — pode rodar em server e client.
 */

import type {
  FinancialInvoiceLive,
  InvoiceStatus,
  ContractStatus,
} from '@/types'

// ── Agregadores ───────────────────────────────────────────────────────────────

export function computeMRR(activeContracts: { monthly_value: number }[]): number {
  return activeContracts.reduce((sum, c) => sum + Number(c.monthly_value), 0)
}

export function groupInvoicesByMonth(
  invoices: FinancialInvoiceLive[],
): Record<string, FinancialInvoiceLive[]> {
  return invoices.reduce((acc, inv) => {
    const key = inv.reference_month.slice(0, 7) // yyyy-mm
    if (!acc[key]) acc[key] = []
    acc[key].push(inv)
    return acc
  }, {} as Record<string, FinancialInvoiceLive[]>)
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

export function buildWhatsappLink(opts: {
  phone:        string // E.164 sem +
  clientName:   string
  amount:       number
  dueDate:      string
  daysOverdue:  number
}): string {
  const formattedAmount = formatBRL(opts.amount)
  const message =
    `Olá Rafael! Sou ${opts.clientName}, gostaria de regularizar minha fatura ` +
    `de ${formattedAmount} (vencimento ${opts.dueDate}, atrasada há ${opts.daysOverdue} dias).`
  return `https://wa.me/${opts.phone}?text=${encodeURIComponent(message)}`
}

// ── Status efetivo (mirror da SQL function pra UI sem ida ao banco) ──────────

export function computeInvoiceEffectiveStatus(opts: {
  status:  InvoiceStatus
  dueDate: string
  paidAt:  string | null
}): InvoiceStatus {
  if (opts.status === 'paid' || opts.status === 'canceled') return opts.status
  if (opts.paidAt) return 'paid'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(opts.dueDate)
  due.setHours(0, 0, 0, 0)

  if (due < today) return 'overdue'
  return 'pending'
}

export function getDaysOverdue(dueDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diff = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// ── Formatação ────────────────────────────────────────────────────────────────

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(value)
}

// ── Labels e cores ────────────────────────────────────────────────────────────

export function getStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    pending:  'Pendente',
    paid:     'Pago',
    overdue:  'Atrasado',
    canceled: 'Cancelado',
  }
  return labels[status]
}

export function getStatusColor(status: InvoiceStatus): string {
  const colors: Record<InvoiceStatus, string> = {
    pending:  'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    paid:     'text-green-400 bg-green-500/10 border-green-500/20',
    overdue:  'text-red-400 bg-red-500/10 border-red-500/20',
    canceled: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  }
  return colors[status]
}

export function getContractStatusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    active: 'Ativo',
    paused: 'Pausado',
    ended:  'Encerrado',
  }
  return labels[status]
}

// ── Date helpers (BRT-aware) ──────────────────────────────────────────────────

/** YYYY-MM-DD no fuso 'America/Sao_Paulo' (independente do server TZ). */
export function todayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

/** Adiciona N dias a uma data YYYY-MM-DD, retorna no mesmo formato. UTC-safe. */
export function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Primeiro dia do mês de uma data YYYY-MM-DD → YYYY-MM-01. */
export function firstDayOfMonth(yyyyMmDd: string): string {
  return `${yyyyMmDd.slice(0, 7)}-01`
}

/**
 * Compõe uma data YYYY-MM-DD a partir de year/month(1-12)/day. Estável: usa
 * UTC noon pra evitar shift de TZ. day é capped pelo último dia do mês caso
 * o billing_day extrapole (ex: billing_day=31 em fevereiro vira o último dia).
 */
export function composeDate(year: number, month: number, day: number): string {
  // Normaliza overflow de mês (ex: month=13 → year+1, month=1)
  const baseYear  = year + Math.floor((month - 1) / 12)
  const baseMonth = ((month - 1) % 12 + 12) % 12 + 1
  // último dia do mês
  const lastDay = new Date(Date.UTC(baseYear, baseMonth, 0)).getUTCDate()
  const cappedDay = Math.min(day, lastDay)
  const mm = String(baseMonth).padStart(2, '0')
  const dd = String(cappedDay).padStart(2, '0')
  return `${baseYear}-${mm}-${dd}`
}

/**
 * Último dia de um mês específico (year, month=1-12).
 * Ex: lastDayOfMonth(2026, 2) = 28 (ou 29 em ano bissexto)
 *     lastDayOfMonth(2026, 4) = 30
 *     lastDayOfMonth(2027, 2) = 28
 *     lastDayOfMonth(2028, 2) = 29 (bissexto)
 */
export function lastDayOfMonth(year: number, month: number): number {
  // JS Date: month é 0-11; new Date(year, month, 0) retorna último dia do mês ANTERIOR.
  // Passando month direto (1-12) com day=0 dá o último dia do mês desejado.
  return new Date(year, month, 0).getDate()
}

/**
 * Compõe due_date dado year/month/billing_day, com CAP automático no último
 * dia do mês quando o billing_day excede.
 *
 * Comportamento "fintech" (Nubank/Inter): billing_day=30 em fevereiro vira 28.
 *
 * Ex: composeDueDate(2026, 2, 30) → '2026-02-28'
 *     composeDueDate(2026, 1, 5)  → '2026-01-05'
 *     composeDueDate(2026, 4, 31) → '2026-04-30'
 *
 * Normaliza overflow de mês (ex: month=13 → year+1, month=1).
 */
export function composeDueDate(year: number, month: number, billingDay: number): string {
  const baseYear  = year + Math.floor((month - 1) / 12)
  const baseMonth = ((month - 1) % 12 + 12) % 12 + 1
  const lastDay   = lastDayOfMonth(baseYear, baseMonth)
  const day       = Math.min(billingDay, lastDay)
  const mm = String(baseMonth).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${baseYear}-${mm}-${dd}`
}

/** Extrai year/month(1-12)/day de YYYY-MM-DD. */
export function parseYMD(yyyyMmDd: string): { year: number; month: number; day: number } {
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  return { year: y, month: m, day: d }
}

/**
 * Próxima data de vencimento dado um start_date e um billing_day.
 *
 * Regra (D7 ajustada):
 * - SE start_date.day <= billing_day desse mês: vence ESSE mês no billing_day
 * - SENÃO: vence no próximo mês no billing_day
 *
 * Cap automático no último dia do mês quando billing_day > último dia
 * (ex: billing_day=30 em fevereiro vence 28/02).
 */
export function computeFirstInvoiceDueDate(opts: {
  startDate:  string // YYYY-MM-DD
  billingDay: number
}): string {
  const { year, month, day } = parseYMD(opts.startDate)
  // Compara contra billing_day "efetivo" do mês corrente (já com cap).
  const effectiveBillingDayThisMonth = Math.min(opts.billingDay, lastDayOfMonth(year, month))
  if (day <= effectiveBillingDayThisMonth) {
    return composeDueDate(year, month, opts.billingDay)
  }
  return composeDueDate(year, month + 1, opts.billingDay)
}
