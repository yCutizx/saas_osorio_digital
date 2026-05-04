'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useFormState } from 'react-dom'
import { createCardAction, updateCardAction, deleteCard, moveCard, type FormState } from './actions'
import { Plus, X, GripVertical, Pencil, Trash2, Calendar, Tag, User, Building2, Film, Globe } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KanbanCard {
  id: string
  column_id: string
  title: string
  description?: string | null
  client_id?: string | null
  assigned_to?: string | null
  due_date?: string | null
  due_time?: string | null
  priority: 'baixa' | 'media' | 'alta'
  tags?: string[] | null
  format?: string | null
  platform?: string | null
  position: number
  created_at: string
  clients?: { name: string } | null
  profiles?: { full_name: string } | null
}

interface Member { id: string; full_name: string; email: string }
interface Client { id: string; name: string }

interface Props {
  initialCards: KanbanCard[]
  members: Member[]
  clients: Client[]
  userRole: string
}

// ─── Columns config ───────────────────────────────────────────────────────────

const COLUMNS = [
  { id: 'idea',        label: 'Ideia',      color: '#8b5cf6' },
  { id: 'production',  label: 'Produção',   color: '#3b82f6' },
  { id: 'approval',    label: 'Aprovação',  color: '#f59e0b' },
  { id: 'scheduled',   label: 'Agendado',   color: '#06b6d4' },
  { id: 'published',   label: 'Publicado',  color: '#22c55e' },
]

const PRIORITY_COLOR = { baixa: '#22c55e', media: '#f59e0b', alta: '#ef4444' }
const PRIORITY_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

const FORMAT_LABEL: Record<string, string> = {
  reels: 'Reels', feed: 'Feed', stories: 'Stories', carrossel: 'Carrossel',
}
const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn',
}

// ─── Card component ───────────────────────────────────────────────────────────

