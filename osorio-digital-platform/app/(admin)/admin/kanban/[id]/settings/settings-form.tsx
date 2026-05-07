'use client'

import { useState, useTransition } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { addBoardMemberAction, removeBoardMemberAction } from './actions'

type Member = { id: string; full_name: string | null; email: string; role: string }

interface Props {
  boardId:   string
  members:   Member[]
  allStaff:  Member[]
}

const ROLE_LABELS: Record<string, string> = {
  admin:           'Admin',
  traffic_manager: 'Tráfego',
  social_media:    'Social Media',
}

export function SettingsForm({ boardId, members, allStaff }: Props) {
  const [memberList, setMemberList]   = useState<Member[]>(members)
  const [error, setError]             = useState('')
  const [, startT]                    = useTransition()

  const memberIds = new Set(memberList.map((m) => m.id))
  const nonMembers = allStaff.filter((s) => !memberIds.has(s.id))

  function handleAdd(staff: Member) {
    setError('')
    setMemberList((prev) => [...prev, staff])
    startT(async () => {
      const res = await addBoardMemberAction(boardId, staff.id)
      if (res.error) {
        setMemberList((prev) => prev.filter((m) => m.id !== staff.id))
        setError(res.error)
      }
    })
  }

  function handleRemove(staffId: string) {
    setError('')
    setMemberList((prev) => prev.filter((m) => m.id !== staffId))
    startT(async () => {
      const res = await removeBoardMemberAction(boardId, staffId)
      if (res.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Current members */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider text-xs">
          Membros ({memberList.length})
        </h3>
        {memberList.length === 0 ? (
          <p className="text-white/30 text-sm italic">Nenhum membro adicionado.</p>
        ) : (
          <div className="space-y-2">
            {memberList.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#EACE00]/20 flex items-center justify-center text-[#EACE00] text-xs font-black">
                    {(m.full_name ?? m.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{m.full_name ?? m.email}</p>
                    <p className="text-xs text-white/40">{ROLE_LABELS[m.role] ?? m.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(m.id)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remover membro"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add members */}
      {nonMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider text-xs">
            Adicionar membro
          </h3>
          <div className="space-y-2">
            {nonMembers.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs font-black">
                    {(s.full_name ?? s.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/70">{s.full_name ?? s.email}</p>
                    <p className="text-xs text-white/30">{ROLE_LABELS[s.role] ?? s.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EACE00]/30 text-[#EACE00] text-xs hover:bg-[#EACE00]/10 transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
