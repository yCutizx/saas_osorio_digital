'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { createClientAction, type FormState } from './actions'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Button }   from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react'

const INDUSTRIES = [
  'E-commerce', 'Restaurante / Food', 'Saúde e Bem-estar', 'Educação',
  'Imobiliário', 'Serviços Profissionais', 'Tecnologia', 'Moda e Beleza',
  'Automotivo', 'Outro',
]

type TeamMember = { id: string; full_name: string | null; email: string }

interface Props {
  trafficManagers: TeamMember[]
  socialMediaTeam: TeamMember[]
}

function generatePassword(): string {
  const upper   = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const special = '@#$!'
  const all     = upper + lower + digits + special
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)]
  for (let i = 4; i < 12; i++) pwd += all[Math.floor(Math.random() * all.length)]
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-[#EACE00] text-black font-semibold hover:bg-[#EACE00]/90 disabled:opacity-60"
    >
      {pending
        ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Criando cliente...</span>
        : 'Criar Cliente'}
    </Button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewClientForm({ trafficManagers, socialMediaTeam }: Props) {
  const [state, action] = useFormState<FormState, FormData>(createClientAction, {})
  const [password, setPassword]   = useState('')
  const [showPwd, setShowPwd]     = useState(false)

  return (
    <form action={action} className="space-y-5">
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Nome + Segmento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="company_name" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Nome da Empresa <span className="text-red-400">*</span>
          </Label>
          <Input
            id="company_name" name="company_name"
            placeholder="Ex: Café do João" required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.company_name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="industry" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Segmento <span className="text-red-400">*</span>
          </Label>
          <Select name="industry" required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-[#EACE00]/60">
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
          <Label htmlFor="contact_email" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            E-mail do Contato <span className="text-red-400">*</span>
          </Label>
          <Input
            id="contact_email" name="contact_email"
            type="email" placeholder="contato@empresa.com" required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <p className="text-white/30 text-xs">Será usado como login do cliente na plataforma.</p>
          <FieldError messages={state.errors?.contact_email} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact_phone" className="text-[#888] text-xs font-medium uppercase tracking-wider">Telefone</Label>
          <Input
            id="contact_phone" name="contact_phone"
            type="tel" placeholder="(51) 99999-0000"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.contact_phone} />
        </div>
      </div>

      {/* Senha de acesso */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Senha de Acesso
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="password"
              name="password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para gerar automaticamente"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => { const p = generatePassword(); setPassword(p); setShowPwd(true) }}
            title="Gerar senha automática"
            className="shrink-0 h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Gerar
          </button>
        </div>
        {password && password.length < 8 && (
          <p className="text-red-400 text-xs">Mínimo de 8 caracteres.</p>
        )}
        {!password && (
          <p className="text-white/30 text-xs">Se deixado em branco, uma senha segura será gerada automaticamente.</p>
        )}
        <FieldError messages={state.errors?.password} />
      </div>

      {/* Plano */}
      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Plano <span className="text-red-400">*</span></Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'basico',  label: 'Básico',  desc: 'Funcionalidades essenciais',  color: 'peer-checked:border-white/40 peer-checked:bg-white/5' },
            { value: 'pro',     label: 'Pro',     desc: 'Relatórios avançados',        color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
            { value: 'premium', label: 'Premium', desc: 'Acesso completo',             color: 'peer-checked:border-[#EACE00] peer-checked:bg-[#EACE00]/10' },
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

      {/* Equipe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Gestor de Tráfego <span className="text-red-400">*</span></Label>
          <Select name="traffic_manager_id" required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-[#EACE00]/60">
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
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Social Media <span className="text-red-400">*</span></Label>
          <Select name="social_media_id" required>
            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 focus:border-[#EACE00]/60">
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
