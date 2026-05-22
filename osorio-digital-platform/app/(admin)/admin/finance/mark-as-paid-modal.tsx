'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { markInvoiceAsPaidAction } from '@/app/actions/financial'
import { formatBRL, todayBRT } from '@/lib/finance'

interface Props {
  invoice: {
    id:              string
    client_name:     string
    reference_month: string
    due_date:        string
    amount:          number
  }
  /** Botão custom que dispara o drawer. Se omitido, usa botão padrão. */
  trigger?: React.ReactNode
}

const METHODS = [
  { value: 'pix',          label: 'PIX'           },
  { value: 'boleto',       label: 'Boleto'        },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cartao',       label: 'Cartão'        },
  { value: 'outro',        label: 'Outro'         },
]

export function MarkAsPaidModal({ invoice, trigger }: Props) {
  const [open, setOpen]      = useState(false)
  const [paidAt, setPaidAt]  = useState(todayBRT())
  const [paidAmount, setPaidAmount] = useState(invoice.amount.toString())
  const [method, setMethod]  = useState('pix')
  const [notes, setNotes]    = useState('')
  const [error, setError]    = useState<string | null>(null)
  const [pending, startSubmit] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(paidAmount.replace(',', '.'))
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setError('Valor pago inválido')
      return
    }
    startSubmit(async () => {
      const r = await markInvoiceAsPaidAction(invoice.id, {
        paid_at:        paidAt,
        paid_amount:    amountNum,
        payment_method: method,
        notes:          notes.trim() || undefined,
      })
      if ('error' in r) {
        setError(r.error ?? 'Erro ao salvar')
        return
      }
      toast.success('Fatura marcada como paga')
      setOpen(false)
    })
  }

  const refLabel = format(parseISO(invoice.reference_month), 'MM/yyyy', { locale: ptBR })
  const dueLabel = format(parseISO(invoice.due_date), 'dd/MM/yyyy', { locale: ptBR })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex items-center gap-1.5 bg-[#EACE00] text-black text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#f5d800] transition-colors"
      >
        {trigger ?? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Marcar como pago
          </>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0A] border-l border-[#222] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Marcar fatura como paga</SheetTitle>
        </SheetHeader>

        <div className="mt-4 rounded-lg bg-[#111] border border-[#222] p-3 text-sm space-y-1">
          <p className="text-[#F5F5F0] font-semibold">{invoice.client_name}</p>
          <p className="text-[#888] text-xs">Ref. {refLabel} · Vence {dueLabel}</p>
          <p className="text-[#EACE00] font-bold tabular-nums">{formatBRL(invoice.amount)}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Data do pagamento" htmlFor="paid-at">
            <input
              id="paid-at"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Valor pago (R$)" htmlFor="paid-amount" hint="Aceita pagamento parcial — diferença vai pra observação">
            <input
              id="paid-amount"
              type="text"
              inputMode="decimal"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Método" htmlFor="method">
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            >
              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>

          <Field label="Observação (opcional)" htmlFor="notes">
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              rows={3}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50 resize-none"
            />
          </Field>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="flex-1 px-4 py-2 rounded-lg border border-[#222] text-[#888] hover:bg-[#111] text-sm transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmar
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, htmlFor, hint, children }: {
  label:   string
  htmlFor: string
  hint?:   string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs text-[#888] font-medium uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-[#666]">{hint}</p>}
    </div>
  )
}
