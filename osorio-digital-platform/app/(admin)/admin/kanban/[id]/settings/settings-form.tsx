'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Check, CheckCircle2, AlertCircle } from 'lucide-react'
import { updateBoardSettingsAction } from './actions'
import { cn } from '@/lib/utils'

type Member     = { id: string; full_name: string | null; email: string; role: string }
type ClientItem = { id: string; name: string }

interface Props {
  boardId:       string
  boardName:     string
  clientId:      string | null
  currentMemberIds: string[]
  allStaff:      Member[]
  clients:       ClientItem[]
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', traffic_manager: 'Tráfego', social_media: 'Social Media',
}

export function SettingsForm({
  boardId, boardName, clientId, currentMemberIds, allStaff, clients,
}: Props) {
  const [members, setMembers] = useState<Set<string>>(new Set(currentMemberIds))
  const [state, action]       = useFormState<{ error?: string; success?: boolean }, FormData>(
    updateBoardSettingsAction,
    {},
  )

  function toggleMember(id: string) {
    setMembers((p) => {
      const next = new Set(p)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="board_id" value={boardId} />
      {/* Pass selected members as hidden inputs */}
      {Array.from(members).map((id) => (
        <input key={id} type="hidden" name="member_ids" value={id} />
      ))}

      {/* Feedback */}
      {state.error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Configurações salvas com sucesso.
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="text-xs text-white/50 mb-1.5 block">Nome do Quadro *</label>
        <input
          name="name"
          required
          defaultValue={boardName}
          className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00] placeholder:text-white/20"
        />
      </div>

      {/* Cliente */}
      {clients.length > 0 && (
        <div>
          <label className="text-xs text-white/50 mb-1.5 block">Cliente vinculado</label>
          <select
            name="client_id"
            defaultValue={clientId ?? ''}
            className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#EACE00] [color-scheme:dark]"
          >
            <option value="">Nenhum cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Membros */}
      <div>
        <p className="text-xs text-white/50 mb-3">
          Membros — {members.size} selecionado{members.size !== 1 ? 's' : ''}
        </p>
        <div className="space-y-1.5">
          {allStaff.map((s) => {
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
                <div className="w-8 h-8 rounded-full bg-[#EACE00]/20 flex items-center justify-center text-[#EACE00] text-xs font-black shrink-0">
                  {((s.full_name ?? s.email)[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{s.full_name ?? s.email}</p>
                  <p className="text-xs text-white/30">{ROLE_LABELS[s.role] ?? s.role}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-2.5 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
      >
        Salvar alterações
      </button>
    </form>
  )
}
