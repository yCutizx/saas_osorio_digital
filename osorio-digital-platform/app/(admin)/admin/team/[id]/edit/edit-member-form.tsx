'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { updateTeamMemberAction, resetPasswordAction, type FormState } from './actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, TrendingUp, Camera, Copy, Check, KeyRound } from 'lucide-react'

type Client = { id: string; name: string }

type MemberData = {
  id: string
  full_name: string | null
  email: string
  role: string
  active: boolean
  assignedClientIds: string[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-lg bg-[#EACE00] text-black font-semibold text-sm hover:bg-[#EACE00]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
    >
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</> : 'Salvar Alterações'}
    </button>
  )
}

function ResetPasswordSection({ email }: { email: string }) {
  const [state, action] = useFormState<FormState, FormData>(resetPasswordAction, {})
  const { pending } = useFormStatus()
  const [copied, setCopied] = useState(false)

  function copyLink() {
    if (!state.resetLink) return
    navigator.clipboard.writeText(state.resetLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-white/3 border border-white/8 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-white/40" />
        <h3 className="text-sm font-semibold text-white/70">Resetar Senha</h3>
      </div>

      {state.resetLink ? (
        <div className="space-y-2">
          <p className="text-xs text-green-400">Link gerado com sucesso. Envie para o funcionário:</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={state.resetLink}
              className="bg-white/5 border-white/10 text-white/60 text-xs h-9 font-mono"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : (
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          {state.message && (
            <p className="text-xs text-red-400 mb-2">{state.message}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full h-9 rounded-lg border border-white/10 bg-white/5 text-white/50 text-sm hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gerando...</>
              : 'Gerar link de reset de senha'}
          </button>
        </form>
      )}
    </div>
  )
}

export function EditMemberForm({ member, clients }: { member: MemberData; clients: Client[] }) {
  const [state, action] = useFormState<FormState, FormData>(updateTeamMemberAction, {})
  const [isActive, setIsActive] = useState(member.active)
  const [selectedClients, setSelectedClients] = useState<string[]>(member.assignedClientIds)

  function toggleClient(id: string) {
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        <input type="hidden" name="member_id" value={member.id} />

        {state.message && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.message}
          </div>
        )}

        {/* Nome + E-mail (readonly) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-[#888] text-xs font-medium uppercase tracking-wider">
              Nome Completo <span className="text-red-400">*</span>
            </Label>
            <Input
              id="full_name" name="full_name"
              defaultValue={member.full_name ?? ''}
              required
              className="bg-white/5 border-white/10 text-white focus:border-[#EACE00]/60 h-10"
            />
            {state.errors?.full_name && <p className="text-red-400 text-xs">{state.errors.full_name[0]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">E-mail</Label>
            <Input
              value={member.email}
              readOnly
              className="bg-white/3 border-white/8 text-white/40 h-10 cursor-not-allowed"
            />
            <p className="text-white/25 text-xs">O e-mail não pode ser alterado.</p>
          </div>
        </div>

        {/* Função */}
        <div className="space-y-1.5">
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Função <span className="text-red-400">*</span></Label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'traffic_manager', label: 'Gestor de Tráfego', icon: TrendingUp, color: 'peer-checked:border-blue-500 peer-checked:bg-blue-500/10' },
              { value: 'social_media',    label: 'Social Media',       icon: Camera,     color: 'peer-checked:border-purple-500 peer-checked:bg-purple-500/10' },
            ].map((r) => (
              <label key={r.value} className="cursor-pointer">
                <input type="radio" name="role" value={r.value} className="peer sr-only" defaultChecked={member.role === r.value} />
                <div className={`flex items-center gap-3 border border-white/10 rounded-xl p-4 transition-all ${r.color} hover:border-white/20`}>
                  <r.icon className="h-5 w-5 text-white/40" />
                  <p className="text-white font-medium text-sm">{r.label}</p>
                </div>
              </label>
            ))}
          </div>
          {state.errors?.role && <p className="text-red-400 text-xs">{state.errors.role[0]}</p>}
        </div>

        {/* Status ativo */}
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
            Funcionário ativo
          </span>
        </label>

        {/* Clientes */}
        <div className="space-y-1.5">
          <Label className="text-[#888] text-xs font-medium uppercase tracking-wider">Clientes Atribuídos</Label>
          {/* Hidden inputs for selected clients */}
          {selectedClients.map((id) => (
            <input key={id} type="hidden" name="client_ids" value={id} />
          ))}
          {clients.length === 0 ? (
            <p className="text-sm text-white/30 italic">Nenhum cliente disponível.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {clients.map((c) => {
                const selected = selectedClients.includes(c.id)
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleClient(c.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
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
                )
              })}
            </div>
          )}
        </div>

        <SubmitButton />
      </form>

      {/* Reset de senha — form separado */}
      <ResetPasswordSection email={member.email} />
    </div>
  )
}
