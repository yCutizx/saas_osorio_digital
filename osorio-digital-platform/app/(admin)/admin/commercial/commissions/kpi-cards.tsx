import { HandCoins, Wallet, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/finance'

interface Props {
  toPay:         number
  paid:          number
  canceledCount: number
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

export function CommissionsKpiCards(props: Props) {
  const cards: Card[] = [
    {
      label:      'A pagar',
      value:      formatBRL(props.toPay),
      sub:        'Comissões pendentes',
      icon:       HandCoins,
      cardClass:  props.toPay > 0 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-[#111] border border-[#222]',
      iconClass:  'text-yellow-400 bg-yellow-500/15',
      valueClass: props.toPay > 0 ? 'text-yellow-300' : 'text-white',
    },
    {
      label:      'Pago',
      value:      formatBRL(props.paid),
      sub:        'Comissões liquidadas',
      icon:       Wallet,
      cardClass:  'bg-[#111] border border-[#222]',
      iconClass:  'text-green-400 bg-green-500/10',
      valueClass: 'text-white',
    },
    {
      label:      'Cancelado',
      value:      String(props.canceledCount),
      sub:        `${props.canceledCount === 1 ? 'comissão cancelada' : 'comissões canceladas'}`,
      icon:       Ban,
      cardClass:  'bg-[#111] border border-[#222]',
      iconClass:  'text-white/40 bg-white/5',
      valueClass: 'text-white/70',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
