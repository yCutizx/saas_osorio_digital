'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createPipelineAction } from '@/app/actions/pipeline'

type Staff = { id: string; full_name: string | null; email: string; role: string }

interface Props {
  staff: Staff[]
  currentUserId: string
  cancelHref: string
  successPathPrefix?: string  // default /admin/pipeline
}

const COLORS = ['#EACE00', '#3b82f6', '#8b5cf6', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899']

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', social_media: 'Social Media', traffic_manager: 'Tráfego',
}

export function NewPipelineForm({ staff, currentUserId, cancelHref, successPathPrefix = '/admin/pipeline' }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [members, setMembers] = useState<Set<string>>(new Set([currentUserId]))

  function toggleMember(id: string) {
    if (id === currentUserId) return
    setMembers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (name.trim().length < 2) { setErr('Nome muito curto'); return }
    startTransition(async () => {
      const fd = new FormData()
      fd.set('name', name)
      fd.set('description', description)
      fd.set('color', color)
      Array.from(members).forEach((id) => fd.append('member_ids', id))
      const result = await createPipelineAction(fd)
      if (result.error) { setErr(result.error); toast.error(result.error); return }
      toast.success('Pipeline criado!')
      router.push(`${successPathPrefix}/${result.id}`)
    })
  }

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00] placeholder:text-white/20'

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {err && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {err}
        </div>
      )}

      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Nome do Pipeline *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vendas B2B" required className={inputCls} />
      </div>

      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Descrição (opcional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Sobre o que é este pipeline?" className={cn(inputCls, 'resize-none')} />
      </div>

      <div>
        <label className="text-xs text-white/50 mb-2 block">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ background: c }}
              className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-white/40 scale-110' : 'opacity-60 hover:opacity-100'}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-white/50 mb-2 block">Membros</label>
        <div className="space-y-1.5">
          {staff.map((s) => {
            const isSelf = s.id === currentUserId
            const isSelected = members.has(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleMember(s.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
                  isSelected
                    ? 'bg-[#EACE00]/8 border-[#EACE00]/30'
                    : 'bg-[#0a0a0a] border-[#222] hover:border-[#333]',
                )}
              >
                <div className={cn('w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors', isSelected ? 'bg-[#EACE00] border-[#EACE00]' : 'border-[#444]')}>
                  {isSelected && <Check className="h-3 w-3 text-black" />}
                </div>
                <div className="w-7 h-7 rounded-full bg-[#EACE00]/20 flex items-center justify-center text-[#EACE00] text-[10px] font-black shrink-0">
                  {((s.full_name ?? s.email)[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{s.full_name ?? s.email}</p>
                  <p className="text-[10px] text-white/30">{ROLE_LABELS[s.role] ?? s.role}{isSelf ? ' · você' : ''}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-white/30">
        Pipeline será criado com etapas padrão: Lead Novo, Qualificado, Proposta, Negociação, Fechado, Perdido.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          disabled={pending}
          className="flex-1 py-2.5 rounded-xl border border-[#333] text-sm text-white/50 hover:text-white hover:border-[#555] transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 py-2.5 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Criando...</> : 'Criar Pipeline'}
        </button>
      </div>
    </form>
  )
}
