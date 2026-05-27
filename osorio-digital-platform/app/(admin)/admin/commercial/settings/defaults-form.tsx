'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle, CheckCircle2, RotateCcw, Save } from 'lucide-react'
import { setCommissionDefaultsAction } from '@/app/actions/commercial'
import { DEFAULT_COMMISSION_RULE, formatCommissionRule } from '@/lib/commissions'
import type { CommissionRule } from '@/types'

interface Props {
  initial: CommissionRule
}

export function CommissionDefaultsForm({ initial }: Props) {
  const [sdrFixed,    setSdrFixed]    = useState(String(initial.sdr_fixed))
  const [closer1,     setCloser1]     = useState(String(initial.closer_month_1_pct))
  const [closer2,     setCloser2]     = useState(String(initial.closer_month_2_pct))
  const [closer3,     setCloser3]     = useState(String(initial.closer_month_3_pct))
  const [error,       setError]       = useState<string | null>(null)
  const [savedAt,     setSavedAt]     = useState<number | null>(null)
  const [pending, startSubmit] = useTransition()

  function parseValues(): CommissionRule | null {
    const sdr = parseFloat(sdrFixed.replace(',', '.'))
    const m1  = parseFloat(closer1.replace(',', '.'))
    const m2  = parseFloat(closer2.replace(',', '.'))
    const m3  = parseFloat(closer3.replace(',', '.'))
    if ([sdr, m1, m2, m3].some(Number.isNaN)) return null
    return { sdr_fixed: sdr, closer_month_1_pct: m1, closer_month_2_pct: m2, closer_month_3_pct: m3 }
  }

  const previewRule = parseValues() ?? initial

  function handleRestore() {
    setSdrFixed(String(DEFAULT_COMMISSION_RULE.sdr_fixed))
    setCloser1(String(DEFAULT_COMMISSION_RULE.closer_month_1_pct))
    setCloser2(String(DEFAULT_COMMISSION_RULE.closer_month_2_pct))
    setCloser3(String(DEFAULT_COMMISSION_RULE.closer_month_3_pct))
    setError(null)
    setSavedAt(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const values = parseValues()
    if (!values) {
      setError('Valores inválidos. Use apenas números.')
      return
    }
    if (values.sdr_fixed < 0) { setError('SDR fixo não pode ser negativo'); return }
    for (const pct of [values.closer_month_1_pct, values.closer_month_2_pct, values.closer_month_3_pct]) {
      if (pct < 0 || pct > 100) { setError('Percentuais devem estar entre 0 e 100'); return }
    }
    startSubmit(async () => {
      const r = await setCommissionDefaultsAction(values)
      if ('error' in r) { setError(r.error ?? 'Erro ao salvar'); return }
      setSavedAt(Date.now())
    })
  }

  return (
    <section className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-bold text-white">Defaults globais de comissão</h2>
        <p className="text-sm text-[#888] mt-1">
          Esses valores são aplicados a todos os clientes que não tenham regra customizada própria.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="SDR — valor fixo (R$)" htmlFor="sdr-fixed">
            <input
              id="sdr-fixed"
              type="number" step="0.01" min={0}
              value={sdrFixed}
              onChange={(e) => setSdrFixed(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Closer mês 1 (%)" htmlFor="closer-1">
            <input
              id="closer-1"
              type="number" step="0.01" min={0} max={100}
              value={closer1}
              onChange={(e) => setCloser1(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Closer mês 2 (%)" htmlFor="closer-2">
            <input
              id="closer-2"
              type="number" step="0.01" min={0} max={100}
              value={closer2}
              onChange={(e) => setCloser2(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>

          <Field label="Closer mês 3 (%)" htmlFor="closer-3">
            <input
              id="closer-3"
              type="number" step="0.01" min={0} max={100}
              value={closer3}
              onChange={(e) => setCloser3(e.target.value)}
              required
              disabled={pending}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
            />
          </Field>
        </div>

        <p className="text-[10px] text-[#666]">
          Aplicado sobre o valor pago da fatura. Do 4º mês em diante, comissão zera automaticamente.
        </p>

        <div className="rounded-lg bg-[#0A0A0A] border border-[#222] p-3 text-sm">
          <span className="text-[10px] text-white/30 uppercase tracking-wider block mb-1">Resumo</span>
          <p className="text-white/80">{formatCommissionRule(previewRule)}</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {savedAt && !error && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Defaults atualizados.
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={handleRestore}
            disabled={pending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#222] text-[#888] hover:bg-[#1a1a1a] text-sm transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrão da plataforma
          </button>
          <button
            type="submit"
            disabled={pending}
            className="ml-auto inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors text-sm"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </button>
        </div>
      </form>
    </section>
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
