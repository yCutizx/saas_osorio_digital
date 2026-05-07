'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  X, Archive, Trash2, CheckSquare, Paperclip,
  MessageSquare, ChevronDown, Plus, Check, Loader2,
  Download, FileText, Image as ImageIcon,
} from 'lucide-react'
import {
  getCardDetail, updateCardTitleAction, updateCardDescriptionAction,
  archiveCardAction, addChecklistAction, addChecklistItemAction, toggleChecklistItemAction,
  deleteChecklistAction, addCommentAction, deleteCommentAction,
  uploadAttachmentAction, deleteAttachmentAction,
  updateCardCoverAction, updateCardLabelsAction, updateCardDueDateAction,
  type Checklist, type KanbanComment, type Attachment,
} from '../actions'
import { cn } from '@/lib/utils'

interface Column { id: string; label: string; color: string }

interface KanbanCard {
  id: string
  column_id: string
  title: string
  description?: string | null
  cover_url?: string | null
  labels?: string[] | null
  due_date?: string | null
  clients?: { name: string } | null
  profiles?: { full_name: string } | null
}

interface Props {
  card:             KanbanCard
  boardId:          string
  boardColumns:     Column[]
  currentUserId:    string
  onClose:          () => void
  onDelete:         () => void
  onMoved:          (newColumnId: string) => void
  onArchived:       () => void
  onCoverChange:    (url: string | null) => void
  onLabelsChange:   (labels: string[]) => void
  onDueDateChange:  (date: string | null) => void
}

