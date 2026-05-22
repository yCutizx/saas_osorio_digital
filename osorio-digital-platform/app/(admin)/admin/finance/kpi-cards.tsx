import { TrendingUp, Wallet, HandCoins, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/finance'

interface Props {
  mrr:              number
  receivedMonth:    number
  receivedMonthCount: number
  toReceive:        number
  toReceiveCount:   number
  overdue:          number
  overdueCount:     number
  atRisk:           number  // days_overdue > 15
  atRiskCount:      number
}

interface Card {
  label:      string
  value:      string
  sub:        string
  icon:       React.ElementType
  cardClass:  string
  iconClass:  string
  valueClass: string
}

export function KpiCards(props: Props) {
  const cards: Card[] = [
    {
      label:      'MRR',
      value:      formatBRL(props.mrr),
      sub:        'Receita mensal recorrente',
      icon:       TrendingUp,
      cardClass:  'bg-[#111] border border-[#222]',
      iconClass:  'text-[#EACE00] bg-[#EACE00]/10',
      valueClass: 'text-white',
    },
    {
      label:      'Recebido no mês',
      value:      formatBRL(props.receivedMonth),
      sub:        `${props.receivedMonthCount} fatura${props.receivedMonthCount !== 1 ? 's' : ''}`,
      icon:       Wallet,
      cardClass:  'bg-[#111] border border-[#222]',
      iconClass:  'text-green-400 bg-green-500/10',
      valueClass: 'text-white',
    },
    {
      label:      'A receber',
      value:      formatBRL(props.toReceive),
      sub:        `${props.toReceiveCount} fatura${props.toReceiveCount !== 1 ? 's' : ''} pendente${props.toReceiveCount !== 1 ? 's' : ''}`,
      icon:       HandCoins,
      cardClass:  'bg-[#111] border border-[#222]',
      iconClass:  'text-blue-400 bg-blue-500/10',
      valueClass: 'text-white',
    },
    {
      label:      'Atrasado',
      value:      formatBRL(props.overdue),
      sub:        `${props.overdueCount} fatura${props.overdueCount !== 1 ? 's' : ''} em atraso`,
      icon:       Clock,
      cardClass:  'bg-red-500/10 border border-red-500/30',
      iconClass:  'text-red-400 bg-red-500/15',
      valueClass: 'text-red-300',
    },
    {
      label:      'Em risco',
      value:      formatBRL(props.atRisk),
      sub:        `${props.atRiskCount} fatura${props.atRiskCount !== 1 ? 's' : ''} > 15 dias`,
      icon:       AlertCircle,
      cardClass:  'bg-orange-500/10 border border-orange-500/30',
      iconClass:  'text-orange-400 bg-orange-500/15',
      valueClass: 'text-orange-300',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={cn('rounded-2xl p-4', c.cardClass)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 uppercase tracking-wider">{c.label}</span>
            <div className={cn('p-1.5 rounded-lg', c.iconClass)}>
              <c.icon className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className={cn('text-2xl font-bold tabular-nums', c.valueClass)}>{c.value}</div>
          <p className="text-xs text-white/40 mt-1">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
