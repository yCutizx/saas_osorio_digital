'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle, FileText, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { createContractAction, updateContractAction } from '@/app/actions/financial'
import { todayBRT } from '@/lib/finance'
import type { ContractStatus, FinancialContract } from '@/types'

interface Props {
  clientId:         string
  existingContract: FinancialContract | null
}

const STATUSES: { value: ContractStatus; label: string }[] = [
  { value: 'active',  label: 'Ativo'    },
  { value: 'paused',  label: 'Pausado'  },
  { value: 'ended',   label: 'Encerrado' },
]

export function ContractForm({ clientId, existingContract }: Props) {
  const isEdit = !!existingContract
  const [open, setOpen] = useState(false)
  const [monthlyValue, setMonthlyValue] = useState((existingContract?.monthly_value ?? '').toString())
  const [billingDay, setBillingDay] = useState((existingContract?.billing_day ?? 5).toString())
  const [startDate, setStartDate] = useState(existingContract?.start_date ?? todayBRT())
  const [endDate, setEndDate] = useState(existingContract?.end_date ?? '')
  const [status, setStatus] = useState<ContractStatus>(existingContract?.status ?? 'active')
  const [notes, setNotes] = useState(existingContract?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startSubmit] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const valueNum = parseFloat(monthlyValue.replace(',', '.'))
    const dayNum   = parseInt(billingDay, 10)
    if (Number.isNaN(valueNum) || valueNum <= 0) { setError('Valor mensal deve ser maior que zero'); return }
    if (Number.isNaN(dayNum) || dayNum < 1 || dayNum > 28) { setError('Dia de vencimento entre 1 e 28'); return }

    startSubmit(async () => {
      if (isEdit && existingContract) {
        const r = await updateContractAction(existingContract.id, {
          monthly_value: valueNum,
          billing_day:   dayNum,
          start_date:    startDate,
          end_date:      endDate || null,
          status,
          notes:         notes.trim() || null,
        })
        if ('error' in r) { setError(r.error ?? 'Erro ao salvar'); return }
        toast.success('Contrato atualizado')
        setOpen(false)
      } else {
        const r = await createContractAction({
          client_id:     clientId,
          monthly_value: valueNum,
          billing_day:   dayNum,
          start_date:    startDate,
          end_date:      endDate || null,
          notes:         notes.trim() || null,
        })
        if ('error' in r) { setError(r.error ?? 'Erro ao salvar'); return }
        toast.success('Contrato criado · primeira fatura gerada')
        setOpen(false)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
          isEdit
            ? 'border border-[#222] text-[#ccc] hover:bg-[#1a1a1a]'
            : 'bg-[#EACE00] text-black hover:bg-[#f5d800]',
        )}
      >
        {isEdit ? <><Pencil className="h-3.5 w-3.5" /> Editar contrato</>
                : <><Plus   className="h-3.5 w-3.5" /> Criar contrato</>}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0A] border-l border-[#222] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#EACE00]" />
            {isEdit ? 'Editar contrato' : 'Novo contrato'}
          </SheetTitle>
        </SheetHeader>

        {!isEdit && (
          <p className="mt-4 text-xs text-white/40 bg-[#111] border border-[#222] rounded-lg p-3">
            💡 Primeira fatura será gerada automaticamente após salvar, com vencimento conforme o dia escolhido.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Valor mensal (R$)" htmlFor="monthly-value">
            <input
              id="monthly-value"
              type="text"
              inputMode="decimal"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
              required
              disabled={pending}
              placeholder="2500,00"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Dia de vencimento (1-28)" htmlFor="billing-day">
            <input
              id="billing-day"
              type="number"
              min={1}
              max={28}
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Data de início" htmlFor="start-date">
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Data de encerramento (opcional)" htmlFor="end-date">
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          {isEdit && (
            <Field label="Status" htmlFor="status">
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                disabled={pending}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          )}

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
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? 'Salvar' : 'Criar'}
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
