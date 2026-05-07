'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { createTeamMemberAction, type FormState } from './actions'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { AlertCircle, Loader2, Eye, EyeOff, RefreshCw, TrendingUp, Camera } from 'lucide-react'

type Client = { id: string; name: string }

function generatePassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '@#$!'
  const all = upper + lower + digits + special
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
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#EACE00]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : 'Criar Funcionário'}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewMemberForm({ clients }: { clients: Client[] }) {
  const [state, action] = useFormState<FormState, FormData>(createTeamMemberAction, {})
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [selectedClients, setSelectedClients] = useState<string[]>([])

  function toggleClient(id: string) {
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  return (
    <form action={action} className="space-y-6">
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Nome + E-mail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Nome Completo <span className="text-red-400">*</span>
          </Label>
          <Input
            id="full_name" name="full_name"
            placeholder="João Silva"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.full_name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            E-mail <span className="text-red-400">*</span>
          </Label>
          <Input
            id="email" name="email"
            type="email" placeholder="joao@email.com"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.email} />
        </div>
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Função <span className="text-red-400">*</span></Label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'traffic_manager', label: 'Gestor de Tráfego', icon: TrendingUp, color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
            { value: 'social_media',    label: 'Social Media',       icon: Camera,     color: 'peer-checked:border-purple-500 peer-checked:bg-purple-500/10' },
          ].map((r) => (
            <label key={r.value} className="cursor-pointer">
              <input type="radio" name="role" value={r.value} className="peer sr-only" defaultChecked={r.value === 'traffic_manager'} />
              <div className={`flex items-center gap-3 border border-white/10 rounded-xl p-4 transition-all ${r.color} hover:border-white/20`}>
                <r.icon className="h-5 w-5 text-white/40" />
                <p className="text-white font-medium text-sm">{r.label}</p>
              </div>
            </label>
          ))}
        </div>
        <FieldError messages={state.errors?.role} />
      </div>

      {/* Senha */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[#888] text-xs font-medium uppercase tracking-wider">Senha de Acesso</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="password" name="password"
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
            onClick={() => { setPassword(generatePassword()); setShowPwd(true) }}
            className="shrink-0 h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Gerar
          </button>
        </div>
        {!password && <p className="text-white/30 text-xs">Se em branco, uma senha segura será gerada automaticamente.</p>}
        <FieldError messages={state.errors?.password} />
      </div>

      {/* Clientes */}
      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Clientes Atribuídos <span className="text-white/30 font-normal text-xs">(pode alterar depois)</span>
        </Label>
        {clients.length === 0 ? (
          <p className="text-sm text-white/30 italic">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {clients.map((c) => {
              const selected = selectedClients.includes(c.id)
              return (
                <label key={c.id} className="cursor-pointer">
                  {selected && <input type="hidden" name="client_ids" value={c.id} />}
                  <div
                    onClick={() => toggleClient(c.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selected
                        ? 'border-[#EACE00]/40 bg-[#EACE00]/8 text-white'
                        : 'border-white/10 bg-white/3 text-white/50 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      selected ? 'border-[#EACE00] bg-[#EACE00]' : 'border-white/20'
                    }`}>
                      {selected && <span className="text-black text-[10px] font-black">✓</span>}
                    </div>
                    <span className="text-sm font-medium truncate">{c.name}</span>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
