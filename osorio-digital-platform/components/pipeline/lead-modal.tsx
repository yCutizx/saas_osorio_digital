'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  X, Phone, Mail, MessageCircle, Video, FileText, Check, Plus,
  Trash2, CheckCircle2, XCircle, AlertCircle, Loader2, Paperclip,
  Tag, Clock, History as HistoryIcon, ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  updateLeadAction, deleteLeadAction, moveLeadAction,
  createActivityAction, toggleActivityAction, deleteActivityAction,
  uploadLeadAttachmentAction, deleteLeadAttachmentAction,
  toggleLeadTagAction,
} from '@/app/actions/pipeline'
import {
  type Lead, type PipelineStage, type PipelineTag, type PipelineActivity,
  type LeadTimelineEvent, type LeadAttachment,
  LEAD_SOURCES, getLeadTemperature, TEMPERATURE_COLOR, TEMPERATURE_LABEL,
} from '@/types'
import { LeadTimeline } from './lead-timeline'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, getAvatarGradient, getAvatarTextColor } from '@/lib/avatar-utils'
import { localDatetimeToISO } from '@/lib/datetime-utils'

type Member = { id: string; full_name: string | null; email: string }

interface LeadModalProps {
  lead: Lead
  stages: PipelineStage[]
  members: Member[]
  tags: PipelineTag[]
  activities: PipelineActivity[]
  timeline: LeadTimelineEvent[]
  attachments: LeadAttachment[]
  onClose: () => void
  onUpdate: () => void
  onRequestLostReason: () => void
}

