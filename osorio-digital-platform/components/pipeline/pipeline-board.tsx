'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GitMerge, LayoutDashboard } from 'lucide-react'
import { toast } from 'sonner'
import { moveLeadAction, createLeadAction } from '@/app/actions/pipeline'
import { LeadCard, type Lead } from './lead-card'
import { LeadModal } from './lead-modal'
import Link from 'next/link'

type Stage = { id: string; name: string; order: number; color: string }
type Member = { id: string; full_name: string; role: string }

interface PipelineBoardProps {
  stages: Stage[]
  leads: Lead[]
  members: Member[]
  overdueLeadIds: string[]
  dashboardHref: string
}

interface CreateLeadFormProps {
  stages: Stage[]
  members: Member[]
  defaultStage: string
  onClose: () => void
  onCreated: () => void
}

const SOURCE_OPTIONS = [
  { value: 'manual',    label: 'Manual' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'meta_ads',  label: 'Meta Ads' },
  { value: 'google',    label: 'Google' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site',      label: 'Site' },
]

function CreateLeadForm({ stages, members, defaultStage, onClose, onCreated }: CreateLeadFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('manual')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [stage, setStage] = useState(defaultStage)
  const [responsibleId, setResponsibleId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      try {
        await createLeadAction({
          name,
          company: company || undefined,
          email: email || undefined,
          phone: phone || undefined,
          source,
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : undefined,
          stage,
          responsible_id: responsibleId || undefined,
        })
        toast.success('Lead criado!')
        onCreated()
        onClose()
      } catch {
        toast.error('Erro ao criar lead')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-bold text-base mb-4">Novo Lead</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome *"
            required
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Empresa"
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="Valor (R$)"
              type="number"
              min="0"
              step="0.01"
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
            />
          </div>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          <select
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-[#222] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50"
          >
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[#333] text-[#888] rounded-xl text-sm hover:border-[#555] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 bg-[#EACE00] text-black font-semibold rounded-xl text-sm hover:bg-[#f5d800] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SortableLeadCard({ lead, isOverdue, onClick }: { lead: Lead; isOverdue: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} isOverdue={isOverdue} onClick={onClick} />
    </div>
  )
}

export function PipelineBoard({ stages, leads, members, overdueLeadIds, dashboardHref }: PipelineBoardProps) {
  const [, startTransition] = useTransition()
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createDefaultStage, setCreateDefaultStage] = useState(stages[0]?.name ?? '')
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const overdueSet = new Set(overdueLeadIds)

  function getLeadsForStage(stageName: string) {
    return localLeads.filter((l) => l.stage === stageName)
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = localLeads.find((l) => l.id === event.active.id)
    setActiveLead(lead ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string

    // Determine target stage from over id (could be stage name or another lead id)
    let targetStage: string | null = null
    const overLead = localLeads.find((l) => l.id === overId)
    if (overLead) {
      targetStage = overLead.stage
    } else {
      const overStage = stages.find((s) => s.name === overId)
      if (overStage) targetStage = overStage.name
    }

    if (!targetStage) return
    const currentLead = localLeads.find((l) => l.id === leadId)
    if (!currentLead || currentLead.stage === targetStage) return

    setLocalLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, stage: targetStage! } : l)
    )

    startTransition(async () => {
      try {
        await moveLeadAction(leadId, targetStage!)
      } catch {
        setLocalLeads(leads)
        toast.error('Erro ao mover lead')
      }
    })
  }

  function handleLeadUpdate() {
    // Trigger revalidation via router refresh — the page is a server component
    setSelectedLead(null)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-[#EACE00]" />
            Pipeline — Funil de Vendas
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Gerencie seus leads em cada etapa do funil</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={dashboardHref}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#333] text-white/50 text-sm hover:text-white hover:border-[#555] transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <button
            onClick={() => { setCreateDefaultStage(stages[0]?.name ?? ''); setShowCreateForm(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.sort((a, b) => a.order - b.order).map((stageItem) => {
            const stageLeads = getLeadsForStage(stageItem.name)
            return (
              <div
                key={stageItem.id}
                id={stageItem.name}
                className="flex-none w-72 flex flex-col bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl overflow-hidden"
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-3 border-b border-[#1a1a1a]">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: stageItem.color }}
                    />
                    <span className="text-white text-sm font-semibold">{stageItem.name}</span>
                    <span className="text-[#555] text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setCreateDefaultStage(stageItem.name); setShowCreateForm(true) }}
                    className="text-[#555] hover:text-[#EACE00] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Cards */}
                <SortableContext items={stageLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                    {stageLeads.map((lead) => (
                      <SortableLeadCard
                        key={lead.id}
                        lead={lead}
                        isOverdue={overdueSet.has(lead.id)}
                        onClick={() => setSelectedLead(lead)}
                      />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-[#333] text-xs">
                        Nenhum lead
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="rotate-2 opacity-90">
              <LeadCard lead={activeLead} isOverdue={overdueSet.has(activeLead.id)} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Lead Modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          stages={stages}
          members={members}
          activities={[]}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}

      {/* Create Lead Form */}
      {showCreateForm && (
        <CreateLeadForm
          stages={stages}
          members={members}
          defaultStage={createDefaultStage}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => window.location.reload()}
        />
      )}
    </div>
  )
}
