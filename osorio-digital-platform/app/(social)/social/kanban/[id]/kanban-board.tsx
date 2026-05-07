'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent, useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  horizontalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useFormState } from 'react-dom'
import {
  createCardAction, updateCardAction, deleteCard, moveCard,
  updateBoardColumnsAction, type FormState,
} from '../actions'
import { CardDrawer } from './card-drawer'
import {
  Plus, X, GripVertical, Trash2, Calendar, Tag,
  User, Building2, Film, Globe, ChevronLeft, Settings, MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Column { id: string; label: string; color: string }

interface Board {
  id: string
  name: string
  color: string
  board_type: 'agency' | 'content'
  columns: Column[]
}

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
  cover_url?: string | null
  labels?: string[] | null
  clients?: { name: string } | null
  profiles?: { full_name: string } | null
}

interface Member { id: string; full_name: string; email: string }
interface Client { id: string; name: string }

interface Props {
  board:         Board
  initialCards:  KanbanCard[]
  members:       Member[]
  clients:       Client[]
  currentUserId: string
}

const PRIORITY_COLOR = { baixa: '#22c55e', media: '#f59e0b', alta: '#ef4444' }
const PRIORITY_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
const FORMAT_LABEL:   Record<string, string> = { reels: 'Reels', feed: 'Feed', stories: 'Stories', carrossel: 'Carrossel' }
const PLATFORM_LABEL: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn' }

