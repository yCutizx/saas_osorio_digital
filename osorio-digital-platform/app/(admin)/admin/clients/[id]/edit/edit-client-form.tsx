'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { updateClientAction, type FormState } from './actions'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'

const INDUSTRIES = [
  'E-commerce', 'Restaurante / Food', 'Saúde e Bem-estar', 'Educação',
  'Imobiliário', 'Serviços Profissionais', 'Tecnologia', 'Moda e Beleza',
  'Automotivo', 'Outro',
]

type TeamMember = { id: string; full_name: string | null; email: string }

type ClientData = {
  id: string
  name: string
  industry: string | null
  contact_email: string | null
  contact_phone: string | null
  plan: string
  active: boolean
  contract_status: string
  monthly_value: number | null
  renewal_date: string | null
  notes: string | null
  traffic_manager_id: string | null
  social_media_id: string | null
}

interface Props {
  client: ClientData
  trafficManagers: TeamMember[]
  socialMediaTeam: TeamMember[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-brand-yellow text-brand-black font-semibold text-sm hover:bg-brand-yellow/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {pending
        ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
        : 'Salvar Alterações'}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest pt-2">
      {children}
    </h3>
  )
}

export function EditClientForm({ client, trafficManagers, socialMediaTeam }: Props) {
  const [state, action] = useFormState<FormState, FormData>(updateClientAction, {})
  const [isActive, setIsActive] = useState(client.active)

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="client_id" value={client.id} />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <SectionTitle>Dados Cadastrais</SectionTitle>

      {/* Nome + Segmento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-white/70 text-sm">
            Nome da Empresa <span className="text-red-400">*</span>
          </Label>
          <Input
            id="company_name" name="company_name"
            defaultValue={client.name}
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
          <FieldError messages={state.errors?.company_name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industry" className="text-white/70 text-sm">
            Segmento <span className="text-red-400">*</span>
          </Label>
          <Select name="industry" defaultValue={client.industry ?? ''} required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-brand-yellow">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind} className="text-white focus:bg-white/10">{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state.errors?.industry} />
        </div>
      </div>

      {/* E-mail + Telefone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact_email" className="text-white/70 text-sm">
            E-mail <span className="text-red-400">*</span>
          </Label>
          <Input
            id="contact_email" name="contact_email"
            type="email"
            defaultValue={client.contact_email ?? ''}
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
          <FieldError messages={state.errors?.contact_email} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact_phone" className="text-white/70 text-sm">Telefone</Label>
          <Input
            id="contact_phone" name="contact_phone"
            type="tel"
            defaultValue={client.contact_phone ?? ''}
            placeholder="(51) 99999-0000"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
        </div>
      </div>

      {/* Plano */}
      <div className="space-y-1.5">
        <Label className="text-white/70 text-sm">Plano <span className="text-red-400">*</span></Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'basico',  label: 'Básico',  desc: 'Funcionalidades essenciais', color: 'peer-checked:border-white/40 peer-checked:bg-white/5' },
            { value: 'pro',     label: 'Pro',     desc: 'Relatórios avançados',       color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
            { value: 'premium', label: 'Premium', desc: 'Acesso completo',            color: 'peer-checked:border-brand-yellow peer-checked:bg-brand-yellow/10' },
          ].map((plan) => (
            <label key={plan.value} className="cursor-pointer">
              <input
                type="radio" name="plan" value={plan.value}
                className="peer sr-only"
                defaultChecked={client.plan === plan.value}
              />
              <div className={`border border-white/10 rounded-xl p-3 transition-all ${plan.color} hover:border-white/20`}>
                <p className="text-white font-medium text-sm">{plan.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{plan.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Status de ativação */}
      <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
          <input
            type="checkbox"
            name="active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="peer sr-only"
          />
          <div className="w-10 h-6 rounded-full bg-white/10 peer-checked:bg-green-500 transition-colors" />
          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : ''}`} />
        </div>
        <span className="text-sm text-white/70 group-hover:text-white transition-colors">
          Cliente ativo na plataforma
        </span>
      </label>

      <SectionTitle>Contrato</SectionTitle>

      {/* Status do contrato */}
      <div className="space-y-1.5">
        <Label className="text-white/70 text-sm">Status do Contrato</Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'ativo',     label: 'Ativo',     color: 'peer-checked:border-green-500 peer-checked:bg-green-500/10' },
            { value: 'pausado',   label: 'Pausado',   color: 'peer-checked:border-yellow-500 peer-checked:bg-yellow-500/10' },
            { value: 'encerrado', label: 'Encerrado', color: 'peer-checked:border-red-500 peer-checked:bg-red-500/10' },
          ].map((s) => (
            <label key={s.value} className="cursor-pointer">
              <input
                type="radio" name="contract_status" value={s.value}
                className="peer sr-only"
                defaultChecked={client.contract_status === s.value}
              />
              <div className={`border border-white/10 rounded-xl p-3 text-center transition-all ${s.color} hover:border-white/20`}>
                <p className="text-white font-medium text-sm">{s.label}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Valor mensal + Data renovação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="monthly_value" className="text-white/70 text-sm">
            Valor Mensal (R$)
          </Label>
          <Input
            id="monthly_value" name="monthly_value"
            type="number" step="0.01" min="0"
            defaultValue={client.monthly_value ?? ''}
            placeholder="2500.00"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="renewal_date" className="text-white/70 text-sm">
            Data de Renovação
          </Label>
          <Input
            id="renewal_date" name="renewal_date"
            type="date"
            defaultValue={client.renewal_date ?? ''}
            className="bg-white/5 border-white/10 text-white focus:border-brand-yellow h-10 [color-scheme:dark]"
          />
        </div>
      </div>

      <SectionTitle>Observações Internas</SectionTitle>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-white/70 text-sm">
          Notas privadas <span className="text-white/30 font-normal text-xs">(visível apenas para a equipe)</span>
        </Label>
        <Textarea
          id="notes" name="notes"
          defaultValue={client.notes ?? ''}
          placeholder="Observações sobre o cliente, preferências, pendências..."
          rows={4}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow resize-none"
        />
      </div>

      <SectionTitle>Equipe Responsável</SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-sm">Gestor de Tráfego <span className="text-red-400">*</span></Label>
          <Select name="traffic_manager_id" defaultValue={client.traffic_manager_id ?? ''} required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-brand-yellow">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {trafficManagers.length === 0
                ? <SelectItem value="_none" disabled className="text-white/40">Nenhum gestor cadastrado</SelectItem>
                : trafficManagers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">
                      {m.full_name ?? m.email}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
          <FieldError messages={state.errors?.traffic_manager_id} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-sm">Social Media <span className="text-red-400">*</span></Label>
          <Select name="social_media_id" defaultValue={client.social_media_id ?? ''} required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-brand-yellow">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {socialMediaTeam.length === 0
                ? <SelectItem value="_none" disabled className="text-white/40">Nenhum social media cadastrado</SelectItem>
                : socialMediaTeam.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">
                      {m.full_name ?? m.email}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
          <FieldError messages={state.errors?.social_media_id} />
        </div>
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
