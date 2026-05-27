'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { AlertCircle, Loader2, HandCoins, Phone, Handshake } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateCommercialSellerAction, type FormState } from './actions'
import type { SellerRole } from '@/types'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 h-11 rounded-lg bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#EACE00]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : 'Salvar'}
    </button>
  )
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-red-400 text-xs mt-1">{messages[0]}</p>
}

interface Props {
  id:              string
  initialFullName: string
  email:           string
  initialRole:     SellerRole
}

export function EditSellerForm({ id, initialFullName, email, initialRole }: Props) {
  const [state, action] = useFormState<FormState, FormData>(updateCommercialSellerAction, {})

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="seller_id" value={id} />

      {state.message && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {state.ok && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm">
          Alterações salvas.
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="full_name" className="text-[#888] text-xs font-medium uppercase tracking-wider">
          Nome Completo <span className="text-red-400">*</span>
        </Label>
        <Input
          id="full_name" name="full_name"
          defaultValue={initialFullName}
          required
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#EACE00]/60 h-10"
        />
        <FieldError messages={state.errors?.full_name} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">E-mail</Label>
        <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/5 text-sm text-white/40">{email}</div>
        <p className="text-[10px] text-white/30">E-mail não pode ser alterado por aqui.</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Função <span className="text-red-400">*</span></Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'vendedor', label: 'Vendedor', icon: HandCoins, color: 'peer-checked:border-yellow-500 peer-checked:bg-yellow-500/10' },
            { value: 'sdr',      label: 'SDR',      icon: Phone,     color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
            { value: 'closer',   label: 'Closer',   icon: Handshake, color: 'peer-checked:border-green-500 peer-checked:bg-green-500/10' },
          ].map((r) => (
            <label key={r.value} className="cursor-pointer">
              <input type="radio" name="role" value={r.value} className="peer sr-only" defaultChecked={r.value === initialRole} />
              <div className={`flex flex-col items-center gap-2 border border-white/10 rounded-xl p-4 transition-all ${r.color} hover:border-white/20`}>
                <r.icon className="h-5 w-5 text-white/40" />
                <p className="text-white font-medium text-xs text-center">{r.label}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-white/30">Mudar a função NÃO afeta comissões já geradas.</p>
        <FieldError messages={state.errors?.role} />
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href={`/admin/commercial/team/${id}`}
          className="flex-1 h-11 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 text-sm font-medium flex items-center justify-center transition-colors"
        >
          Cancelar
        </Link>
        <SubmitButton />
      </div>
    </form>
  )
}
