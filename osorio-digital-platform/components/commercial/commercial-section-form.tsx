'use client'

import { useState, useTransition, useMemo } from 'react'
import { Loader2, AlertCircle, Save, HandCoins, Phone, Handshake } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { setClientSellersAction } from '@/app/actions/commercial'
import {
  formatCommissionRule,
  getSellerRoleLabel,
} from '@/lib/commissions'
import type { CommissionRule, SellerRole } from '@/types'

interface ProfileOption {
  id:        string
  full_name: string | null
  email:     string
  role:      string
}

interface Props {
  clientId:           string
  profiles:           ProfileOption[]
  defaults:           CommissionRule
  initialSdrId:       string | null
  initialCloserId:    string | null
  initialVendedorId:  string | null
  initialCustomRule:  CommissionRule | null
}

const ROLE_BADGE: Record<SellerRole, { icon: React.ElementType; classes: string }> = {
  vendedor: { icon: HandCoins, classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  sdr:      { icon: Phone,     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  closer:   { icon: Handshake, classes: 'bg-green-500/15 text-green-400 border-green-500/25' },
}

export function CommercialSectionForm({
  clientId,
  profiles,
  defaults,
  initialSdrId,
  initialCloserId,
  initialVendedorId,
  initialCustomRule,
}: Props) {
  const [sdrId,      setSdrId]      = useState<string>(initialSdrId      ?? '')
  const [closerId,   setCloserId]   = useState<string>(initialCloserId   ?? '')
  const [vendedorId, setVendedorId] = useState<string>(initialVendedorId ?? '')

  const [useCustom, setUseCustom] = useState<boolean>(!!initialCustomRule)
  const seed = initialCustomRule ?? defaults
  const [sdrFixed, setSdrFixed] = useState(String(seed.sdr_fixed))
  const [m1, setM1] = useState(String(seed.closer_month_1_pct))
  const [m2, setM2] = useState(String(seed.closer_month_2_pct))
  const [m3, setM3] = useState(String(seed.closer_month_3_pct))

  const [error,   setError]   = useState<string | null>(null)
  const [pending, startSubmit] = useTransition()

  // Buckets de profiles por papel aceito
  const sdrCandidates      = profiles.filter((p) => ['sdr', 'vendedor'].includes(p.role))
  const closerCandidates   = profiles.filter((p) => ['closer', 'vendedor'].includes(p.role))
  const vendedorCandidates = profiles.filter((p) => p.role === 'vendedor')

  // Validação D4 — vendedor único não coexiste com SDR/Closer
  const hasD4Conflict = !!vendedorId && (!!sdrId || !!closerId)

  // Lookup pra render dos vínculos atuais (resumo)
  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileOption>()
    for (const p of profiles) m.set(p.id, p)
    return m
  }, [profiles])

  const activeBindings: Array<{ role: SellerRole; user: ProfileOption }> = []
  if (sdrId      && profileMap.get(sdrId))      activeBindings.push({ role: 'sdr',      user: profileMap.get(sdrId)!      })
  if (closerId   && profileMap.get(closerId))   activeBindings.push({ role: 'closer',   user: profileMap.get(closerId)!   })
  if (vendedorId && profileMap.get(vendedorId)) activeBindings.push({ role: 'vendedor', user: profileMap.get(vendedorId)! })

  // Regra efetiva (preview)
  const effectiveRule: CommissionRule = useCustom
    ? {
        sdr_fixed:          parseFloat((sdrFixed || '0').replace(',', '.')) || 0,
        closer_month_1_pct: parseFloat((m1 || '0').replace(',', '.')) || 0,
        closer_month_2_pct: parseFloat((m2 || '0').replace(',', '.')) || 0,
        closer_month_3_pct: parseFloat((m3 || '0').replace(',', '.')) || 0,
      }
    : defaults

  function buildCustomRule(): CommissionRule | null {
    if (!useCustom) return null
    const sdr = parseFloat((sdrFixed || '').replace(',', '.'))
    const v1  = parseFloat((m1 || '').replace(',', '.'))
    const v2  = parseFloat((m2 || '').replace(',', '.'))
    const v3  = parseFloat((m3 || '').replace(',', '.'))
    if ([sdr, v1, v2, v3].some(Number.isNaN)) return null
    return { sdr_fixed: sdr, closer_month_1_pct: v1, closer_month_2_pct: v2, closer_month_3_pct: v3 }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (hasD4Conflict) {
      setError('Vendedor único não pode coexistir com SDR ou Closer. Limpe um dos vínculos antes de salvar.')
      return
    }

    let customRule: CommissionRule | null = null
    if (useCustom) {
      customRule = buildCustomRule()
      if (!customRule) { setError('Valores da regra inválidos. Use apenas números.'); return }
      if (customRule.sdr_fixed < 0) { setError('SDR fixo não pode ser negativo'); return }
      for (const pct of [customRule.closer_month_1_pct, customRule.closer_month_2_pct, customRule.closer_month_3_pct]) {
        if (pct < 0 || pct > 100) { setError('Percentuais devem estar entre 0 e 100'); return }
      }
    }

    startSubmit(async () => {
      const r = await setClientSellersAction({
        clientId,
        sdrId:      sdrId      || null,
        closerId:   closerId   || null,
        vendedorId: vendedorId || null,
        customRule,
      })
      if ('error' in r) { setError(r.error ?? 'Erro ao salvar vínculos'); return }
      toast.success('Vínculos atualizados')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Resumo dos vínculos atuais */}
      <div className="rounded-lg bg-[#0A0A0A] border border-[#222] p-3 space-y-2">
        <span className="text-[10px] text-white/30 uppercase tracking-wider block">Vínculos atuais</span>
        {activeBindings.length === 0 ? (
          <p className="text-xs text-white/40 italic">Nenhum vínculo selecionado.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activeBindings.map((b) => {
              const Icon = ROLE_BADGE[b.role].icon
              return (
                <span
                  key={b.role}
                  className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium', ROLE_BADGE[b.role].classes)}
                >
                  <Icon className="h-3 w-3" />
                  {getSellerRoleLabel(b.role)} · {b.user.full_name ?? b.user.email}
                </span>
              )
            })}
          </div>
        )}
        <p className="text-[10px] text-white/40 pt-1 border-t border-[#222]">
          <span className="text-white/30 uppercase tracking-wider mr-1">Regra:</span>
          {formatCommissionRule(effectiveRule)}
        </p>
      </div>

      {/* Selects de vínculo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="SDR" htmlFor="sdr-select">
          <select
            id="sdr-select"
            value={sdrId}
            onChange={(e) => setSdrId(e.target.value)}
            disabled={pending}
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
          >
            <option value="">— sem vínculo —</option>
            {sdrCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.full_name ?? p.email) + (p.role === 'vendedor' ? ' (Vendedor)' : '')}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Closer" htmlFor="closer-select">
          <select
            id="closer-select"
            value={closerId}
            onChange={(e) => setCloserId(e.target.value)}
            disabled={pending}
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
          >
            <option value="">— sem vínculo —</option>
            {closerCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.full_name ?? p.email) + (p.role === 'vendedor' ? ' (Vendedor)' : '')}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Vendedor (único)" htmlFor="vendedor-select">
          <select
            id="vendedor-select"
            value={vendedorId}
            onChange={(e) => setVendedorId(e.target.value)}
            disabled={pending}
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
          >
            <option value="">— sem vínculo —</option>
            {vendedorCandidates.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>
            ))}
          </select>
        </Field>
      </div>

      {hasD4Conflict && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Vendedor único não pode coexistir com SDR ou Closer. Limpe um dos vínculos antes de salvar.
        </div>
      )}

      {/* Toggle regra customizada */}
      <div className="space-y-3 rounded-lg bg-[#0A0A0A] border border-[#222] p-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => setUseCustom(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-[#333] bg-[#1a1a1a] accent-[#EACE00]"
          />
          <span className="text-sm text-white">Usar regra de comissão customizada para este cliente</span>
        </label>

        {!useCustom ? (
          <p className="text-xs text-[#888] pl-6">
            Usando defaults globais: <span className="text-white/70">{formatCommissionRule(defaults)}</span>
          </p>
        ) : (
          <div className="space-y-3 pl-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="SDR — valor fixo (R$)" htmlFor="cs-sdr-fixed">
                <input
                  id="cs-sdr-fixed"
                  type="number" step="0.01" min={0}
                  value={sdrFixed}
                  onChange={(e) => setSdrFixed(e.target.value)}
                  required
                  disabled={pending}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
                />
              </Field>
              <Field label="Closer mês 1 (%)" htmlFor="cs-m1">
                <input
                  id="cs-m1"
                  type="number" step="0.01" min={0} max={100}
                  value={m1}
                  onChange={(e) => setM1(e.target.value)}
                  required
                  disabled={pending}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
                />
              </Field>
              <Field label="Closer mês 2 (%)" htmlFor="cs-m2">
                <input
                  id="cs-m2"
                  type="number" step="0.01" min={0} max={100}
                  value={m2}
                  onChange={(e) => setM2(e.target.value)}
                  required
                  disabled={pending}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
                />
              </Field>
              <Field label="Closer mês 3 (%)" htmlFor="cs-m3">
                <input
                  id="cs-m3"
                  type="number" step="0.01" min={0} max={100}
                  value={m3}
                  onChange={(e) => setM3(e.target.value)}
                  required
                  disabled={pending}
                  className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50"
                />
              </Field>
            </div>
            <p className="text-[10px] text-[#666]">
              Aplicado sobre o valor pago da fatura. Do 4º mês em diante, comissão zera automaticamente.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-[#222]">
        <button
          type="submit"
          disabled={pending || hasD4Conflict}
          className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors text-sm"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar vínculos
        </button>
      </div>
    </form>
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
