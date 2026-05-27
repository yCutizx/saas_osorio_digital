'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { AlertCircle, Loader2, Eye, EyeOff, RefreshCw, HandCoins, Phone, Handshake } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCommercialSellerAction, type FormState } from './actions'

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
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Criando...</> : 'Cadastrar'}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

export function NewSellerForm() {
  const [state, action] = useFormState<FormState, FormData>(createCommercialSellerAction, {})
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)

  return (
    <form action={action} className="space-y-6">
      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {/* Nome + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name" className="text-[#888] text-xs font-medium uppercase tracking-wider">
            Nome Completo <span className="text-red-400">*</span>
          </Label>
          <Input
            id="full_name" name="full_name"
            placeholder="Ex: Lucas Pereira"
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
            type="email" placeholder="lucas@email.com"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
          />
          <FieldError messages={state.errors?.email} />
        </div>
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Função <span className="text-red-400">*</span></Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'vendedor', label: 'Vendedor', icon: HandCoins, color: 'peer-checked:border-yellow-500 peer-checked:bg-yellow-500/10' },
            { value: 'sdr',      label: 'SDR',      icon: Phone,     color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
            { value: 'closer',   label: 'Closer',   icon: Handshake, color: 'peer-checked:border-green-500 peer-checked:bg-green-500/10' },
          ].map((r) => (
            <label key={r.value} className="cursor-pointer">
              <input type="radio" name="role" value={r.value} className="peer sr-only" defaultChecked={r.value === 'closer'} />
              <div className={`flex flex-col items-center gap-2 border border-white/10 rounded-xl p-4 transition-all ${r.color} hover:border-white/20`}>
                <r.icon className="h-5 w-5 text-white/40" />
                <p className="text-white font-medium text-xs text-center">{r.label}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-white/30">Vendedor = ciclo completo. SDR = prospecção. Closer = fechamento. Pode editar depois.</p>
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

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  )
}
