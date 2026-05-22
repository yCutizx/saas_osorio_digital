'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle, Plus, HandCoins } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { createTransactionAction } from '@/app/actions/financial'
import { todayBRT } from '@/lib/finance'
import type { TransactionType } from '@/types'

interface Props {
  clientId: string
  /** Invoices opcionais pra vincular (autocomplete simples via select) */
  invoices?: Array<{ id: string; label: string }>
}

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'income',     label: 'Receita'    },
  { value: 'expense',    label: 'Despesa'    },
  { value: 'refund',     label: 'Reembolso'  },
  { value: 'adjustment', label: 'Ajuste'     },
]

export function TransactionModal({ clientId, invoices }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('income')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState(todayBRT())
  const [category, setCategory] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startSubmit] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const amountNum = parseFloat(amount.replace(',', '.'))
    if (Number.isNaN(amountNum) || amountNum <= 0) { setError('Valor deve ser maior que zero'); return }
    if (description.trim().length < 3)              { setError('Descrição muito curta');         return }

    startSubmit(async () => {
      const r = await createTransactionAction({
        client_id:        clientId,
        type,
        amount:           amountNum,
        description:      description.trim(),
        transaction_date: transactionDate,
        category:         category.trim() || null,
        invoice_id:       invoiceId || null,
      })
      if ('error' in r) { setError(r.error ?? 'Erro ao salvar'); return }
      toast.success('Transação lançada')
      setOpen(false)
      setAmount('')
      setDescription('')
      setCategory('')
      setInvoiceId('')
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-[#222] text-[#ccc] hover:bg-[#1a1a1a] transition-colors">
        <Plus className="h-3.5 w-3.5" />
        Lançar transação
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0A] border-l border-[#222] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-[#EACE00]" />
            Nova transação
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Tipo" htmlFor="type">
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            >
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Valor (R$)" htmlFor="amount">
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={pending}
              placeholder="150,00"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Descrição" htmlFor="description">
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={pending}
              maxLength={500}
              placeholder="Serviço extra de Reels"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Data" htmlFor="transaction-date">
            <input
              id="transaction-date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Categoria (opcional)" htmlFor="category">
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={pending}
              maxLength={80}
              placeholder="Ex: serviço extra"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          {invoices && invoices.length > 0 && (
            <Field label="Vincular a fatura (opcional)" htmlFor="invoice-id">
              <select
                id="invoice-id"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                disabled={pending}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
              >
                <option value="">— nenhuma —</option>
                {invoices.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </Field>
          )}

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
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lançar'}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs text-[#888] font-medium uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}
