'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { createCampaignAction, type FormState } from './actions'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

type Client = { id: string; name: string }

const PLATFORMS = [
  { value: 'meta',     label: 'Meta (Facebook / Instagram)' },
  { value: 'google',   label: 'Google Ads' },
  { value: 'tiktok',   label: 'TikTok Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
  { value: 'other',    label: 'Outro' },
]

const OBJECTIVES = [
  'Conversões', 'Geração de leads', 'Tráfego para site',
  'Reconhecimento de marca', 'Engajamento', 'Vendas no catálogo',
  'Instalações de app', 'Outro',
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-[#EACE00] text-black font-semibold hover:bg-[#EACE00]/90 disabled:opacity-60"
    >
      {pending
        ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Criando...</span>
        : 'Criar Campanha'}
    </Button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewCampaignForm({ clients }: { clients: Client[] }) {
  const [state, action] = useFormState<FormState, FormData>(createCampaignAction, {})
  const [selectedClient, setSelectedClient] = useState(clients[0]?.id ?? '')

  return (
    <form action={action} className="space-y-5">
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Cliente + Nome */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Cliente <span className="text-red-400">*</span>
          </Label>
          <select
            name="client_id"
            required
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors"
          >
            {clients.length === 0
              ? <option value="">Nenhum cliente disponível</option>
              : clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>
          <FieldError messages={state.errors?.client_id} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Nome da Campanha <span className="text-red-400">*</span>
          </Label>
          <Input
            id="name" name="name" required
            placeholder="Ex: Black Friday 2024 — Meta"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.name} />
        </div>
      </div>

      {/* Plataforma */}
      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Plataforma <span className="text-red-400">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PLATFORMS.map((p, i) => (
            <label key={p.value} className="cursor-pointer">
              <input type="radio" name="platform" value={p.value} className="peer sr-only" defaultChecked={i === 0} />
              <div className="border border-white/10 rounded-xl p-3 text-center transition-all peer-checked:border-[#EACE00] peer-checked:bg-[#EACE00]/10 hover:border-white/20">
                <p className="text-white text-xs font-medium leading-tight">{p.label}</p>
              </div>
            </label>
          ))}
        </div>
        <FieldError messages={state.errors?.platform} />
      </div>

      {/* Objetivo + Orçamento mensal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Objetivo</Label>
          <select
            name="objective"
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#EACE00]/60 transition-colors"
          >
            <option value="">Selecione (opcional)</option>
            {OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="budget_monthly" className="text-[#888] text-xs font-medium uppercase tracking-wider">Orçamento Mensal (R$)</Label>
          <Input
            id="budget_monthly" name="budget_monthly"
            type="number" min="0" step="0.01" placeholder="0,00"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="start_date" className="text-[#888] text-xs font-medium uppercase tracking-wider">Data de Início</Label>
          <Input
            id="start_date" name="start_date" type="date"
            className="bg-white/5 border-white/10 text-white focus:border-[#EACE00]/60 h-10 [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date" className="text-[#888] text-xs font-medium uppercase tracking-wider">Data de Término</Label>
          <Input
            id="end_date" name="end_date" type="date"
            className="bg-white/5 border-white/10 text-white focus:border-[#EACE00]/60 h-10 [color-scheme:dark]"
          />
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
