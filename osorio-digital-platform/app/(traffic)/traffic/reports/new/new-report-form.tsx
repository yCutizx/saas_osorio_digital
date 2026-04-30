'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { createReportAction, type FormState } from './actions'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, Calculator } from 'lucide-react'

type Campaign = { id: string; name: string; platform: string }
type Client   = { id: string; name: string; campaigns: Campaign[] }

interface Props {
  clients: Client[]
}

const PLATFORM_LABEL: Record<string, string> = {
  meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', other: 'Outro',
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow/90 disabled:opacity-60"
    >
      {pending
        ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Salvando...</span>
        : 'Salvar Relatório'}
    </Button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

function MetricInput({
  id, name, label, placeholder, hint, error,
}: {
  id: string; name: string; label: string; placeholder?: string; hint?: string; error?: string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-white/70 text-sm">{label}</Label>
      <Input
        id={id}
        name={name}
        type="number"
        min="0"
        placeholder={placeholder ?? '0'}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
      />
      {hint && <p className="text-white/30 text-xs">{hint}</p>}
      <FieldError messages={error} />
    </div>
  )
}

export function NewReportForm({ clients }: Props) {
  const [state, action] = useFormState<FormState, FormData>(createReportAction, {})
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '')

  const selectedClient  = clients.find((c) => c.id === selectedClientId)
  const availableCamps  = selectedClient?.campaigns ?? []

  // Métricas derivadas calculadas em tempo real (só visual)
  const [spend,  setSpend]  = useState('')
  const [revenue, setRevenue] = useState('')
  const [clicks, setClicks] = useState('')
  const [impressions, setImpressions] = useState('')

  const roas = spend && revenue ? (parseFloat(revenue) / parseFloat(spend)).toFixed(2) : '—'
  const ctr  = impressions && clicks
    ? ((parseFloat(clicks) / parseFloat(impressions)) * 100).toFixed(2) + '%'
    : '—'
  const cpc  = clicks && spend ? 'R$ ' + (parseFloat(spend) / parseFloat(clicks)).toFixed(2) : '—'

  return (
    <form action={action} className="space-y-6">
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Cliente e campanha */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="client_id" className="text-white/70 text-sm">
            Cliente <span className="text-red-400">*</span>
          </Label>
          <select
            id="client_id"
            name="client_id"
            required
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-yellow transition-colors"
          >
            {clients.length === 0
              ? <option value="">Nenhum cliente disponível</option>
              : clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>
          <FieldError messages={state.errors?.client_id} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="campaign_id" className="text-white/70 text-sm">
            Campanha <span className="text-red-400">*</span>
          </Label>
          <select
            id="campaign_id"
            name="campaign_id"
            required
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-yellow transition-colors"
          >
            {availableCamps.length === 0
              ? <option value="">Sem campanhas para este cliente</option>
              : availableCamps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {PLATFORM_LABEL[c.platform] ?? c.platform} — {c.name}
                  </option>
                ))
            }
          </select>
          <FieldError messages={state.errors?.campaign_id} />
        </div>
      </div>

      {/* Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="period_start" className="text-white/70 text-sm">
            Data Inicial <span className="text-red-400">*</span>
          </Label>
          <Input
            id="period_start"
            name="period_start"
            type="date"
            required
            className="bg-white/5 border-white/10 text-white focus:border-brand-yellow h-10 [color-scheme:dark]"
          />
          <FieldError messages={state.errors?.period_start} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="period_end" className="text-white/70 text-sm">
            Data Final <span className="text-red-400">*</span>
          </Label>
          <Input
            id="period_end"
            name="period_end"
            type="date"
            required
            className="bg-white/5 border-white/10 text-white focus:border-brand-yellow h-10 [color-scheme:dark]"
          />
          <FieldError messages={state.errors?.period_end} />
        </div>
      </div>

      {/* Métricas de alcance */}
      <div>
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Alcance</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="impressions" className="text-white/70 text-sm">Impressões</Label>
            <Input
              id="impressions"
              name="impressions"
              type="number"
              min="0"
              placeholder="0"
              value={impressions}
              onChange={(e) => setImpressions(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
            />
            <FieldError messages={state.errors?.impressions} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clicks" className="text-white/70 text-sm">Cliques</Label>
            <Input
              id="clicks"
              name="clicks"
              type="number"
              min="0"
              placeholder="0"
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
            />
            <FieldError messages={state.errors?.clicks} />
          </div>
          <MetricInput
            id="conversions" name="conversions"
            label="Conversões"
            error={state.errors?.conversions}
          />
        </div>
      </div>

      {/* Métricas financeiras */}
      <div>
        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Financeiro</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="spend" className="text-white/70 text-sm">
              Investimento (R$) <span className="text-red-400">*</span>
            </Label>
            <Input
              id="spend"
              name="spend"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              required
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
            />
            <FieldError messages={state.errors?.spend} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="revenue" className="text-white/70 text-sm">Receita / Retorno (R$)</Label>
            <Input
              id="revenue"
              name="revenue"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
            />
            <FieldError messages={state.errors?.revenue} />
          </div>
        </div>
      </div>

      {/* Preview de métricas derivadas */}
      {(spend || impressions) && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <Calculator className="h-3.5 w-3.5" />
            <span>Métricas calculadas automaticamente</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'ROAS', value: roas !== '—' ? `${roas}x` : '—' },
              { label: 'CTR',  value: ctr },
              { label: 'CPC',  value: cpc },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-white/40 text-xs">{label}</p>
                <p className="text-white font-semibold text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
