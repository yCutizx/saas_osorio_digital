'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import {
  X, Archive, Trash2, CheckSquare, Tag, Paperclip,
  MessageSquare, ChevronDown, Plus, Check, Loader2, ExternalLink,
} from 'lucide-react'
import {
  getCardDetail, getBoardLabels, updateCardTitleAction, updateCardDescriptionAction,
  archiveCardAction, addChecklistAction, addChecklistItemAction, toggleChecklistItemAction,
  deleteChecklistAction, createLabelAction, toggleCardLabelAction,
  addCommentAction, deleteCommentAction, uploadAttachmentAction, deleteAttachmentAction,
  type CardDetail, type Checklist, type Label, type KanbanComment, type Attachment,
} from '../actions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Column { id: string; label: string; color: string }

interface KanbanCard {
  id: string
  column_id: string
  title: string
  description?: string | null
  client_id?: string | null
  assigned_to?: string | null
  due_date?: string | null
  priority: 'baixa' | 'media' | 'alta'
  tags?: string[] | null
  clients?: { name: string } | null
  profiles?: { full_name: string } | null
}

interface Props {
  card:          KanbanCard
  boardId:       string
  boardColumns:  Column[]
  currentUserId: string
  onClose:       () => void
  onDelete:      () => void
  onMoved:       (newColumnId: string) => void
  onArchived:    () => void
}

const LABEL_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#06b6d4']

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-white/40" />
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Checklist component ──────────────────────────────────────────────────────