const PRESET_COLORS = [
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#eab308', name: 'Amarelo' },
  { hex: '#22c55e', name: 'Verde' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#8b5cf6', name: 'Roxo' },
]

function isImageType(type: string | null): boolean {
  return !!type?.startsWith('image/')
}

function ChecklistSection({ checklist, onDelete, onItemsChange }: {
  checklist: Checklist
  onDelete:  (id: string) => void
  onItemsChange: (checklistId: string, items: Checklist['items']) => void
}) {
  const [items,    setItems]   = useState(checklist.items)
  const [newText,  setNew]     = useState('')
  const [adding,   setAdding]  = useState(false)
  const [, startT]             = useTransition()

  const done  = items.filter((i) => i.checked).length
  const total = items.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  async function toggleItem(itemId: string, checked: boolean) {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, checked } : i))
    startT(() => { toggleChecklistItemAction(itemId, checked) })
  }

  async function addItem() {
    if (!newText.trim()) return
    setAdding(true)
    const item = await addChecklistItemAction(checklist.id, newText, items.length)
    if (item) {
      const next = [...items, item]
      setItems(next)
      onItemsChange(checklist.id, next)
    }
    setNew('')
    setAdding(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white font-medium">{checklist.title}</span>
        <button onClick={() => onDelete(checklist.id)}
          className="text-white/20 hover:text-red-400 transition-colors text-xs">Remover</button>
      </div>
      {total > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 w-7 text-right">{pct}%</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#EACE00] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      <div className="space-y-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
            <div
              className={cn('mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                item.checked ? 'bg-[#EACE00] border-[#EACE00]' : 'border-[#444] group-hover:border-[#EACE00]/50')}
              onClick={() => toggleItem(item.id, !item.checked)}>
              {item.checked && <Check className="h-2.5 w-2.5 text-black" />}
            </div>
            <span className={cn('text-sm transition-colors', item.checked ? 'line-through text-white/30' : 'text-white/80')}>
              {item.text}
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newText} onChange={(e) => setNew(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
          placeholder="Adicionar item..."
          className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#EACE00]" />
        <button onClick={addItem} disabled={adding || !newText.trim()}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 disabled:opacity-40 transition-colors">
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
        </button>
      </div>
    </div>
  )
}

export function CardDrawer({
  card, boardId, boardColumns, currentUserId,
  onClose, onDelete, onMoved, onArchived,
  onCoverChange, onLabelsChange, onDueDateChange,
}: Props) {
  const [loading,      setLoading]      = useState(true)
  const [title,        setTitle]        = useState(card.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [desc,         setDesc]         = useState(card.description ?? '')
  const [editingDesc,  setEditingDesc]  = useState(false)

  const [checklists,  setChecklists]  = useState<Checklist[]>([])
  const [newCLTitle,  setNewCLTitle]  = useState('')
  const [showAddCL,   setShowAddCL]   = useState(false)
  const [addingCL,    setAddingCL]    = useState(false)

  const [cardLabels,  setCardLabels]  = useState<string[]>(card.labels ?? [])
  const [coverUrl,    setCoverUrl]    = useState<string | null>(card.cover_url ?? null)
  const [dueDate,     setDueDate]     = useState(card.due_date ?? '')

  const [comments,    setComments]    = useState<KanbanComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [posting,     setPosting]     = useState(false)

  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading,   setUploading]   = useState(false)
  const fileRef                       = useRef<HTMLInputElement>(null)

  const [moveColId,  setMoveColId]    = useState(card.column_id)
  const [, startT]                    = useTransition()

  useEffect(() => {
    setLoading(true)
    getCardDetail(card.id).then((d) => {
      if (d) {
        setChecklists(d.checklists)
        setComments(d.comments)
        setAttachments(d.attachments)
      }
      setLoading(false)
    })
  }, [card.id])

  function saveTitle() {
    setEditingTitle(false)
    if (title.trim() && title !== card.title) {
      startT(() => { updateCardTitleAction(card.id, boardId, title) })
    }
  }

  function saveDesc() {
    setEditingDesc(false)
    startT(() => { updateCardDescriptionAction(card.id, boardId, desc) })
  }

  function handleMove(newColId: string) {
    setMoveColId(newColId)
    if (newColId !== card.column_id) onMoved(newColId)
  }

  async function handleAddChecklist() {
    setAddingCL(true)
    const cl = await addChecklistAction(card.id, boardId, newCLTitle || 'Checklist')
    if (cl) setChecklists((prev) => [...prev, cl])
    setNewCLTitle('')
    setShowAddCL(false)
    setAddingCL(false)
  }

  function handleDeleteChecklist(clId: string) {
    setChecklists((prev) => prev.filter((c) => c.id !== clId))
    startT(() => { deleteChecklistAction(clId, boardId) })
  }

  function handleItemsChange(checklistId: string, items: Checklist['items']) {
    setChecklists((prev) => prev.map((c) => c.id === checklistId ? { ...c, items } : c))
  }

  function handleToggleLabel(hex: string) {
    const next = cardLabels.includes(hex)
      ? cardLabels.filter((c) => c !== hex)
      : [...cardLabels, hex]
    setCardLabels(next)
    onLabelsChange(next)
    startT(() => { updateCardLabelsAction(card.id, boardId, next) })
  }

  function handleSetCover(url: string | null) {
    setCoverUrl(url)
    onCoverChange(url)
    startT(() => { updateCardCoverAction(card.id, boardId, url) })
  }

  function handleDueDateBlur(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value || null
    setDueDate(val ?? '')
    onDueDateChange(val)
    startT(() => { updateCardDueDateAction(card.id, boardId, val) })
  }

  async function handleAddComment() {
    if (!commentText.trim()) return
    setPosting(true)
    const c = await addCommentAction(card.id, boardId, commentText)
    if (c) setComments((prev) => [...prev, c])
    setCommentText('')
    setPosting(false)
  }

  function handleDeleteComment(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    startT(() => { deleteCommentAction(commentId) })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.set('file', file)
    const att = await uploadAttachmentAction(card.id, boardId, fd)
    if (att) setAttachments((prev) => [...prev, att])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleDeleteAttachment(att: Attachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
    if (att.file_url === coverUrl) handleSetCover(null)
    startT(() => { deleteAttachmentAction(att.id, att.file_url, boardId) })
  }

  const imageAttachments = attachments.filter((a) => isImageType(a.file_type))
  const currentCol = boardColumns.find((c) => c.id === moveColId) ?? boardColumns[0]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div
          className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-3xl my-4 shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-[#222]">
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="w-full h-36 object-cover rounded-xl mb-4 -mx-0" />
            )}

            {/* Label bars */}
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {cardLabels.map((color) => (
                  <span key={color} className="h-2.5 w-12 rounded-full" style={{ background: color }} />
                ))}
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle()
                      if (e.key === 'Escape') { setTitle(card.title); setEditingTitle(false) }
                    }}
                    autoFocus
                    className="w-full bg-transparent text-white font-bold text-xl focus:outline-none border-b border-[#EACE00] pb-0.5"
                  />
                ) : (
                  <h2
                    className="text-white font-bold text-xl cursor-pointer hover:text-white/80 transition-colors leading-tight"
                    onClick={() => setEditingTitle(true)}
                  >
                    {title}
                  </h2>
                )}
                {currentCol && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-white/30">em</span>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: currentCol.color }} />
                    <span className="text-xs text-white/40">{currentCol.label}</span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body — dois colunas */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0">

            {/* Coluna esquerda */}
            <div className="flex-1 p-5 space-y-6 min-w-0 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Descrição */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-white/40" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Descrição</span>
                    </div>
                    {editingDesc ? (
                      <textarea
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        onBlur={saveDesc}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setDesc(card.description ?? ''); setEditingDesc(false) }
                        }}
                        autoFocus rows={4}
                        placeholder="Adicionar descrição / briefing..."
                        className="w-full bg-[#0a0a0a] border border-[#EACE00] rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                      />
                    ) : (
                      <div
                        onClick={() => setEditingDesc(true)}
                        className="min-h-[48px] px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#222] hover:border-[#444] cursor-text transition-colors"
                      >
                        {desc
                          ? <p className="text-sm text-white/70 whitespace-pre-wrap">{desc}</p>
                          : <p className="text-sm text-white/20">Adicionar descrição / briefing...</p>
                        }
                      </div>
                    )}
                  </div>

                  {/* Checklists */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-white/40" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Checklists</span>
                    </div>
                    {checklists.map((cl) => (
                      <ChecklistSection key={cl.id} checklist={cl}
                        onDelete={handleDeleteChecklist} onItemsChange={handleItemsChange} />
                    ))}
                    {showAddCL ? (
                      <div className="flex gap-2">
                        <input value={newCLTitle} onChange={(e) => setNewCLTitle(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist(); if (e.key === 'Escape') setShowAddCL(false) }}
                          placeholder="Título do checklist..." autoFocus
                          className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
                        <button onClick={handleAddChecklist} disabled={addingCL}
                          className="px-3 py-1.5 rounded-lg bg-[#EACE00] text-black text-xs font-semibold disabled:opacity-40">
                          {addingCL ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
                        </button>
                        <button onClick={() => setShowAddCL(false)} className="px-2 text-white/30 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddCL(true)}
                        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#EACE00] transition-colors">
                        <Plus className="h-3.5 w-3.5" />Adicionar checklist
                      </button>
                    )}
                  </div>

                  {/* Anexos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-white/40" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Anexos</span>
                        {attachments.length > 0 && (
                          <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{attachments.length}</span>
                        )}
                      </div>
                      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
                      <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#EACE00] transition-colors disabled:opacity-40"
                      >
                        {uploading
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Enviando...</>
                          : <><Plus className="h-3.5 w-3.5" />Adicionar</>
                        }
                      </button>
                    </div>
                    <div className="space-y-2">
                      {attachments.map((att) => {
                        const isImg = isImageType(att.file_type)
                        return (
                          <div key={att.id}
                            className="flex items-center gap-3 p-2 bg-[#0a0a0a] border border-[#222] rounded-xl group">
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0 flex items-center justify-center">
                              {isImg ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={att.file_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <FileText className="h-5 w-5 text-white/20" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/80 truncate">{att.file_name}</p>
                              <p className="text-xs text-white/30">
                                {new Date(att.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <a href={att.file_url} target="_blank" rel="noreferrer" download
                                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                                <Download className="h-3.5 w-3.5" />
                              </a>
                              <button onClick={() => handleDeleteAttachment(att)}
                                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Comentários */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-white/40" />
                      <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Comentários</span>
                    </div>
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="space-y-1 group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#EACE00]/20 flex items-center justify-center shrink-0">
                                <span className="text-[#EACE00] text-[9px] font-bold">
                                  {(c.profiles?.full_name ?? 'U').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-white/60">
                                {c.profiles?.full_name ?? 'Usuário'}
                              </span>
                              <span className="text-xs text-white/20">
                                {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {c.user_id === currentUserId && (
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-white/70 bg-[#0a0a0a] border border-[#222] rounded-xl px-3 py-2 ml-8 whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                        placeholder="Escreva um comentário..." rows={2}
                        className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00] resize-none"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={posting || !commentText.trim()}
                        className="self-end px-3 py-2 rounded-xl bg-[#EACE00] text-black text-xs font-semibold hover:bg-[#f5d800] transition-colors disabled:opacity-40"
                      >
                        {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enviar'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Coluna direita — sidebar de ações */}
            <div className="md:w-52 border-t md:border-t-0 md:border-l border-[#222] p-4 space-y-5 shrink-0">

              {/* Mover para coluna */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Lista</p>
                <div className="relative">
                  <select
                    value={moveColId}
                    onChange={(e) => handleMove(e.target.value)}
                    className="w-full appearance-none bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00] pr-7 [color-scheme:dark]"
                  >
                    {boardColumns.map((col) => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Etiquetas */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Etiquetas</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_COLORS.map((c) => {
                    const active = cardLabels.includes(c.hex)
                    return (
                      <button
                        key={c.hex}
                        onClick={() => handleToggleLabel(c.hex)}
                        title={c.name}
                        className={cn('h-7 rounded-md transition-all relative flex items-center justify-center',
                          active ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-[#111]' : 'opacity-70 hover:opacity-100'
                        )}
                        style={{ background: c.hex }}
                      >
                        {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Data de entrega */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Data de entrega</p>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={handleDueDateBlur}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00] [color-scheme:dark]"
                />
                {dueDate && (
                  <button
                    onClick={() => { setDueDate(''); onDueDateChange(null); startT(() => { updateCardDueDateAction(card.id, boardId, null) }) }}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Remover data
                  </button>
                )}
              </div>

              {/* Capa */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Capa</p>
                {coverUrl && (
                  <div className="relative rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="" className="w-full h-16 object-cover" />
                    <button
                      onClick={() => handleSetCover(null)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {imageAttachments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {imageAttachments.map((att) => (
                      <button
                        key={att.id}
                        onClick={() => handleSetCover(att.file_url)}
                        className={cn('rounded overflow-hidden border-2 transition-colors',
                          coverUrl === att.file_url ? 'border-[#EACE00]' : 'border-transparent hover:border-white/30'
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={att.file_url} alt="" className="w-full h-10 object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-3 bg-[#0a0a0a] border border-dashed border-[#333] rounded-xl">
                    <ImageIcon className="h-5 w-5 text-white/15" />
                    <p className="text-[10px] text-white/25 text-center leading-tight">Adicione imagens nos anexos</p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="space-y-1.5 pt-2 border-t border-[#222]">
                <button
                  onClick={() => { onArchived(); archiveCardAction(card.id, boardId) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-yellow-400 hover:bg-white/5 transition-colors"
                >
                  <Archive className="h-4 w-4" />Arquivar
                </button>
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-white/5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />Excluir card
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
