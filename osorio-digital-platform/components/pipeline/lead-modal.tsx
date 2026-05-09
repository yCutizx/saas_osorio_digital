'use client'

import { useState, useTransition } from 'react'
import { X, Phone, Mail, MessageCircle, Video, FileText, Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  updateLeadAction,
  createActivityAction,
  toggleActivityAction,
} from '@/app/actions/pipeline'
import type { Lead } from './lead-card'

type Stage = { id: string; name: string; order: number; color: string }
type Member = { id: string; full_name: string; role: string }
type Activity = {
  id: string
  lead_id: string
  user_id: string
  type: string
  description: string
  scheduled_at: string | null
  done: boolean
  created_at: string
}

interface LeadModalProps {
  lead: Lead
  stages: Stage[]
  members: Member[]
  activities: Activity[]
  onClose: () => void
  onUpdate: () => void
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call:      <Phone className="h-3.5 w-3.5" />,
  email:     <Mail className="h-3.5 w-3.5" />,
  whatsapp:  <MessageCircle className="h-3.5 w-3.5" />,
  meeting:   <Video className="h-3.5 w-3.5" />,
  note:      <FileText className="h-3.5 w-3.5" />,
}

const SOURCE_OPTIONS = [
  { value: 'manual',    label: 'Manual' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'meta_ads',  label: 'Meta Ads' },
  { value: 'google',    label: 'Google' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site',      label: 'Site' },
]

const ACTIVITY_TYPES = [
  { value: 'call',     label: 'Ligação' },
  { value: 'email',    label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'meeting',  label: 'Reunião' },
  { value: 'note',     label: 'Nota' },
]

export function LeadModal({ lead, stages, members, activities, onClose, onUpdate }: LeadModalProps) {
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(lead.name)
  const [company, setCompany] = useState(lead.company ?? '')
  const [email, setEmail] = useState(lead.email ?? '')
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [source, setSource] = useState(lead.source)
  const [estimatedValue, setEstimatedValue] = useState(lead.estimated_value?.toString() ?? '')
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [responsibleId, setResponsibleId] = useState(lead.responsible?.id ?? '')
  const [stage, setStage] = useState(lead.stage)

  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState('call')
  const [activityDesc, setActivityDesc] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [activityDone, setActivityDone] = useState(false)

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateLeadAction(lead.id, {
          name,
          company: company || undefined,
          email: email || undefined,
          phone: phone || undefined,
          source,
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
          notes: notes || undefined,
          responsible_id: responsibleId || null,
          stage,
        })
        toast.success('Lead atualizado!')
        onUpdate()
      } catch {
        toast.error('Erro ao atualizar lead')
      }
    })
  }

  function handleStageChange(newStage: string) {
    setStage(newStage)
    startTransition(async () => {
      try {
        await updateLeadAction(lead.id, { stage: newStage })
        onUpdate()
      } catch {
        toast.error('Erro ao mover lead')
      }
    })
  }

  function handleResponsibleChange(newId: string) {
    setResponsibleId(newId)
    startTransition(async () => {
      try {
        await updateLeadAction(lead.id, { responsible_id: newId || null })
        onUpdate()
      } catch {
        toast.error('Erro ao atualizar responsável')
      }
    })
  }

  function handleAddActivity() {
    if (!activityDesc.trim()) return
    startTransition(async () => {
      try {
        await createActivityAction({
          lead_id: lead.id,
          type: activityType,
          description: activityDesc,
          scheduled_at: activityDate || undefined,
          done: activityDone,
        })
        toast.success('Atividade criada!')
        setActivityDesc('')
        setActivityDate('')
        setActivityDone(false)
        setShowActivityForm(false)
        onUpdate()
      } catch {
        toast.error('Erro ao criar atividade')
      }
    })
  }

  function handleToggleActivity(id: string, done: boolean) {
    startTransition(async () => {
      try {
        await toggleActivityAction(id, done)
        onUpdate()
      } catch {
        toast.error('Erro ao atualizar atividade')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-white font-bold text-lg">{lead.name}</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left column */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 border-r border-[#222]">
            <div>
              <label className="text-[#888] text-xs mb-1 block">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs mb-1 block">Empresa</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs mb-1 block">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs mb-1 block">Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs mb-1 block">Fonte</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[#888] text-xs mb-1 block">Valor estimado (R$)</label>
              <input
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              />
            </div>
            <div>
              <label className="text-[#888] text-xs mb-1 block">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="w-full py-2 bg-[#EACE00] text-black font-semibold rounded-xl hover:bg-[#f5d800] transition-colors disabled:opacity-50 text-sm"
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          {/* Right column */}
          <div className="w-72 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="text-[#888] text-xs mb-1 block">Responsável</label>
              <select
                value={responsibleId}
                onChange={(e) => handleResponsibleChange(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              >
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#888] text-xs mb-1 block">Estágio</label>
              <select
                value={stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-[#222] pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#888] text-xs font-semibold uppercase tracking-wider">Atividades</span>
                <button
                  onClick={() => setShowActivityForm((v) => !v)}
                  className="flex items-center gap-1 text-[#EACE00] text-xs hover:text-[#f5d800] transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Nova
                </button>
              </div>

              {showActivityForm && (
                <div className="bg-[#0A0A0A] border border-[#222] rounded-xl p-3 space-y-2 mb-3">
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    value={activityDesc}
                    onChange={(e) => setActivityDesc(e.target.value)}
                    placeholder="Descrição"
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs placeholder-[#555]"
                  />
                  <input
                    type="datetime-local"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] rounded-lg px-2 py-1.5 text-white text-xs"
                  />
                  <label className="flex items-center gap-2 text-xs text-[#888]">
                    <input
                      type="checkbox"
                      checked={activityDone}
                      onChange={(e) => setActivityDone(e.target.checked)}
                      className="accent-[#EACE00]"
                    />
                    Concluída
                  </label>
                  <button
                    onClick={handleAddActivity}
                    disabled={isPending}
                    className="w-full py-1.5 bg-[#EACE00] text-black font-semibold rounded-lg text-xs hover:bg-[#f5d800] transition-colors disabled:opacity-50"
                  >
                    Salvar Atividade
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {activities.length === 0 && (
                  <p className="text-[#555] text-xs text-center py-4">Nenhuma atividade</p>
                )}
                {activities.map((act) => (
                  <div key={act.id} className={`flex gap-2 p-2 rounded-lg border transition-colors ${act.done ? 'border-[#1a1a1a] opacity-50' : 'border-[#222]'}`}>
                    <div className="mt-0.5 text-[#888]">
                      {ACTIVITY_ICONS[act.type] ?? <FileText className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-tight ${act.done ? 'line-through text-[#555]' : 'text-white'}`}>
                        {act.description}
                      </p>
                      {act.scheduled_at && (
                        <p className="text-[#555] text-[10px] mt-0.5">{fmtDate(act.scheduled_at)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleActivity(act.id, !act.done)}
                      className={`shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors ${act.done ? 'bg-green-500 border-green-500' : 'border-[#444] hover:border-[#EACE00]'}`}
                    >
                      {act.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
