'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDragToScroll } from '@/hooks/use-drag-to-scroll'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, closestCenter, useDroppable, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GitMerge, GripVertical, Settings as SettingsIcon, Search, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { moveLeadAction, createLeadAction } from '@/app/actions/pipeline'
import { LeadCard } from './lead-card'
import { LeadModal } from './lead-modal'
import { LostReasonModal } from './lost-reason-modal'
import { useRealtimeSubscription } from '@/lib/hooks/use-realtime-subscription'
import { usePolling } from '@/lib/hooks/use-polling'
import type {
  Lead, PipelineActivity, PipelineStage, PipelineTag, LeadTimelineEvent, LeadAttachment,
} from '@/types'
import { LEAD_SOURCES } from '@/types'

type Member = { id: string; full_name: string | null; email: string }

interface PipelineBoardProps {
  pipelineId:           string
  pipelineName:         string
  basePath:             string
  stages:               PipelineStage[]
  leads:                Lead[]
  members:              Member[]
  tags:                 PipelineTag[]
  overdueLeadIds:       string[]
  activitiesByLead:     Record<string, PipelineActivity[]>
  timelineByLead:       Record<string, LeadTimelineEvent[]>
  attachmentsByLead:    Record<string, LeadAttachment[]>
  canManageSettings:    boolean
  currentUserId:        string | null
}

function DroppableColumn({ stageName, children, isOver }: {
  stageName: string; children: React.ReactNode; isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: stageName, data: { type: 'column', stageName } })
  return (
    <div
      ref={setNodeRef}
      className={`flex-none w-72 flex flex-col bg-[#0A0A0A] border rounded-2xl overflow-hidden transition-colors ${
        isOver ? 'border-[#EACE00]/50' : 'border-[#1a1a1a]'
      }`}
    >
      {children}
    </div>
  )
}

function SortableLeadCard({ lead, isOverdue, isSaving, onClick }: {
  lead: Lead; isOverdue: boolean; isSaving: boolean; onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'card', stageName: lead.stage },
  })
  // isDragging (arrastando) e isSaving (persistindo após soltar) são estados
  // distintos: o primeiro tem prioridade visual; o segundo bloqueia interação.
  const opacity = isDragging ? 0.4 : isSaving ? 0.6 : 1
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity }}
      {...attributes}
      className={`group relative ${isSaving ? 'pointer-events-none' : ''}`}
    >
      {/* Drag handle — só essa parte é arrastável */}
      <button
        type="button"
        {...listeners}
        className="absolute top-2 right-2 z-10 h-7 w-7 rounded-md flex items-center justify-center text-[#666] hover:text-[#EACE00] hover:bg-[#1a1a1a] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
        aria-label="Arrastar card"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {isSaving && (
        <span className="absolute top-2 left-2 z-10 text-[#EACE00]" aria-label="Salvando">
          <Loader2 className="h-3 w-3 animate-spin" />
        </span>
      )}

      <LeadCard lead={lead} isOverdue={isOverdue} onClick={onClick} />
    </div>
  )
}