function ChecklistSection({ checklist, onDelete, onItemsChange }: {
  checklist: Checklist
  onDelete: (id: string) => void
  onItemsChange: (checklistId: string, items: Checklist['items']) => void
}) {
  const [items, setItems]   = useState(checklist.items)
  const [newText, setNew]   = useState('')
  const [adding, setAdding] = useState(false)
  const [, startT]          = useTransition()

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
            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
              ${item.checked ? 'bg-[#EACE00] border-[#EACE00]' : 'border-[#444] group-hover:border-[#EACE00]/50'}`}
              onClick={() => toggleItem(item.id, !item.checked)}>
              {item.checked && <Check className="h-2.5 w-2.5 text-black" />}
            </div>
            <span className={`text-sm transition-colors ${item.checked ? 'line-through text-white/30' : 'text-white/80'}`}>
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

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function CardDrawer({
  card, boardId, boardColumns, currentUserId, onClose, onDelete, onMoved, onArchived,
}: Props) {
  const [boardLabels, setBoardLabels]     = useState<Label[]>([])
  const [loading, setLoading]             = useState(true)

  const [title, setTitle]                 = useState(card.title)
  const [editingTitle, setEditingTitle]   = useState(false)
  const [desc, setDesc]                   = useState(card.description ?? '')
  const [editingDesc, setEditingDesc]     = useState(false)

  const [checklists, setChecklists]       = useState<Checklist[]>([])
  const [newCLTitle, setNewCLTitle]       = useState('')
  const [showAddCL, setShowAddCL]         = useState(false)
  const [addingCL, setAddingCL]           = useState(false)

  const [labels, setLabels]               = useState<Label[]>([])
  const [showLabels, setShowLabels]       = useState(false)
  const [newLabelName, setNewLabelName]   = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6')
  const [creatingLabel, setCreatingLabel] = useState(false)

  const [comments, setComments]           = useState<KanbanComment[]>([])
  const [commentText, setCommentText]     = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [attachments, setAttachments]     = useState<Attachment[]>([])
  const [uploading, setUploading]         = useState(false)
  const fileRef                           = useRef<HTMLInputElement>(null)

  const [moveColId, setMoveColId]         = useState(card.column_id)
  const [, startT]                        = useTransition()

  useEffect(() => {
    setLoading(true)
    Promise.all([getCardDetail(card.id), getBoardLabels(boardId)]).then(([d, bl]) => {
      if (d) {
        setChecklists(d.checklists)
        setLabels(d.labels)
        setComments(d.comments)
        setAttachments(d.attachments)
      }
      setBoardLabels(bl)
      setLoading(false)
    })
  }, [card.id, boardId])

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
    if (newColId !== card.column_id) {
      onMoved(newColId)
    }
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

  async function handleToggleLabel(label: Label) {
    const active = labels.some((l) => l.id === label.id)
    if (active) {
      setLabels((prev) => prev.filter((l) => l.id !== label.id))
    } else {
      setLabels((prev) => [...prev, label])
    }
    startT(() => { toggleCardLabelAction(card.id, label.id, !active) })
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    const label = await createLabelAction(boardId, newLabelName, newLabelColor)
    if (label) {
      setBoardLabels((prev) => [...prev, label])
      setLabels((prev) => [...prev, label])
      await toggleCardLabelAction(card.id, label.id, true)
    }
    setNewLabelName('')
    setCreatingLabel(false)
  }

  async function handleAddComment() {
    if (!commentText.trim()) return
    setPostingComment(true)
    const c = await addCommentAction(card.id, boardId, commentText)
    if (c) setComments((prev) => [...prev, c])
    setCommentText('')
    setPostingComment(false)
  }

  async function handleDeleteComment(commentId: string) {
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

  async function handleDeleteAttachment(att: Attachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id))
    startT(() => { deleteAttachmentAction(att.id, att.file_url, boardId) })
  }

  const currentCol = boardColumns.find((c) => c.id === moveColId) ?? boardColumns[0]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#111] border-l border-[#222] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#222] shrink-0">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(card.title); setEditingTitle(false) } }}
                autoFocus
                className="w-full bg-transparent text-white font-semibold text-base focus:outline-none border-b border-[#EACE00] pb-0.5"
              />
            ) : (
              <h2
                className="text-white font-semibold text-base cursor-pointer hover:text-white/80 transition-colors leading-snug"
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
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { onArchived(); archiveCardAction(card.id, boardId) }}
              className="p-1.5 rounded-lg text-white/30 hover:text-yellow-400 hover:bg-white/5 transition-colors"
              title="Arquivar">
              <Archive className="h-4 w-4" />
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Excluir">
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
            </div>
          )}

          {!loading && (
            <>
              {/* Description */}
              <div>
                {editingDesc ? (
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    onBlur={saveDesc}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setDesc(card.description ?? ''); setEditingDesc(false) } }}
                    autoFocus
                    rows={4}
                    placeholder="Adicionar descrição..."
                    className="w-full bg-[#0a0a0a] border border-[#EACE00] rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                  />
                ) : (
                  <div
                    onClick={() => setEditingDesc(true)}
                    className="min-h-[48px] px-4 py-3 rounded-xl bg-[#0a0a0a] border border-[#222] hover:border-[#444] cursor-text transition-colors"
                  >
                    {desc
                      ? <p className="text-sm text-white/70 whitespace-pre-wrap">{desc}</p>
                      : <p className="text-sm text-white/20">Adicionar descrição...</p>
                    }
                  </div>
                )}
              </div>

              {/* Move to column */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 shrink-0">Mover para</span>
                <div className="relative flex-1">
                  <select
                    value={moveColId}
                    onChange={(e) => handleMove(e.target.value)}
                    className="w-full appearance-none bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00] pr-8"
                  >
                    {boardColumns.map((col) => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>

              {/* Labels */}
              <Section icon={Tag} title="Etiquetas">
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l) => (
                    <span key={l.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer"
                      style={{ background: l.color + '33', border: `1px solid ${l.color}60` }}
                      onClick={() => handleToggleLabel(l)}>
                      <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                      {l.name}
                      <X className="h-2.5 w-2.5 opacity-50 hover:opacity-100" />
                    </span>
                  ))}
                  <button onClick={() => setShowLabels((v) => !v)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white/40 border border-[#333] hover:border-[#EACE00] hover:text-[#EACE00] transition-colors">
                    <Plus className="h-3 w-3" />Etiqueta
                  </button>
                </div>
                {showLabels && (
                  <div className="mt-2 p-3 bg-[#0a0a0a] border border-[#333] rounded-xl space-y-3">
                    <p className="text-xs text-white/40 font-medium">Etiquetas do quadro</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {boardLabels.map((bl) => {
                        const active = labels.some((l) => l.id === bl.id)
                        return (
                          <label key={bl.id} className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                              ${active ? 'border-transparent' : 'border-[#444]'}`}
                              style={active ? { background: bl.color } : {}}
                              onClick={() => handleToggleLabel(bl)}>
                              {active && <Check className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: bl.color }} />
                            <span className="text-sm text-white/70 flex-1">{bl.name}</span>
                          </label>
                        )
                      })}
                    </div>
                    <div className="pt-2 border-t border-[#222] space-y-2">
                      <p className="text-xs text-white/30">Nova etiqueta</p>
                      <input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="Nome..."
                        className="w-full bg-transparent border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
                      <div className="flex gap-1.5 flex-wrap">
                        {LABEL_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => setNewLabelColor(c)}
                            style={{ background: c }}
                            className={`w-6 h-6 rounded-lg transition-transform ${newLabelColor === c ? 'ring-2 ring-white/40 scale-110' : 'opacity-60 hover:opacity-100'}`} />
                        ))}
                      </div>
                      <button onClick={handleCreateLabel} disabled={creatingLabel || !newLabelName.trim()}
                        className="w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 disabled:opacity-40 transition-colors">
                        {creatingLabel ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Criar etiqueta'}
                      </button>
                    </div>
                  </div>
                )}
              </Section>

              {/* Checklists */}
              <Section icon={CheckSquare} title="Checklists">
                <div className="space-y-4">
                  {checklists.map((cl) => (
                    <ChecklistSection
                      key={cl.id}
                      checklist={cl}
                      onDelete={handleDeleteChecklist}
                      onItemsChange={handleItemsChange}
                    />
                  ))}
                </div>
                {showAddCL ? (
                  <div className="flex gap-2 mt-2">
                    <input value={newCLTitle} onChange={(e) => setNewCLTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddChecklist(); if (e.key === 'Escape') setShowAddCL(false) }}
                      placeholder="Título do checklist..."
                      autoFocus
                      className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#EACE00]" />
                    <button onClick={handleAddChecklist} disabled={addingCL}
                      className="px-3 py-1.5 rounded-lg bg-[#EACE00] text-black text-xs font-semibold disabled:opacity-40">
                      {addingCL ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Criar'}
                    </button>
                    <button onClick={() => setShowAddCL(false)}
                      className="px-2 text-white/30 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowAddCL(true)}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#EACE00] transition-colors mt-1">
                    <Plus className="h-3.5 w-3.5" />Adicionar checklist
                  </button>
                )}
              </Section>

              {/* Attachments */}
              <Section icon={Paperclip} title="Anexos">
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-2 bg-[#0a0a0a] border border-[#222] rounded-lg group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80 truncate">{att.file_name}</p>
                        <p className="text-xs text-white/30">{att.file_type ?? 'arquivo'}</p>
                      </div>
                      <a href={att.file_url} target="_blank" rel="noreferrer"
                        className="text-white/20 hover:text-white transition-colors shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => handleDeleteAttachment(att)}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#EACE00] transition-colors disabled:opacity-40">
                  {uploading
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Enviando...</>
                    : <><Paperclip className="h-3.5 w-3.5" />Enviar arquivo</>
                  }
                </button>
              </Section>

              {/* Comments */}
              <Section icon={MessageSquare} title="Comentários">
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="space-y-1 group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/60">
                          {c.profiles?.full_name ?? 'Usuário'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/20">
                            {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {c.user_id === currentUserId && (
                            <button onClick={() => handleDeleteComment(c.id)}
                              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-white/70 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                    placeholder="Escreva um comentário..."
                    rows={2}
                    className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00] resize-none"
                  />
                  <button onClick={handleAddComment} disabled={postingComment || !commentText.trim()}
                    className="self-end px-3 py-2 rounded-xl bg-[#EACE00] text-black text-xs font-semibold hover:bg-[#f5d800] transition-colors disabled:opacity-40">
                    {postingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enviar'}
                  </button>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
