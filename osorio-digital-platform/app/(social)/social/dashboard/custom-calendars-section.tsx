'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Plus, Calendar, Settings, X, UserPlus, UserMinus, Trash2,
} from 'lucide-react'
import {
  createCalendarAction,
  deleteCalendarAction,
  addCalendarMemberAction,
  removeCalendarMemberAction,
} from './calendar-actions'

type StaffMember = { id: string; full_name: string | null; email: string; role: string }

type CalendarMember = { user_id: string; profiles: StaffMember | null }

type CustomCalendar = {
  id:         string
  name:       string
  created_at: string
  members:    CalendarMember[]
}

const ROLE_LABELS: Record<string, string> = {
  admin:           'Admin',
  traffic_manager: 'Tráfego',
  social_media:    'Social Media',
}

interface Props {
  calendars: CustomCalendar[]
  allStaff:  StaffMember[]
  isAdmin:   boolean
}

// ── Modal de criação ──────────────────────────────────────────────────────────
function CreateModal({ allStaff, onClose }: { allStaff: StaffMember[]; onClose: () => void }) {
  const [name, setName]           = useState('')
  const [selected, setSelected]   = useState<string[]>([])
  const [error, setError]         = useState('')
  const [, startT]                = useTransition()

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function submit() {
    if (!name.trim()) { setError('Nome obrigatório.'); return }
    setError('')
    startT(async () => {
      const res = await createCalendarAction(name.trim(), selected)
      if (res.error) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#333] rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Novo Calendário</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-1.5">
          <label className="text-xs text-white/50 uppercase tracking-wider">Nome do Calendário *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Ex: Osório Digital, Interno, Planejamento..."
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#EACE00]/60 placeholder:text-white/20 transition-colors"
          />
        </div>

        {allStaff.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs text-white/50 uppercase tracking-wider">Membros ({selected.length} selecionados)</label>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {allStaff.map((s) => {
                const isSelected = selected.includes(s.id)
                return (
                  <div
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#EACE00]/40 bg-[#EACE00]/8 text-white'
                        : 'border-white/8 bg-white/3 text-white/50 hover:border-white/15'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'border-[#EACE00] bg-[#EACE00]' : 'border-white/20'
                    }`}>
                      {isSelected && <span className="text-black text-[10px] font-black">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{s.full_name ?? s.email}</p>
                      <p className="text-[10px] text-white/30">{ROLE_LABELS[s.role] ?? s.role}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors">
            Cancelar
          </button>
          <button
            onClick={submit}
            className="flex-1 h-10 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
          >
            Criar Calendário
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Card de calendário personalizado ──────────────────────────────────────────
function CalendarCard({
  calendar,
  allStaff,
  isAdmin,
}: {
  calendar:  CustomCalendar
  allStaff:  StaffMember[]
  isAdmin:   boolean
}) {
  const [showSettings, setShowSettings]   = useState(false)
  const [showDelete,   setShowDelete]     = useState(false)
  const [members,      setMembers]        = useState(calendar.members)
  const [error,        setError]          = useState('')
  const [,             startT]            = useTransition()

  const memberIds = new Set(members.map((m) => m.user_id))
  const nonMembers = allStaff.filter((s) => !memberIds.has(s.id))

  function handleAdd(staff: StaffMember) {
    setError('')
    const optimistic: CalendarMember = { user_id: staff.id, profiles: staff }
    setMembers((prev) => [...prev, optimistic])
    startT(async () => {
      const res = await addCalendarMemberAction(calendar.id, staff.id)
      if (res.error) {
        setMembers((prev) => prev.filter((m) => m.user_id !== staff.id))
        setError(res.error)
      }
    })
  }

  function handleRemove(userId: string) {
    setError('')
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    startT(async () => {
      const res = await removeCalendarMemberAction(calendar.id, userId)
      if (res.error) setError(res.error)
    })
  }

  function handleDelete() {
    startT(async () => { await deleteCalendarAction(calendar.id) })
  }

  return (
    <div className="flex flex-col bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden transition-all hover:border-[#2a2a2a]">
      {/* Card principal */}
      <div className="flex items-center gap-4 p-5">
        <div className="w-11 h-11 rounded-xl bg-[#EACE00]/15 flex items-center justify-center shrink-0">
          <Calendar className="h-5 w-5 text-[#EACE00]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{calendar.name}</p>
          <p className="text-white/30 text-xs mt-0.5">{members.length} membro{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={`p-2 rounded-lg border transition-colors ${
                showSettings
                  ? 'border-[#EACE00]/40 bg-[#EACE00]/10 text-[#EACE00]'
                  : 'border-white/10 text-white/30 hover:text-white hover:border-white/20'
              }`}
              title="Gerenciar membros"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
          <Link
            href={`/social/calendar/custom/${calendar.id}`}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-[#EACE00] hover:text-black hover:border-[#EACE00] font-medium transition-all"
          >
            Abrir
          </Link>
        </div>
      </div>

      {/* Painel de configurações */}
      {showSettings && (
        <div className="border-t border-[#222] p-4 space-y-4 bg-[#0a0a0a]">
          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* Membros atuais */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-white/40 uppercase tracking-wider">Membros</p>
              {members.map((m) => {
                const staff = m.profiles
                return (
                  <div key={m.user_id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#EACE00]/20 flex items-center justify-center text-[#EACE00] text-[10px] font-black shrink-0">
                        {(staff?.full_name ?? staff?.email ?? '?')[0].toUpperCase()}
                      </div>
                      <p className="text-xs text-white/70 truncate">{staff?.full_name ?? staff?.email ?? 'Usuário'}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="p-1 rounded text-white/20 hover:text-red-400 transition-colors shrink-0"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Adicionar membros */}
          {nonMembers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-white/40 uppercase tracking-wider">Adicionar</p>
              {nonMembers.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-[10px] font-black shrink-0">
                      {(s.full_name ?? s.email)[0].toUpperCase()}
                    </div>
                    <p className="text-xs text-white/40 truncate">{s.full_name ?? s.email}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(s)}
                    className="flex items-center gap-1 px-2 py-1 rounded border border-[#EACE00]/30 text-[#EACE00] text-[10px] hover:bg-[#EACE00]/10 transition-colors shrink-0"
                  >
                    <UserPlus className="h-3 w-3" />
                    Adicionar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Deletar */}
          <div className="pt-1 border-t border-white/5">
            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-1.5 text-xs text-red-400/50 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Excluir calendário
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/50 flex-1">Tem certeza? Isso excluirá todos os posts.</p>
                <button onClick={() => setShowDelete(false)} className="text-xs text-white/30 hover:text-white px-2 py-1 transition-colors">Cancelar</button>
                <button onClick={handleDelete} className="text-xs text-white px-2 py-1 bg-red-500 rounded hover:bg-red-600 transition-colors">Excluir</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Seção principal ───────────────────────────────────────────────────────────
export function CustomCalendarsSection({ calendars, allStaff, isAdmin }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Calendários Personalizados</h2>
          <p className="text-white/30 text-xs mt-0.5">Calendários internos da equipe, sem vínculo com cliente</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-[#EACE00] hover:text-black hover:border-[#EACE00] font-medium transition-all"
          >
            <Plus className="h-4 w-4" />
            Novo Calendário
          </button>
        )}
      </div>

      {calendars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 border border-dashed border-white/8 rounded-2xl">
          <Calendar className="h-8 w-8 text-white/10" />
          <p className="text-white/25 text-sm">
            {isAdmin ? 'Nenhum calendário criado ainda.' : 'Você não é membro de nenhum calendário personalizado.'}
          </p>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="text-[#EACE00] text-xs hover:underline mt-1">
              Criar primeiro calendário
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendar={cal}
              allStaff={allStaff}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateModal allStaff={allStaff} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
