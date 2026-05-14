'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useDragToScroll } from '@/hooks/use-drag-to-scroll'
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
import { Plus, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { moveDeliverableAction, createDeliverableAction } from '@/app/actions/pipeline'

type Deliverable = {
  id: string
  project_id: string
  name: string
  description: string | null
  status: string
  due_date: string | null
  created_at: string
}

interface ProjectBoardProps {
  deliverables: Deliverable[]
  projectId: string
  readOnly?: boolean
}

const COLUMNS = [
  { key: 'pending',     label: 'A Fazer',      color: '#3B82F6' },
  { key: 'in_progress', label: 'Em Andamento',  color: '#F59E0B' },
  { key: 'done',        label: 'Concluído',     color: '#22C55E' },
]

const STATUS_LABEL: Record<string, string> = {
  pending:     'A Fazer',
  in_progress: 'Em Andamento',
  done:        'Concluído',
}

const STATUS_COLOR: Record<string, string> = {
  pending:     '#3B82F6',
  in_progress: '#F59E0B',
  done:        '#22C55E',
}

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-3 space-y-2">
      <p className="text-white text-sm font-semibold leading-tight">{deliverable.name}</p>
      {deliverable.description && (
        <p className="text-[#888] text-xs line-clamp-2">{deliverable.description}</p>
      )}
      <div className="flex items-center justify-between">
        {deliverable.due_date && (
          <div className="flex items-center gap-1 text-[#888] text-xs">
            <Calendar className="h-3 w-3" />
            {fmtDate(deliverable.due_date)}
          </div>
        )}
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: STATUS_COLOR[deliverable.status] + '22', color: STATUS_COLOR[deliverable.status] }}
        >
          {STATUS_LABEL[deliverable.status] ?? deliverable.status}
        </span>
      </div>
    </div>
  )
}

function SortableDeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deliverable.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <DeliverableCard deliverable={deliverable} />
    </div>
  )
}

interface AddDeliverableFormProps {
  projectId: string
  defaultStatus: string
  onClose: () => void
  onCreated: () => void
}

function AddDeliverableForm({ projectId, defaultStatus, onClose, onCreated }: AddDeliverableFormProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      try {
        await createDeliverableAction({
          project_id: projectId,
          name,
          description: description || undefined,
          status: defaultStatus,
          due_date: dueDate || undefined,
        })
        toast.success('Entrega criada!')
        onCreated()
        onClose()
      } catch {
        toast.error('Erro ao criar entrega')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-[#333] rounded-xl p-3 space-y-2 mt-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome *"
        required
        className="w-full bg-[#111] border border-[#222] rounded-lg px-2 py-1.5 text-white text-xs placeholder-[#555] focus:outline-none"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição"
        className="w-full bg-[#111] border border-[#222] rounded-lg px-2 py-1.5 text-white text-xs placeholder-[#555] focus:outline-none"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full bg-[#111] border border-[#222] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-1.5 border border-[#333] text-[#888] rounded-lg text-xs hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-1.5 bg-[#EACE00] text-black font-semibold rounded-lg text-xs hover:bg-[#f5d800] transition-colors disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export function ProjectBoard({ deliverables, projectId, readOnly = false }: ProjectBoardProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null)
  const [localDeliverables, setLocalDeliverables] = useState<Deliverable[]>(deliverables)
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null)
  const { containerRef, grabbing, stop, scrollHandlers } = useDragToScroll()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function getDeliverablesForStatus(status: string) {
    return localDeliverables.filter((d) => d.status === status)
  }

  function handleDragStart(event: DragStartEvent) {
    stop()
    const d = localDeliverables.find((d) => d.id === event.active.id)
    setActiveDeliverable(d ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeliverable(null)
    if (readOnly) return
    const { active, over } = event
    if (!over) return

    const deliverableId = active.id as string
    const overId = over.id as string

    let targetStatus: string | null = null
    const overDeliverable = localDeliverables.find((d) => d.id === overId)
    if (overDeliverable) {
      targetStatus = overDeliverable.status
    } else {
      const overCol = COLUMNS.find((c) => c.key === overId)
      if (overCol) targetStatus = overCol.key
    }

    if (!targetStatus) return
    const current = localDeliverables.find((d) => d.id === deliverableId)
    if (!current || current.status === targetStatus) return

    setLocalDeliverables((prev) =>
      prev.map((d) => d.id === deliverableId ? { ...d, status: targetStatus! } : d)
    )

    startTransition(async () => {
      try {
        await moveDeliverableAction(deliverableId, targetStatus!)
      } catch {
        setLocalDeliverables(deliverables)
        toast.error('Erro ao mover entrega')
      }
    })
  }

  return (
    <div
      ref={containerRef}
      {...scrollHandlers}
      className="overflow-x-auto pb-14 scrollbar-hide"
      style={{ cursor: grabbing ? 'grabbing' : 'grab', scrollbarWidth: 'none' }}
    >
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 min-w-max">
        {COLUMNS.map((col) => {
          const colDeliverables = getDeliverablesForStatus(col.key)
          return (
            <div
              key={col.key}
              id={col.key}
              className="flex-none w-72 flex flex-col bg-[#0A0A0A] border border-[#1a1a1a] rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-3 border-b border-[#1a1a1a]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: col.color }} />
                  <span className="text-white text-sm font-semibold">{col.label}</span>
                  <span className="text-[#555] text-xs bg-[#1a1a1a] px-1.5 py-0.5 rounded-full">
                    {colDeliverables.length}
                  </span>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => setAddingToColumn(addingToColumn === col.key ? null : col.key)}
                    className="text-[#555] hover:text-[#EACE00] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              <SortableContext
                items={colDeliverables.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 p-2 space-y-2 min-h-[80px]">
                  {!readOnly
                    ? colDeliverables.map((d) => (
                        <SortableDeliverableCard key={d.id} deliverable={d} />
                      ))
                    : colDeliverables.map((d) => (
                        <DeliverableCard key={d.id} deliverable={d} />
                      ))
                  }
                  {colDeliverables.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-[#333] text-xs">
                      Vazio
                    </div>
                  )}

                  {!readOnly && addingToColumn === col.key && (
                    <AddDeliverableForm
                      projectId={projectId}
                      defaultStatus={col.key}
                      onClose={() => setAddingToColumn(null)}
                      onCreated={() => router.refresh()}
                    />
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>

      <DragOverlay>
        {activeDeliverable && (
          <div className="rotate-2 opacity-90">
            <DeliverableCard deliverable={activeDeliverable} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
    </div>
  )
}