function CreateLeadForm({
  pipelineId, stages, members, defaultStage, onClose, onCreated,
}: {
  pipelineId: string; stages: PipelineStage[]; members: Member[]
  defaultStage: string; onClose: () => void; onCreated: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [source, setSource] = useState('manual')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState(defaultStage)
  const [respId, setRespId] = useState('')
  const [expectedClose, setExpectedClose] = useState('')
  const [prob, setProb] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setErr('Nome obrigatório'); return }
    setErr(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('pipeline_id', pipelineId)
      fd.set('name', name)
      fd.set('company', company)
      fd.set('role', role)
      fd.set('email', email)
      fd.set('phone', phone)
      fd.set('whatsapp', whatsapp)
      fd.set('source', source)
      fd.set('estimated_value', value)
      fd.set('stage', stage)
      fd.set('responsible_id', respId)
      fd.set('expected_close_date', expectedClose)
      fd.set('probability', prob)
      const result = await createLeadAction(fd)
      if (result.error) { setErr(result.error); toast.error(result.error); return }
      toast.success('Lead criado!')
      onCreated()
      onClose()
    })
  }

  const inputCls = 'w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555] [color-scheme:dark]'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white font-bold text-base mb-4">Novo Lead</h3>
        {err && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-sm mb-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {err}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome *" required className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa" className={inputCls} />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Cargo" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={inputCls} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className={inputCls} />
          </div>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (somente dígitos)" className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
              {LEAD_SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor (R$)" type="number" min="0" step="0.01" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} type="date" placeholder="Data prevista" className={inputCls} />
            <input value={prob} onChange={(e) => setProb(e.target.value)} type="number" min="0" max="100" placeholder="Probabilidade %" className={inputCls} />
          </div>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
            {stages.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select value={respId} onChange={(e) => setRespId(e.target.value)} className={inputCls}>
            <option value="">Sem responsável</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>)}
          </select>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={pending} className="flex-1 py-2 border border-[#333] text-[#888] rounded-lg text-sm hover:border-[#555] hover:text-white transition-colors disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={pending} className="flex-1 py-2 bg-[#EACE00] text-black font-semibold rounded-lg text-sm hover:bg-[#f5d800] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Criando...</> : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PipelineBoard({
  pipelineId, pipelineName, basePath,
  stages, leads, members, tags,
  overdueLeadIds, activitiesByLead, timelineByLead, attachmentsByLead,
  canManageSettings, currentUserId,
}: PipelineBoardProps) {
  const router = useRouter()

  // Realtime: assina timeline (canal único — todo evento relevante passa por aqui).
  // user_id é o autor da mudança → ignorar próprios eventos via hook.
  useRealtimeSubscription({
    channel: `pipeline-${pipelineId}`,
    table: 'pipeline_lead_timeline',
    event: 'INSERT',
    currentUserId,
    userColumn: 'user_id',
    onEvent: () => router.refresh(),
  })

  // Polling fallback enquanto Realtime do projeto está indisponível
  usePolling({ interval: 20000 })
  const [isMoving, startTransition] = useTransition()

  // Estado local otimista — espelha `leads` (server) mas pode ir à frente do
  // servidor durante um move. Re-sincroniza sempre que o server manda dados novos.
  const [boardLeads, setBoardLeads] = useState(leads)
  useEffect(() => { setBoardLeads(leads) }, [leads])

  // Lead atualmente sendo persistido (feedback de "salvando" no card)
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null)

  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const selectedLead = useMemo(
    () => selectedLeadId ? boardLeads.find((l) => l.id === selectedLeadId) ?? null : null,
    [boardLeads, selectedLeadId],
  )
  const [showCreate, setShowCreate] = useState(false)
  const [createDefaultStage, setCreateDefaultStage] = useState(stages[0]?.name ?? '')
  const [overId, setOverId] = useState<string | null>(null)
  const [lostReasonLeadId, setLostReasonLeadId] = useState<string | null>(null)

  // Filtros
  const [search, setSearch]       = useState('')
  const [filterResp, setFilterResp] = useState('')
  const [filterTag, setFilterTag]   = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  )
  const overdueSet = useMemo(() => new Set(overdueLeadIds), [overdueLeadIds])
  const { containerRef, grabbing, stop, scrollHandlers } = useDragToScroll()

  const visibleLeads = useMemo(() => {
    const term = search.trim().toLowerCase()
    return boardLeads.filter((l) => {
      if (term && !`${l.name} ${l.company ?? ''} ${l.email ?? ''}`.toLowerCase().includes(term)) return false
      if (filterResp && l.responsible_id !== filterResp) return false
      if (filterTag && !(l.tags ?? []).some((t) => t.id === filterTag)) return false
      return true
    })
  }, [boardLeads, search, filterResp, filterTag])

  function leadsForStage(stageName: string) {
    return visibleLeads
      .filter((l) => l.stage === stageName)
      .sort((a, b) => a.position - b.position)
  }

  function handleDragStart(event: DragStartEvent) {
    stop()
    const lead = boardLeads.find((l) => l.id === event.active.id)
    setActiveLead(lead ?? null)
  }

  // Aplica o move no array local: muda o stage do lead e reindexa a coluna de
  // destino sequencialmente (lead movido vai pro fim), espelhando o que a server
  // action grava (newPosition = nº de leads na coluna antes do move).
  function applyOptimisticMove(current: Lead[], leadId: string, targetStage: string): Lead[] {
    const moved = current.map((l) =>
      l.id === leadId ? { ...l, stage: targetStage, position: Number.MAX_SAFE_INTEGER } : l,
    )
    const destOrder = moved
      .filter((l) => l.stage === targetStage)
      .sort((a, b) => a.position - b.position)
    const posById = new Map(destOrder.map((l, i) => [l.id, i]))
    return moved.map((l) =>
      l.stage === targetStage ? { ...l, position: posById.get(l.id) ?? l.position } : l,
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    setOverId(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const overData = over.data.current as { type?: string; stageName?: string } | undefined

    let targetStage: string | null = null
    if (overData?.type === 'column' && overData.stageName) {
      targetStage = overData.stageName
    } else if (overData?.type === 'card' && overData.stageName) {
      targetStage = overData.stageName
    } else {
      const matchingStage = stages.find((s) => s.name === over.id)
      if (matchingStage) targetStage = matchingStage.name
    }

    if (!targetStage) return
    const lead = boardLeads.find((l) => l.id === leadId)
    if (!lead || lead.stage === targetStage) return

    const newPosition = leadsForStage(targetStage).length

    // Optimistic: aplica já no estado local e guarda snapshot pra rollback.
    const previous = boardLeads
    setBoardLeads((curr) => applyOptimisticMove(curr, leadId, targetStage!))
    setMovingLeadId(leadId)

    startTransition(async () => {
      try {
        const result = await moveLeadAction(leadId, targetStage!, newPosition)
        if (result.error) {
          setBoardLeads(previous) // rollback
          toast.error(result.error)
          return
        }
        if (result.needs_lost_reason) {
          // Card já está otimisticamente em "Perdido" (consistente com o gravado)
          setLostReasonLeadId(leadId)
        } else {
          router.refresh() // useEffect re-sincroniza boardLeads com o canônico
        }
      } finally {
        setMovingLeadId(null)
      }
    })
  }

  function handleLeadUpdate() {
    router.refresh()
    // modal continua aberto; selectedLead deriva de leads via id
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href={basePath} className="text-[#888] hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-[#EACE00]" />
            {pipelineName}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManageSettings && (
            <Link
              href={`${basePath}/${pipelineId}/settings`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333] text-xs text-[#888] hover:text-white hover:border-[#555] transition-colors"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Configurações
            </Link>
          )}
          <button
            onClick={() => { setCreateDefaultStage(stages[0]?.name ?? ''); setShowCreate(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, empresa ou email..."
            className="w-full bg-[#111] border border-[#222] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
          />
        </div>
        <select value={filterResp} onChange={(e) => setFilterResp(e.target.value)} className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EACE00]/50 [color-scheme:dark]">
          <option value="">Todos responsáveis</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>)}
        </select>
        {tags.length > 0 && (
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EACE00]/50 [color-scheme:dark]">
            <option value="">Todas as tags</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {(search || filterResp || filterTag) && (
          <button
            onClick={() => { setSearch(''); setFilterResp(''); setFilterTag('') }}
            className="px-2.5 py-1.5 rounded-lg border border-[#333] text-xs text-[#888] hover:text-white transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Board */}
      <div
        ref={containerRef}
        {...scrollHandlers}
        aria-busy={isMoving}
        className="overflow-x-auto pb-14 scrollbar-hide"
        style={{ cursor: grabbing ? 'grabbing' : 'grab', scrollbarWidth: 'none' }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={(e) => setOverId((e.over?.id as string) ?? null)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {[...stages].sort((a, b) => a.order - b.order).map((stage) => {
              const stageLeads = leadsForStage(stage.name)
              const overThis = overId === stage.name || stageLeads.some((l) => l.id === overId)
              return (
                <DroppableColumn key={stage.id} stageName={stage.name} isOver={overThis}>
                  <div className="flex items-center justify-between px-3 py-3 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: stage.color }} />
                      <span className="text-white text-sm font-semibold">{stage.name}</span>
                      <span className="text-[#555] text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    <button
                      onClick={() => { setCreateDefaultStage(stage.name); setShowCreate(true) }}
                      className="text-[#555] hover:text-[#EACE00] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <SortableContext items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                      {stageLeads.map((lead) => (
                        <SortableLeadCard
                          key={lead.id}
                          lead={lead}
                          isOverdue={overdueSet.has(lead.id)}
                          isSaving={movingLeadId === lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                        />
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-[#333] text-xs">Nenhum lead</div>
                      )}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              )
            })}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="rotate-2 opacity-90">
                <LeadCard lead={activeLead} isOverdue={overdueSet.has(activeLead.id)} onClick={() => { /* noop */ }} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={stages}
          members={members}
          tags={tags}
          activities={activitiesByLead[selectedLead.id] ?? []}
          timeline={timelineByLead[selectedLead.id] ?? []}
          attachments={attachmentsByLead[selectedLead.id] ?? []}
          onClose={() => setSelectedLeadId(null)}
          onUpdate={handleLeadUpdate}
          onRequestLostReason={() => setLostReasonLeadId(selectedLead.id)}
        />
      )}

      {showCreate && (
        <CreateLeadForm
          pipelineId={pipelineId}
          stages={stages}
          members={members}
          defaultStage={createDefaultStage}
          onClose={() => setShowCreate(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {lostReasonLeadId && (
        <LostReasonModal
          leadId={lostReasonLeadId}
          onClose={() => setLostReasonLeadId(null)}
          onSaved={() => { setLostReasonLeadId(null); router.refresh() }}
        />
      )}
    </div>
  )
}
