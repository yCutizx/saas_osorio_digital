'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createClientAction, type FormState } from './actions'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Button }   from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'

const INDUSTRIES = [
  'E-commerce',
  'Restaurante / Food',
  'Saúde e Bem-estar',
  'Educação',
  'Imobiliário',
  'Serviços Profissionais',
  'Tecnologia',
  'Moda e Beleza',
  'Automotivo',
  'Outro',
]

type TeamMember = { id: string; full_name: string | null; email: string }

interface Props {
  trafficManagers: TeamMember[]
  socialMediaTeam: TeamMember[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-brand-yellow text-brand-black font-semibold hover:bg-brand-yellow/90 disabled:opacity-60"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Criando cliente...
        </span>
      ) : (
        'Criar Cliente'
      )}
    </Button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewClientForm({ trafficManagers, socialMediaTeam }: Props) {
  const [state, action] = useFormState<FormState, FormData>(createClientAction, {})

  return (
    <form action={action} className="space-y-5">
      {/* Erro geral */}
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Linha 1: Nome + Segmento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-white/70 text-sm">
            Nome da Empresa <span className="text-red-400">*</span>
          </Label>
          <Input
            id="company_name"
            name="company_name"
            placeholder="Ex: Café do João"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
          <FieldError messages={state.errors?.company_name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industry" className="text-white/70 text-sm">
            Segmento <span className="text-red-400">*</span>
          </Label>
          <Select name="industry" required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-brand-yellow">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind} value={ind} className="text-white focus:bg-white/10">
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError messages={state.errors?.industry} />
        </div>
      </div>

      {/* Linha 2: E-mail + Telefone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact_email" className="text-white/70 text-sm">
            E-mail do Contato <span className="text-red-400">*</span>
          </Label>
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            placeholder="contato@empresa.com"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
          <p className="text-white/30 text-xs">Será usado como login do cliente na plataforma.</p>
          <FieldError messages={state.errors?.contact_email} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact_phone" className="text-white/70 text-sm">
            Telefone
          </Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            placeholder="(51) 99999-0000"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-brand-yellow h-10"
          />
          <FieldError messages={state.errors?.contact_phone} />
        </div>
      </div>

      {/* Linha 3: Plano */}
      <div className="space-y-1.5">
        <Label className="text-white/70 text-sm">
          Plano <span className="text-red-400">*</span>
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'basico',  label: 'Básico',  desc: 'Funcionalidades essenciais',  color: 'peer-checked:border-white/40 peer-checked:bg-white/5' },
            { value: 'pro',     label: 'Pro',     desc: 'Relatórios avançados',        color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
            { value: 'premium', label: 'Premium', desc: 'Acesso completo',             color: 'peer-checked:border-brand-yellow peer-checked:bg-brand-yellow/10' },
          ].map((plan) => (
            <label key={plan.value} className="cursor-pointer">
              <input type="radio" name="plan" value={plan.value} className="peer sr-only" defaultChecked={plan.value === 'basico'} />
              <div className={`border border-white/10 rounded-xl p-3 transition-all ${plan.color} hover:border-white/20`}>
                <p className="text-white font-medium text-sm">{plan.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{plan.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <FieldError messages={state.errors?.plan} />
      </div>

      {/* Linha 4: Equipe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-sm">
            Gestor de Tráfego <span className="text-red-400">*</span>
          </Label>
          <Select name="traffic_manager_id" required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-brand-yellow">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {trafficManagers.length === 0 ? (
                <SelectItem value="_none" disabled className="text-white/40">
                  Nenhum gestor cadastrado
                </SelectItem>
              ) : (
                trafficManagers.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">
                    {m.full_name ?? m.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FieldError messages={state.errors?.traffic_manager_id} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-sm">
            Social Media <span className="text-red-400">*</span>
          </Label>
          <Select name="social_media_id" required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-brand-yellow">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {socialMediaTeam.length === 0 ? (
                <SelectItem value="_none" disabled className="text-white/40">
                  Nenhum social media cadastrado
                </SelectItem>
              ) : (
                socialMediaTeam.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white focus:bg-white/10">
                    {m.full_name ?? m.email}
                  </SelectItem>
                ))
              )}
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
