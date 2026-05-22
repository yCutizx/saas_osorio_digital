import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { formatBRL } from '@/lib/finance'
import { RegularizeButton } from './regularize-button'

export type ClientFinanceState = 'em_dia' | 'a_vencer' | 'atrasado'

interface Props {
  state:       ClientFinanceState
  clientName:  string
  amount:      number
  dueDate:     string  // YYYY-MM-DD
  daysOverdue: number  // 0 quando não atrasada
}

export function ClientFinanceHeroCard({ state, clientName, amount, dueDate, daysOverdue }: Props) {
  const dueFormatted = format(parseISO(dueDate), "dd/MM/yyyy", { locale: ptBR })
  const daysUntilDue = Math.max(0, differenceInDays(parseISO(dueDate), new Date()))

  if (state === 'atrasado') {
    return (
      <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-red-300 text-lg font-semibold">
              Pagamento em atraso há {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              Vencimento original: {dueFormatted}
            </p>
          </div>
        </div>
        <p className="text-4xl font-black text-white tabular-nums">{formatBRL(amount)}</p>
        <RegularizeButton
          clientName={clientName}
          amount={amount}
          dueDate={dueFormatted}
          daysOverdue={daysOverdue}
        />
      </div>
    )
  }

  if (state === 'a_vencer') {
    return (
      <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Clock className="h-6 w-6 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-yellow-300 text-lg font-semibold">
              {daysUntilDue === 0
                ? 'Sua fatura vence hoje'
                : `Sua fatura vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}`}
            </h2>
            <p className="text-white/60 text-sm mt-0.5">
              Vencimento: {dueFormatted}
            </p>
          </div>
        </div>
        <p className="text-4xl font-black text-white tabular-nums">{formatBRL(amount)}</p>
      </div>
    )
  }

  // em_dia
  return (
    <div className="rounded-2xl bg-green-500/10 border border-green-500/30 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-green-300 text-lg font-semibold">Seu pagamento está em dia</h2>
          <p className="text-white/60 text-sm mt-0.5">
            Próxima fatura · Vence em {daysUntilDue} {daysUntilDue === 1 ? 'dia' : 'dias'} ({dueFormatted})
          </p>
        </div>
      </div>
      <p className="text-4xl font-black text-white tabular-nums">{formatBRL(amount)}</p>
    </div>
  )
}