function SortableCard({ card, onOpen, isDragging, disabled }: {
  card: KanbanCard; onOpen: (c: KanbanCard) => void; isDragging?: boolean; disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id, data: { type: 'card' }, disabled,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const dueDate  = card.due_date ? new Date(card.due_date + 'T00:00:00') : null
  const overdue  = dueDate && dueDate < today
  const dueToday = dueDate && dueDate.toDateString() === today.toDateString()
  const dueCls   = overdue  ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                 : dueToday ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
                 : 'text-white/40 bg-white/5'

  return (
    <div ref={setNodeRef} style={style}
      className="bg-[#111] border border-[#222] rounded-xl overflow-hidden group cursor-pointer hover:border-[#444] transition-colors"
      onClick={() => onOpen(card)}>

      {/* Capa */}
      {card.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.cover_url} alt="" className="w-full h-40 object-cover" />
      )}

      {/* Etiquetas coloridas */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2.5">
          {card.labels.map((color) => (
            <span key={color} className="h-2 w-9 rounded-full" style={{ background: color }} />
          ))}
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <button {...attributes} {...listeners}
            className="mt-0.5 text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing shrink-0"
            onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium leading-snug">{card.title}</p>
            {card.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{card.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-6">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: PRIORITY_COLOR[card.priority] + '20', color: PRIORITY_COLOR[card.priority] }}>
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
          {dueDate && (
            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${dueCls}`}>
              <Calendar className="h-3 w-3" />
              {dueDate.toLocaleDateString('pt-BR')}
            </span>
          )}
          {card.tags?.map((t) => (
            <span key={t} className="flex items-center gap-1 text-[10px] text-[#EACE00]/70">
              <Tag className="h-3 w-3" />{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SortableColumn({ col, cards, onAdd, onOpen, activeCardId, onRename, onDelete, isDraggingColumn }: {
  col: Column; cards: KanbanCard[]; onAdd: (id: string) => void
  onOpen: (c: KanbanCard) => void; activeCardId: string | null
  onRename: (id: string, label: string) => void
  onDelete: (id: string) => void
  isDraggingColumn: boolean
}) {
  const { attributes, listeners, setNodeRef: colRef, transform, transition, isDragging } = useSortable({
    id: col.id, data: { type: 'column' },
  })
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: col.id })
  const [renaming, setRenaming] = useState(false)
  const [label, setLabel]       = useState(col.label)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => { setLabel(col.label) }, [col.label])
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function commitRename() {
    setRenaming(false)
    if (label.trim() && label !== col.label) onRename(col.id, label.trim())
    else setLabel(col.label)
  }

  const colStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={colRef} style={colStyle}
      className={`flex flex-col min-h-[500px] w-72 shrink-0 rounded-2xl border transition-colors
        ${isDragging ? 'border-[#EACE00]/30 bg-[#0d0d0d]/50' : isOver ? 'border-[#EACE00]/40 bg-[#EACE00]/5' : 'border-[#222] bg-[#0d0d0d]'}`}>
      <div className="flex items-center gap-2 px-3 py-3 border-b border-[#222]">
        <button {...attributes} {...listeners}
          className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
        {renaming ? (
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setLabel(col.label); setRenaming(false) } }}
            autoFocus
            className="flex-1 bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-[#EACE00]" />
        ) : (
          <span className="flex-1 text-sm font-semibold text-white cursor-default truncate"
            onDoubleClick={() => setRenaming(true)}>
            {col.label}
          </span>
        )}
        <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">{cards.length}</span>
        <button onClick={() => onAdd(col.id)} className="text-white/30 hover:text-[#EACE00] transition-colors shrink-0">
          <Plus className="h-4 w-4" />
        </button>
        <div className="relative shrink-0" ref={menuRef}>
          <button onClick={() => setShowMenu((v) => !v)}
            className="text-white/20 hover:text-white/60 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-xl py-1 min-w-[140px]">
              <button onClick={() => { setShowMenu(false); setRenaming(true) }}
                className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Renomear
              </button>
              <button onClick={() => { setShowMenu(false); onDelete(col.id) }}
                className="w-full text-left px-4 py-2 text-sm text-red-400/70 hover:text-red-400 hover:bg-white/5 transition-colors">
                Excluir coluna
              </button>
            </div>
          )}
        </div>
      </div>
      <div ref={dropRef} className="flex-1 p-2 space-y-2"
        style={{ pointerEvents: isDraggingColumn ? 'none' : 'auto' }}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpen}
              isDragging={activeCardId === card.id} disabled={isDraggingColumn} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function AddColumnWidget({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen]   = useState(false)
  const [label, setLabel] = useState('')

  function submit() {
    if (!label.trim()) return
    onAdd(label.trim())
    setLabel('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-fit px-4 py-3 rounded-2xl border border-dashed border-[#333] text-white/30 hover:text-white/60 hover:border-[#555] transition-colors w-64 shrink-0">
        <Plus className="h-4 w-4" /><span className="text-sm">Adicionar lista</span>
      </button>
    )
  }

  return (
    <div className="w-64 shrink-0 bg-[#0d0d0d] border border-[#EACE00]/30 rounded-2xl p-3 space-y-2">
      <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
        placeholder="Nome da lista..."
        className="w-full bg-[#111] border border-[#333] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
      <div className="flex gap-2">
        <button onClick={submit}
          className="flex-1 py-1.5 rounded-lg bg-[#EACE00] text-black text-xs font-semibold hover:bg-[#f5d800] transition-colors">
          Adicionar
        </button>
        <button onClick={() => { setOpen(false); setLabel('') }}
          className="px-2 text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

const INIT: FormState = {}

function CardModal({ mode, card, defaultColId, boardId, members, clients, onClose, onDelete }: {
  mode: 'create' | 'edit'; card?: KanbanCard; defaultColId: string; boardId: string
  members: Member[]; clients: Client[]; onClose: () => void; onDelete?: () => void
}) {
  const router = useRouter()
  const action = mode === 'create' ? createCardAction : updateCardAction
  const [state, dispatch] = useFormState(action, INIT)
  useEffect(() => {
    if (state.success) {
      onClose()
      router.refresh() // força o Server Component a rebuscar initialCards com o novo card
    }
  }, [state.success]) // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
          <h2 className="text-white font-semibold">{mode === 'create' ? 'Novo Card' : 'Editar Card'}</h2>
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
          {mode === 'edit' && <input type="hidden" name="card_id"  value={card!.id} />}
          <input type="hidden" name="board_id"  value={boardId} />
          <input type="hidden" name="column_id" value={card?.column_id ?? defaultColId} />
          {state.message && <p className="text-red-400 text-sm">{state.message}</p>}

          <div>
            <label className="text-xs text-white/50 mb-1 block">Título *</label>
            <input name="title" defaultValue={card?.title} required
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
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
            <input name="tags_raw" defaultValue={card?.tags?.join(', ') ?? ''} placeholder="ex: ugc, campanha"
              className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[#333] text-sm text-white/50 hover:text-white transition-colors">
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

function DeleteConfirm({ title, onConfirm, onClose }: { title: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-sm p-6 space-y-4">
        <p className="text-white text-sm">Excluir <strong>&quot;{title}&quot;</strong>? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-[#333] text-sm text-white/50 hover:text-white transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Excluir</button>
        </div>
      </div>
    </div>
  )
}

export function KanbanBoard({ board, initialCards, members, clients, currentUserId }: Props) {
  const [cards, setCards]       = useState<KanbanCard[]>(initialCards)
  const [columns, setColumns]   = useState<Column[]>(board.columns)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'card' | 'column' | null>(null)
  const [, startTransition]     = useTransition()

  const [filterClient,   setFilterClient]   = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')

  const [createColId, setCreateColId]   = useState<string | null>(null)
  const [openCard, setOpenCard]         = useState<KanbanCard | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KanbanCard | null>(null)

  useEffect(() => { setCards(initialCards) }, [initialCards])
  useEffect(() => { setColumns(board.columns) }, [board.columns])

  const sensors    = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const activeCard = cards.find((c) => c.id === activeId) ?? null
  const activeCol  = columns.find((c) => c.id === activeId) ?? null

  function cardsForCol(colId: string) {
    return cards.filter((c) => {
      if (c.column_id !== colId) return false
      if (filterClient   && c.client_id !== filterClient)   return false
      if (filterPlatform && c.platform  !== filterPlatform) return false
      return true
    }).sort((a, b) => a.position - b.position)
  }

  function onDragStart({ active }: DragStartEvent) {
    const type = active.data.current?.type as 'card' | 'column' | undefined
    setDragType(type ?? 'card')
    setActiveId(active.id as string)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setDragType(null)
    if (!over) return

    if (dragType === 'column') {
      const oldIdx = columns.findIndex((c) => c.id === active.id)
      const newIdx = columns.findIndex((c) => c.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const next = arrayMove(columns, oldIdx, newIdx)
        setColumns(next)
        startTransition(() => { updateBoardColumnsAction(board.id, next) })
      }
      return
    }

    const ac = cards.find((c) => c.id === active.id)
    if (!ac) return
    const overId    = over.id as string
    const targetCol = columns.find((col) => col.id === overId)
      ?? columns.find((col) => cards.find((c) => c.id === overId)?.column_id === col.id)
    if (!targetCol) return
    const newColId = targetCol.id

    setCards((prev) => {
      const srcCards  = prev.filter((c) => c.column_id === ac.column_id).sort((a, b) => a.position - b.position)
      const destCards = prev.filter((c) => c.column_id === newColId && c.id !== ac.id).sort((a, b) => a.position - b.position)

      if (ac.column_id === newColId) {
        const oIdx = srcCards.findIndex((c) => c.id === overId)
        const aIdx = srcCards.findIndex((c) => c.id === ac.id)
        if (oIdx === -1 || aIdx === oIdx) return prev
        return prev.filter((c) => c.column_id !== newColId)
          .concat(arrayMove(srcCards, aIdx, oIdx).map((c, i) => ({ ...c, position: i })))
      }

      const oIdx = destCards.findIndex((c) => c.id === overId)
      destCards.splice(oIdx === -1 ? destCards.length : oIdx, 0, { ...ac, column_id: newColId })
      return prev.filter((c) => c.column_id !== ac.column_id && c.column_id !== newColId)
        .concat(prev.filter((c) => c.column_id === ac.column_id && c.id !== ac.id).sort((a, b) => a.position - b.position).map((c, i) => ({ ...c, position: i })))
        .concat(destCards.map((c, i) => ({ ...c, position: i })))
    })

    if (ac.column_id !== newColId) startTransition(() => { moveCard(ac.id, newColId) })
  }

  function handleAddColumn(label: string) {
    const next: Column[] = [...columns, { id: `col_${Date.now()}`, label, color: '#555555' }]
    setColumns(next)
    startTransition(() => { updateBoardColumnsAction(board.id, next) })
  }

  function handleRenameColumn(id: string, label: string) {
    const next = columns.map((c) => c.id === id ? { ...c, label } : c)
    setColumns(next)
    startTransition(() => { updateBoardColumnsAction(board.id, next) })
  }

  function handleDeleteColumn(id: string) {
    const next = columns.filter((c) => c.id !== id)
    setColumns(next)
    startTransition(() => { updateBoardColumnsAction(board.id, next) })
  }

  function handleCardMoved(newColId: string) {
    if (!openCard) return
    setCards((prev) => prev.map((c) => c.id === openCard.id ? { ...c, column_id: newColId } : c))
    setOpenCard((prev) => prev ? { ...prev, column_id: newColId } : null)
    startTransition(() => { moveCard(openCard.id, newColId) })
  }

  function handleCoverChange(url: string | null) {
    if (!openCard) return
    setCards((prev) => prev.map((c) => c.id === openCard.id ? { ...c, cover_url: url } : c))
    setOpenCard((prev) => prev ? { ...prev, cover_url: url } : null)
  }

  function handleLabelsChange(labels: string[]) {
    if (!openCard) return
    setCards((prev) => prev.map((c) => c.id === openCard.id ? { ...c, labels } : c))
    setOpenCard((prev) => prev ? { ...prev, labels } : null)
  }

  function handleDueDateChange(date: string | null) {
    if (!openCard) return
    setCards((prev) => prev.map((c) => c.id === openCard.id ? { ...c, due_date: date } : c))
    setOpenCard((prev) => prev ? { ...prev, due_date: date } : null)
  }

  function handleCardArchived() {
    if (!openCard) return
    setCards((prev) => prev.filter((c) => c.id !== openCard.id))
    setOpenCard(null)
  }

  function handleCardDeleted() {
    const cardToDelete = openCard ?? deleteTarget
    if (!cardToDelete) return
    setCards((prev) => prev.filter((c) => c.id !== cardToDelete.id))
    setOpenCard(null)
    setDeleteTarget(null)
    startTransition(() => { deleteCard(cardToDelete.id, board.id) })
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Link href="/social/kanban"
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
            <ChevronLeft className="h-4 w-4" />Quadros
          </Link>
          <span className="text-white/20">/</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: board.color }} />
            <span className="text-white text-sm font-semibold">{board.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}
            className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EACE00]">
            <option value="">Todos os clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}
            className="bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EACE00]">
            <option value="">Todas as plataformas</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          {(filterClient || filterPlatform) && (
            <button onClick={() => { setFilterClient(''); setFilterPlatform('') }}
              className="px-2.5 py-1.5 rounded-lg border border-[#333] text-xs text-white/40 hover:text-white transition-colors">
              Limpar
            </button>
          )}
          <Link href={`/social/kanban/${board.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#333] text-xs text-white/50 hover:text-white hover:border-[#555] transition-colors">
            <Settings className="h-3.5 w-3.5" />Configurar
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners}
          onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 min-w-max items-start">
              {columns.map((col) => (
                <SortableColumn key={col.id} col={col}
                  cards={cardsForCol(col.id)}
                  onAdd={(colId) => setCreateColId(colId)}
                  onOpen={(card) => setOpenCard(card)}
                  activeCardId={dragType === 'card' ? activeId : null}
                  onRename={handleRenameColumn}
                  onDelete={handleDeleteColumn}
                  isDraggingColumn={dragType === 'column'}
                />
              ))}
              <AddColumnWidget onAdd={handleAddColumn} />
            </div>
          </SortableContext>
          <DragOverlay>
            {dragType === 'card' && activeCard && (
              <div className="bg-[#111] border border-[#EACE00]/40 rounded-xl p-3 w-72 shadow-2xl opacity-90">
                <p className="text-sm text-white font-medium">{activeCard.title}</p>
              </div>
            )}
            {dragType === 'column' && activeCol && (
              <div className="bg-[#0d0d0d] border border-[#EACE00]/30 rounded-2xl p-3 w-72 shadow-2xl opacity-80">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: activeCol.color }} />
                  <span className="text-sm font-semibold text-white">{activeCol.label}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {openCard && (
        <CardDrawer card={openCard} boardId={board.id} boardColumns={columns}
          currentUserId={currentUserId}
          onClose={() => setOpenCard(null)}
          onDelete={() => setDeleteTarget(openCard)}
          onMoved={handleCardMoved}
          onArchived={handleCardArchived}
          onCoverChange={handleCoverChange}
          onLabelsChange={handleLabelsChange}
          onDueDateChange={handleDueDateChange}
        />
      )}

      {createColId && !openCard && (
        <CardModal mode="create" defaultColId={createColId} boardId={board.id}
          members={members} clients={clients}
          onClose={() => setCreateColId(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirm title={deleteTarget.title}
          onConfirm={handleCardDeleted}
          onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}