const ACTIVITY_TYPES = [
  { value: 'call',     label: 'Ligação',  icon: <Phone className="h-3.5 w-3.5" /> },
  { value: 'email',    label: 'Email',    icon: <Mail className="h-3.5 w-3.5" /> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-3.5 w-3.5" /> },
  { value: 'meeting',  label: 'Reunião',  icon: <Video className="h-3.5 w-3.5" /> },
  { value: 'note',     label: 'Nota',     icon: <FileText className="h-3.5 w-3.5" /> },
]

type TabKey = 'details' | 'activities' | 'attachments' | 'history'

export function LeadModal({
  lead, stages, members, tags, activities, timeline, attachments,
  onClose, onUpdate, onRequestLostReason,
}: LeadModalProps) {
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<TabKey>('details')
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Detalhes (editáveis)
  const [name, setName] = useState(lead.name)
  const [company, setCompany] = useState(lead.company ?? '')
  const [role, setRole] = useState(lead.role ?? '')
  const [email, setEmail] = useState(lead.email ?? '')
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp ?? '')
  const [source, setSource] = useState(lead.source)
  const [value, setValue] = useState(lead.estimated_value?.toString() ?? '')
  const [expectedClose, setExpectedClose] = useState(lead.expected_close_date ?? '')
  const [prob, setProb] = useState<number | ''>(lead.probability ?? '')
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [respId, setRespId] = useState(lead.responsible_id ?? '')
  const [stage, setStage] = useState(lead.stage)
  const [leadTags, setLeadTags] = useState<string[]>((lead.tags ?? []).map((t) => t.id))

  // Atividades
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState('call')
  const [activityDesc, setActivityDesc] = useState('')
  const [activityDate, setActivityDate] = useState('')

  // Anexos
  const [uploadPending, setUploadPending] = useState(false)

  // Atividades — state local com optimistic update (UI atualiza imediato no toggle/delete)
  const [localActivities, setLocalActivities] = useState<PipelineActivity[]>(activities)
  useEffect(() => { setLocalActivities(activities) }, [activities])

  // Ressincroniza states locais quando o lead muda de identidade ou versão.
  // Após router.refresh(), updated_at avança e props frescas chegam.
  useEffect(() => {
    setName(lead.name)
    setCompany(lead.company ?? '')
    setRole(lead.role ?? '')
    setEmail(lead.email ?? '')
    setPhone(lead.phone ?? '')
    setWhatsapp(lead.whatsapp ?? '')
    setSource(lead.source)
    setValue(lead.estimated_value?.toString() ?? '')
    setExpectedClose(lead.expected_close_date ?? '')
    setProb(lead.probability ?? '')
    setNotes(lead.notes ?? '')
    setRespId(lead.responsible_id ?? '')
    setStage(lead.stage)
    setLeadTags((lead.tags ?? []).map((t) => t.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, lead.updated_at])

  const temperature = getLeadTemperature(typeof prob === 'number' ? prob : null)
  const inputCls = 'w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555] [color-scheme:dark]'

  function handleSave() {
    setErr(null)
    startTransition(async () => {
      const result = await updateLeadAction(lead.id, {
        name,
        company:             company || null,
        role:                role || null,
        email:               email || null,
        phone:               phone || null,
        whatsapp:            whatsapp || null,
        source,
        estimated_value:     value ? parseFloat(value) : null,
        expected_close_date: expectedClose || null,
        probability:         prob === '' ? null : Number(prob),
        notes:               notes || null,
        responsible_id:      respId || null,
      })
      if (result.error) { setErr(result.error); toast.error(result.error); return }
      toast.success('Lead atualizado')
      onUpdate()
    })
  }

  function handleStageChange(newStage: string) {
    setStage(newStage)
    startTransition(async () => {
      const result = await moveLeadAction(lead.id, newStage, 0)
      if (result.error) { toast.error(result.error); return }
      if (result.needs_lost_reason) {
        onRequestLostReason()
      } else {
        onUpdate()
      }
    })
  }

  function handleMarkWon() {
    handleStageChange('Fechado')
  }

  function handleMarkLost() {
    handleStageChange('Perdido')
  }

  function handleDelete() {
    if (!confirm('Excluir este lead? Não pode ser desfeito.')) return
    startTransition(async () => {
      const result = await deleteLeadAction(lead.id)
      if (result.error) { toast.error(result.error); return }
      toast.success('Lead excluído')
      onUpdate()
    })
  }

  function handleAddActivity() {
    if (!activityDesc.trim()) return
    const scheduledIso = localDatetimeToISO(activityDate)
    // Optimistic add com id temporário
    const tempId = `temp-${Date.now()}`
    const optimistic: PipelineActivity = {
      id:           tempId,
      lead_id:      lead.id,
      user_id:      '',
      type:         activityType,
      description:  activityDesc.trim(),
      scheduled_at: scheduledIso,
      done:         false,
      created_at:   new Date().toISOString(),
    }
    setLocalActivities((prev) => [optimistic, ...prev])
    const descClean = activityDesc.trim()
    setActivityDesc(''); setActivityDate(''); setShowActivityForm(false)
    startTransition(async () => {
      const result = await createActivityAction(lead.id, activityType, descClean, scheduledIso)
      if (result.error) {
        setLocalActivities((prev) => prev.filter((a) => a.id !== tempId))
        toast.error(result.error)
        return
      }
      toast.success('Atividade adicionada')
      onUpdate()
    })
  }

  function handleToggleActivity(id: string) {
    // Optimistic flip
    setLocalActivities((prev) => prev.map((a) => a.id === id ? { ...a, done: !a.done } : a))
    startTransition(async () => {
      const result = await toggleActivityAction(id)
      if (result.error) {
        // Reverte
        setLocalActivities((prev) => prev.map((a) => a.id === id ? { ...a, done: !a.done } : a))
        toast.error(result.error)
      } else {
        onUpdate()
      }
    })
  }

  function handleDeleteActivity(id: string) {
    // Optimistic remove
    const snapshot = localActivities
    setLocalActivities((prev) => prev.filter((a) => a.id !== id))
    startTransition(async () => {
      const result = await deleteActivityAction(id)
      if (result.error) {
        setLocalActivities(snapshot)
        toast.error(result.error)
      } else {
        onUpdate()
      }
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadPending(true)
    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadLeadAttachmentAction(lead.id, fd)
    setUploadPending(false)
    if (fileRef.current) fileRef.current.value = ''
    if (result.error) { toast.error(result.error); return }
    toast.success('Anexo enviado')
    onUpdate()
  }

  function handleDeleteAttachment(id: string) {
    startTransition(async () => {
      const result = await deleteLeadAttachmentAction(id)
      if (result.error) toast.error(result.error)
      else onUpdate()
    })
  }

  function handleToggleTag(tagId: string) {
    const wasActive = leadTags.includes(tagId)
    setLeadTags((prev) => wasActive ? prev.filter((t) => t !== tagId) : [...prev, tagId])
    startTransition(async () => {
      const result = await toggleLeadTagAction(lead.id, tagId)
      if (result.error) {
        toast.error(result.error)
        setLeadTags((prev) => wasActive ? [...prev, tagId] : prev.filter((t) => t !== tagId))
      }
    })
  }

  const responsibleObj = members.find((m) => m.id === respId)
  const fmtDate = (d: string | null) => d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : '—'
  const fmtSize = (b: number | null) => b ? `${(b / 1024).toFixed(0)} KB` : ''

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#222]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold text-lg truncate">{lead.name}</h2>
              {(company || role) && (
                <p className="text-[#888] text-sm mt-0.5 truncate">{[role, company].filter(Boolean).join(' · ')}</p>
              )}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => {
                    const active = leadTags.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleToggleTag(t.id)}
                        disabled={pending}
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-medium border transition-opacity disabled:opacity-50',
                          active ? '' : 'opacity-30 hover:opacity-60',
                        )}
                        style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}40` }}
                      >
                        {active && '✓ '}{t.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleDelete} disabled={pending} className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir lead">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-1.5 text-[#888] hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {err && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-sm mt-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {err}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Coluna esquerda - tabs */}
          <div className="flex-1 flex flex-col border-r border-[#222] min-w-0">
            <div className="flex items-center border-b border-[#222] px-4">
              {([
                { k: 'details', l: 'Detalhes',  icon: <FileText className="h-3.5 w-3.5" /> },
                { k: 'activities', l: 'Atividades', icon: <Clock className="h-3.5 w-3.5" /> },
                { k: 'attachments', l: 'Anexos', icon: <Paperclip className="h-3.5 w-3.5" /> },
                { k: 'history', l: 'Histórico',  icon: <HistoryIcon className="h-3.5 w-3.5" /> },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors',
                    tab === t.k ? 'text-[#EACE00] border-[#EACE00]' : 'text-[#888] border-transparent hover:text-white',
                  )}
                >
                  {t.icon}
                  {t.l}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'details' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#888] text-xs mb-1 block">Nome *</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[#888] text-xs mb-1 block">Cargo</label>
                      <input value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#888] text-xs mb-1 block">Empresa</label>
                    <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#888] text-xs mb-1 block">Email</label>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[#888] text-xs mb-1 block">Telefone</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#888] text-xs mb-1 block">WhatsApp</label>
                    <div className="flex gap-2">
                      <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Somente dígitos" className={cn(inputCls, 'flex-1')} />
                      {whatsapp && (
                        <a
                          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg px-3 py-2 text-sm transition-colors shrink-0"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Abrir
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#888] text-xs mb-1 block">Fonte</label>
                      <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
                        {LEAD_SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[#888] text-xs mb-1 block">Valor (R$)</label>
                      <input value={value} onChange={(e) => setValue(e.target.value)} type="number" min="0" step="0.01" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#888] text-xs mb-1 block">Notas</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={cn(inputCls, 'resize-none')} />
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={pending}
                    className="w-full py-2 bg-[#EACE00] text-black font-semibold rounded-lg text-sm hover:bg-[#f5d800] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</> : 'Salvar alterações'}
                  </button>
                </div>
              )}

              {tab === 'activities' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Atividades</span>
                    <button onClick={() => setShowActivityForm((v) => !v)} className="inline-flex items-center gap-1 text-[#EACE00] text-xs hover:text-[#f5d800]">
                      <Plus className="h-3 w-3" />Nova
                    </button>
                  </div>

                  {showActivityForm && (
                    <div className="bg-[#0A0A0A] border border-[#222] rounded-lg p-3 space-y-2">
                      <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-white text-xs [color-scheme:dark]">
                        {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input value={activityDesc} onChange={(e) => setActivityDesc(e.target.value)} placeholder="Descrição" className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-white text-xs placeholder-[#555]" />
                      <input value={activityDate} onChange={(e) => setActivityDate(e.target.value)} type="datetime-local" className="w-full bg-[#111] border border-[#333] rounded-md px-2 py-1.5 text-white text-xs [color-scheme:dark]" />
                      <button onClick={handleAddActivity} disabled={pending || !activityDesc.trim()} className="w-full py-1.5 bg-[#EACE00] text-black font-semibold rounded-md text-xs hover:bg-[#f5d800] disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar atividade'}
                      </button>
                    </div>
                  )}

                  {localActivities.length === 0 && !showActivityForm && (
                    <p className="text-[#555] text-sm text-center py-6">Nenhuma atividade ainda.</p>
                  )}

                  {localActivities.map((act) => {
                    const meta = ACTIVITY_TYPES.find((t) => t.value === act.type)
                    return (
                      <div key={act.id} className={cn('flex gap-2 p-3 rounded-lg border', act.done ? 'border-[#1a1a1a] opacity-60' : 'border-[#222]')}>
                        <div className="mt-0.5 text-[#888]">{meta?.icon ?? <FileText className="h-3.5 w-3.5" />}</div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm leading-tight', act.done ? 'line-through text-[#555]' : 'text-white')}>{act.description}</p>
                          <p className="text-[#555] text-[10px] mt-1">
                            {meta?.label ?? act.type}
                            {act.scheduled_at ? ` · ${fmtDate(act.scheduled_at)}` : ''}
                          </p>
                        </div>
                        <button onClick={() => handleToggleActivity(act.id)} className={cn('shrink-0 h-5 w-5 rounded border flex items-center justify-center transition-colors', act.done ? 'bg-green-500 border-green-500' : 'border-[#444] hover:border-[#EACE00]')}>
                          {act.done && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <button onClick={() => handleDeleteActivity(act.id)} className="shrink-0 text-[#555] hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {tab === 'attachments' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">Anexos</span>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadPending}
                      className="inline-flex items-center gap-1 text-[#EACE00] text-xs hover:text-[#f5d800] disabled:opacity-50"
                    >
                      {uploadPending ? <><Loader2 className="h-3 w-3 animate-spin" />Enviando...</> : <><Plus className="h-3 w-3" />Adicionar</>}
                    </button>
                  </div>

                  {attachments.length === 0 ? (
                    <p className="text-[#555] text-sm text-center py-6">Sem anexos.</p>
                  ) : (
                    attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-2 p-2 bg-[#0A0A0A] border border-[#222] rounded-lg">
                        <Paperclip className="h-3.5 w-3.5 text-[#888] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{att.file_name}</p>
                          <p className="text-[#555] text-[10px]">{fmtSize(att.file_size)} · {new Date(att.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#888] hover:text-white">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button onClick={() => handleDeleteAttachment(att.id)} className="p-1.5 text-[#888] hover:text-red-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'history' && (
                <LeadTimeline
                  events={timeline}
                  tagsById={Object.fromEntries(tags.map((t) => [t.id, { name: t.name, color: t.color }]))}
                />
              )}
            </div>
          </div>

          {/* Coluna direita - ações rápidas */}
          <div className="w-80 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="text-[#888] text-xs mb-1.5 block">Etapa</label>
              <select value={stage} onChange={(e) => handleStageChange(e.target.value)} disabled={pending} className={inputCls}>
                {stages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[#888] text-xs mb-1.5 block">Responsável</label>
              <div className="flex items-center gap-2">
                {responsibleObj && (
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className={cn(
                      'bg-gradient-to-br text-xs font-black',
                      getAvatarGradient(responsibleObj.id),
                      getAvatarTextColor(getAvatarGradient(responsibleObj.id)),
                    )}>
                      {getInitials(responsibleObj.full_name ?? responsibleObj.email)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <select
                  value={respId}
                  onChange={(e) => {
                    setRespId(e.target.value)
                    startTransition(async () => {
                      const result = await updateLeadAction(lead.id, { responsible_id: e.target.value || null })
                      if (result.error) toast.error(result.error)
                      else onUpdate()
                    })
                  }}
                  disabled={pending}
                  className={cn(inputCls, 'flex-1')}
                >
                  <option value="">Sem responsável</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[#888] text-xs mb-1.5 block flex items-center justify-between">
                <span>Probabilidade</span>
                <span className="text-white font-semibold">{prob === '' ? '—' : `${prob}%`}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={prob === '' ? 0 : prob}
                onChange={(e) => setProb(Number(e.target.value))}
                onMouseUp={(e) => {
                  const v = Number((e.target as HTMLInputElement).value)
                  startTransition(async () => {
                    const result = await updateLeadAction(lead.id, { probability: v })
                    if (result.error) toast.error(result.error)
                    else onUpdate()
                  })
                }}
                onTouchEnd={(e) => {
                  const v = Number((e.target as HTMLInputElement).value)
                  startTransition(async () => {
                    const result = await updateLeadAction(lead.id, { probability: v })
                    if (result.error) toast.error(result.error)
                    else onUpdate()
                  })
                }}
                className="w-full accent-[#EACE00]"
              />
              {temperature && (
                <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium mt-1.5', TEMPERATURE_COLOR[temperature])}>
                  {TEMPERATURE_LABEL[temperature]}
                </span>
              )}
            </div>

            <div>
              <label className="text-[#888] text-xs mb-1.5 block">Data prevista fechamento</label>
              <input
                type="date"
                value={expectedClose}
                onChange={(e) => setExpectedClose(e.target.value)}
                onBlur={() => {
                  startTransition(async () => {
                    const result = await updateLeadAction(lead.id, { expected_close_date: expectedClose || null })
                    if (result.error) toast.error(result.error)
                  })
                }}
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-[#888] text-xs mb-1.5 block">Valor estimado (R$)</label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => {
                  startTransition(async () => {
                    const result = await updateLeadAction(lead.id, { estimated_value: value ? parseFloat(value) : null })
                    if (result.error) toast.error(result.error)
                  })
                }}
                type="number" min="0" step="0.01"
                className={inputCls}
              />
            </div>

            <div className="pt-3 border-t border-[#222] space-y-2">
              <button
                onClick={handleMarkWon}
                disabled={pending || stage === 'Fechado'}
                className="w-full py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar como Ganho
              </button>
              <button
                onClick={handleMarkLost}
                disabled={pending || stage === 'Perdido'}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <XCircle className="h-4 w-4" />
                Marcar como Perdido
              </button>
              {lead.lost_reason && (
                <div className="text-xs text-[#888] bg-[#0A0A0A] border border-[#222] rounded-lg p-2">
                  <p><span className="text-[#555]">Motivo da perda:</span> <span className="text-red-400">{lead.lost_reason}</span></p>
                  {lead.lost_reason_other && <p className="mt-1 text-white/70">{lead.lost_reason_other}</p>}
                </div>
              )}
            </div>

            {tags.length === 0 && (
              <div className="pt-3 border-t border-[#222]">
                <p className="text-[#555] text-xs">
                  <Tag className="inline h-3 w-3 mr-1" />
                  Tags podem ser criadas nas configurações do pipeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
