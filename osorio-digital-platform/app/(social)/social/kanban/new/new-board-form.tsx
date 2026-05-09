'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createBoardAction, type FormState } from '../actions'
import { Plus, X, GripVertical, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = ['#EACE00', '#3b82f6', '#8b5cf6', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899']

const DEFAULT_COLUMNS = [
  { id: 'idea',       label: 'Ideia',     color: '#8b5cf6' },
  { id: 'production', label: 'Produção',  color: '#3b82f6' },
  { id: 'approval',   label: 'Aprovação', color: '#f59e0b' },
  { id: 'scheduled',  label: 'Agendado',  color: '#06b6d4' },
  { id: 'published',  label: 'Publicado', color: '#22c55e' },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', social_media: 'Social Media', traffic_manager: 'Tráfego',
}

type Column      = { id: string; label: string; color: string }
type ClientItem  = { id: string; name: string }
type StaffMember = { id: string; full_name: string | null; email: string; role: string }

interface Props {
  clients:       ClientItem[]
  staff:         StaffMember[]
  currentUserId: string
}

const INIT: FormState = {}

const INPUT_CLS = 'w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00] placeholder:text-white/20'

export function NewBoardForm({ clients, staff, currentUserId }: Props) {
  const router = useRouter()
  const [state, dispatch] = useFormState(createBoardAction, INIT)
  const [color,   setColor]   = useState(COLORS[0])
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS)
  const [members, setMembers] = useState<Set<string>>(new Set([currentUserId]))

  function addColumn() {
    setColumns((p) => [...p, { id: `col_${Date.now()}`, label: 'Nova Coluna', color: '#555555' }])
  }
  function removeColumn(id: string)                { setColumns((p) => p.filter((c) => c.id !== id)) }
  function updateLabel(id: string, label: string)  { setColumns((p) => p.map((c) => c.id === id ? { ...c, label } : c)) }
  function updateColColor(id: string, val: string) { setColumns((p) => p.map((c) => c.id === id ? { ...c, color: val } : c)) }
  function toggleMember(id: string) {
    setMembers((p) => {
      const next = new Set(p)
      if (id === currentUserId) return next  // cannot remove self
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <form action={dispatch} className="space-y-7">
      <input type="hidden" name="color"        value={color} />
      <input type="hidden" name="columns_json" value={JSON.stringify(columns)} />
      {/* member_ids — one hidden input per selected member */}
      {Array.from(members).map((id) => (
        <input key={id} type="hidden" name="member_ids" value={id} />
      ))}

      {state.message && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {state.message}
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Nome do Quadro *</label>
        <input name="name" required placeholder="Ex: Conteúdo Clientes — Maio"
          className={INPUT_CLS} />
        {state.errors?.name && <p className="text-red-400 text-xs mt-1">{state.errors.name[0]}</p>}
      </div>

      {/* Descrição */}
      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Descrição (opcional)</label>
        <textarea name="description" rows={2} placeholder="Sobre o que é este quadro?"
          className={cn(INPUT_CLS, 'resize-none')} />
      </div>

      {/* Cliente vinculado */}
      {clients.length > 0 && (
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Vincular cliente (opcional)</label>
          <select name="client_id"
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00] [color-scheme:dark]">
            <option value="">Nenhum cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Cor */}
      <div>
        <label className="text-xs text-white/50 mb-2 block">Cor de destaque</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              style={{ background: c }}
              className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-white/40 scale-110' : 'opacity-60 hover:opacity-100'}`} />
          ))}
        </div>
      </div>

      {/* Membros */}
      {staff.length > 0 && (
        <div>
          <label className="text-xs text-white/50 mb-2 block">Membros</label>
          <div className="space-y-1.5">
            {staff.map((s) => {
              const isSelf     = s.id === currentUserId
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
                  <div className={cn(
                    'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                    isSelected ? 'bg-[#EACE00] border-[#EACE00]' : 'border-[#444]',
                  )}>
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
      )}

      {/* Colunas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-white/50">Colunas</label>
          <button type="button" onClick={addColumn}
            className="flex items-center gap-1 text-xs text-[#EACE00] hover:opacity-80 transition-opacity">
            <Plus className="h-3.5 w-3.5" />Adicionar coluna
          </button>
        </div>
        <div className="space-y-2">
          {columns.map((col) => (
            <div key={col.id}
              className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2">
              <GripVertical className="h-4 w-4 text-white/20 shrink-0" />
              <input type="color" value={col.color}
                onChange={(e) => updateColColor(col.id, e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0" />
              <input value={col.label} onChange={(e) => updateLabel(col.id, e.target.value)}
                className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
              {columns.length > 1 && (
                <button type="button" onClick={() => removeColumn(col.id)}
                  className="text-white/20 hover:text-red-400 transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl border border-[#333] text-sm text-white/50 hover:text-white hover:border-[#555] transition-colors">
          Cancelar
        </button>
        <button type="submit"
          className="flex-1 py-2.5 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors">
          Criar Quadro
        </button>
      </div>
    </form>
  )
}
