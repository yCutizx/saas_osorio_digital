import { CheckCircle2, AlertCircle, Clock, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColor, getStatusLabel } from '@/lib/finance'
import type { InvoiceStatus } from '@/types'

interface Props {
  status:       InvoiceStatus
  daysOverdue?: number
  className?:   string
}

const ICONS: Record<InvoiceStatus, React.ElementType> = {
  paid:     CheckCircle2,
  pending:  Clock,
  overdue:  AlertCircle,
  canceled: Ban,
}

export function InvoiceStatusPill({ status, daysOverdue, className }: Props) {
  const Icon = ICONS[status]
  const showOverdueDays = status === 'overdue' && typeof daysOverdue === 'number' && daysOverdue > 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium',
        getStatusColor(status),
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {getStatusLabel(status)}
      {showOverdueDays && (
        <span className="text-[10px] opacity-80 ml-0.5">
          (há {daysOverdue} {daysOverdue === 1 ? 'dia' : 'dias'})
        </span>
      )}
    </span>
  )
}