function SortableCard({
  card, onEdit, isDragging,
}: { card: KanbanCard; onEdit: (c: KanbanCard) => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="bg-[#111] border border-[#222] rounded-xl p-3 space-y-2 group">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium leading-snug">{card.title}</p>
          {card.description && (
            <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{card.description}</p>
          )}
        </div>
        <button onClick={() => onEdit(card)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 pl-6">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: PRIORITY_COLOR[card.priority] + '20', color: PRIORITY_COLOR[card.priority] }}>
          {PRIORITY_LABEL[card.priority]}
        </span>
        {card.format && (
          <span className="flex items-center gap-1 text-[10px] text-purple-400">
            <Film className="h-3 w-3" />{FORMAT_LABEL[card.format] ?? card.format}
          </span>
        )}
        {card.platform && (
          <span className="flex items-center gap-1 text-[10px] text-cyan-400">
            <Globe className="h-3 w-3" />{PLATFORM_LABEL[card.platform] ?? card.platform}
          </span>
        )}
        {card.clients?.name && (
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <Building2 className="h-3 w-3" />{card.clients.name}
          </span>
        )}
        {card.profiles?.full_name && (
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <User className="h-3 w-3" />{card.profiles.full_name}
          </span>
        )}
        {card.due_date && (
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <Calendar className="h-3 w-3" />{new Date(card.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
          </span>
        )}
        {card.tags?.map((t) => (
          <span key={t} className="flex items-center gap-1 text-[10px] text-[#EACE00]/70">
            <Tag className="h-3 w-3" />{t}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col, cards, onAdd, onEdit, activeId,
}: {
  col: typeof COLUMNS[0]
  cards: KanbanCard[]
  onAdd: (colId: string) => void
  onEdit: (c: KanbanCard) => void
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div className={`flex flex-col min-h-[500px] w-72 shrink-0 rounded-2xl border transition-colors ${isOver ? 'border-[#EACE00]/40 bg-[#EACE00]/5' : 'border-[#222] bg-[#0d0d0d]'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
          <span className="text-sm font-semibold text-white">{col.label}</span>
          <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{cards.length}</span>
        </div>
        <button onClick={() => onAdd(col.id)} className="text-white/30 hover:text-[#EACE00] transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 p-2 space-y-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onEdit={onEdit} isDragging={activeId === card.id} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Card modal ───────────────────────────────────────────────────────────────

const INIT: FormState = {}

function CardModal({
  mode, card, defaultColId, members, clients, onClose, onDelete,
}: {
  mode: 'create' | 'edit'
  card?: KanbanCard
  defaultColId: string
  members: Member[]
  clients: Client[]
  onClose: () => void
  onDelete?: () => void
}) {
  const action = mode === 'create' ? createCardAction : updateCardAction
  const [state, dispatch] = useFormState(action, INIT)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
          <h2 className="text-white font-semibold">{mode === 'create' ? 'Novo Card de Conteúdo' : 'Editar Card'}</h2>
          <div className="flex gap-2">
            {onDelete && (
              <button onClick={onDelete} className="text-red-400/60 hover:text-red-400 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <form action={dispatch} className="p-5 space-y-4">
          {mode === 'edit' && <input type="hidden" name="card_id" value={card!.id} />}
          <input type="hidden" name="column_id" value={card?.column_id ?? defaultColId} />

          {state.message && <p className="text-red-400 text-sm">{state.message}</p>}

          <div>
            <label className="text-xs text-white/50 mb-1 block">Título *</label>
            <input name="title" defaultValue={card?.title} required
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
            {state.errors?.title && <p className="text-red-400 text-xs mt-1">{state.errors.title[0]}</p>}
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Descrição / Briefing</label>
            <textarea name="description" defaultValue={card?.description ?? ''} rows={3}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Formato</label>
              <select name="format" defaultValue={card?.format ?? ''}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]">
                <option value="">— Nenhum —</option>
                <option value="reels">Reels</option>
                <option value="feed">Feed</option>
                <option value="stories">Stories</option>
                <option value="carrossel">Carrossel</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Plataforma</label>
              <select name="platform" defaultValue={card?.platform ?? ''}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]">
                <option value="">— Nenhuma —</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Cliente</label>
              <select name="client_id" defaultValue={card?.client_id ?? ''}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]">
                <option value="">— Nenhum —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Responsável</label>
              <select name="assigned_to" defaultValue={card?.assigned_to ?? ''}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]">
                <option value="">— Nenhum —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Data de entrega</label>
              <input name="due_date" type="date" defaultValue={card?.due_date ?? ''}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Horário</label>
              <input name="due_time" type="time" defaultValue={card?.due_time ?? ''}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Prioridade *</label>
            <select name="priority" defaultValue={card?.priority ?? 'media'} required
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]">
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Tags (separadas por vírgula)</label>
            <input name="tags_raw" defaultValue={card?.tags?.join(', ') ?? ''}
              placeholder="ex: ugc, campanha"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[#333] text-sm text-white/50 hover:text-white hover:border-[#555] transition-colors">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-2 rounded-lg bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors">
              {mode === 'create' ? 'Criar' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({ card, onClose }: { card: KanbanCard; onClose: () => void }) {
  const [, startT] = useTransition()
  function handleDelete() {
    startT(async () => {
      await deleteCard(card.id)
      onClose()
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-sm p-6 space-y-4">
        <p className="text-white text-sm">Excluir o card <strong>&quot;{card.title}&quot;</strong>? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#333] text-sm text-white/50 hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleDelete} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Excluir</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function ContentKanbanBoard({ initialCards, members, clients }: Props) {
  const [cards, setCards] = useState<KanbanCard[]>(initialCards)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [filterClient, setFilterClient]   = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')

  const [createColId, setCreateColId]       = useState<string | null>(null)
  const [editCard, setEditCard]             = useState<KanbanCard | null>(null)
  const [deleteCardItem, setDeleteCardItem] = useState<KanbanCard | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeCard = cards.find((c) => c.id === activeId) ?? null

  function cardsForCol(colId: string) {
    return cards
      .filter((c) => {
        if (c.column_id !== colId) return false
        if (filterClient   && c.client_id !== filterClient)     return false
        if (filterPlatform && c.platform  !== filterPlatform)   return false
        return true
      })
      .sort((a, b) => a.position - b.position)
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    const overId = over.id as string
    const targetCol = COLUMNS.find((col) => col.id === overId)
      ?? COLUMNS.find((col) => cards.find((c) => c.id === overId)?.column_id === col.id)

    if (!targetCol) return
    const newColId = targetCol.id

    setCards((prev) => {
      const sourceCards = prev.filter((c) => c.column_id === activeCard.column_id).sort((a, b) => a.position - b.position)
      const destCards   = prev.filter((c) => c.column_id === newColId && c.id !== activeCard.id).sort((a, b) => a.position - b.position)

      if (activeCard.column_id === newColId) {
        const overIdx   = sourceCards.findIndex((c) => c.id === overId)
        const activeIdx = sourceCards.findIndex((c) => c.id === activeCard.id)
        if (overIdx === -1 || activeIdx === overIdx) return prev
        const reordered = arrayMove(sourceCards, activeIdx, overIdx).map((c, i) => ({ ...c, position: i }))
        return prev.filter((c) => c.column_id !== newColId).concat(reordered)
      }

      const overIdx = destCards.findIndex((c) => c.id === overId)
      const insertAt = overIdx === -1 ? destCards.length : overIdx
      destCards.splice(insertAt, 0, { ...activeCard, column_id: newColId })
      const reordered = destCards.map((c, i) => ({ ...c, position: i }))
      return prev
        .filter((c) => c.column_id !== activeCard.column_id && c.column_id !== newColId)
        .concat(prev.filter((c) => c.column_id === activeCard.column_id && c.id !== activeCard.id).sort((a, b) => a.position - b.position).map((c, i) => ({ ...c, position: i })))
        .concat(reordered)
    })

    if (activeCard.column_id !== newColId) {
      startTransition(() => { moveCard(activeCard.id, newColId) })
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00]">
          <option value="">Todos os clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
          className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00]">
          <option value="">Todas as plataformas</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="tiktok">TikTok</option>
          <option value="linkedin">LinkedIn</option>
        </select>
        {(filterClient || filterPlatform) && (
          <button onClick={() => { setFilterClient(''); setFilterPlatform('') }}
            className="px-3 py-1.5 rounded-lg border border-[#333] text-sm text-white/40 hover:text-white transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                col={col}
                cards={cardsForCol(col.id)}
                onAdd={(colId) => setCreateColId(colId)}
                onEdit={(card) => setEditCard(card)}
                activeId={activeId}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard && (
              <div className="bg-[#111] border border-[#EACE00]/40 rounded-xl p-3 w-72 shadow-2xl">
                <p className="text-sm text-white font-medium">{activeCard.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {editCard && (
        <CardModal
          mode="edit"
          card={editCard}
          defaultColId={editCard.column_id}
          members={members}
          clients={clients}
          onClose={() => setEditCard(null)}
          onDelete={() => { setDeleteCardItem(editCard); setEditCard(null) }}
        />
      )}

      {createColId && !editCard && (
        <CardModal mode="create" defaultColId={createColId} members={members} clients={clients} onClose={() => setCreateColId(null)} />
      )}

      {deleteCardItem && (
        <DeleteConfirm card={deleteCardItem} onClose={() => setDeleteCardItem(null)} />
      )}
    </div>
  )
}
