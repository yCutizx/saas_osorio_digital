'use client'

import { useState, useTransition } from 'react'
import {
  Building2, Calendar, Film, Globe, Tag, User, Plus, X, Loader2, MessageSquare,
} from 'lucide-react'

interface Column { id: string; label: string; color: string }

interface KanbanCard {
  id: string
  column_id: string
  title: string
  description?: string | null
  priority: 'baixa' | 'media' | 'alta'
  tags?: string[] | null
  format?: string | null
  platform?: string | null
  due_date?: string | null
  clients?: { name: string } | null
  profiles?: { full_name: string } | null
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string } | null
}

interface Props {
  boardName:    string
  columns:      Column[]
  cards:        KanbanCard[]
  currentUserId: string
  addComment:   (cardId: string, content: string) => Promise<Comment | null>
  deleteComment: (commentId: string) => Promise<void>
  getComments:  (cardId: string) => Promise<Comment[]>
}

const PRIORITY_COLOR = { baixa: '#22c55e', media: '#f59e0b', alta: '#ef4444' }
const PRIORITY_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }
const FORMAT_LABEL:   Record<string, string> = { reels: 'Reels', feed: 'Feed', stories: 'Stories', carrossel: 'Carrossel' }
const PLATFORM_LABEL: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn' }

function CardDetail({ card, currentUserId, addComment, deleteComment, getComments, onClose }: {
  card: KanbanCard
  currentUserId: string
  addComment: (cardId: string, content: string) => Promise<Comment | null>
  deleteComment: (commentId: string) => Promise<void>
  getComments: (cardId: string) => Promise<Comment[]>
  onClose: () => void
}) {
  const [comments, setComments]         = useState<Comment[]>([])
  const [loaded, setLoaded]             = useState(false)
  const [commentText, setCommentText]   = useState('')
  const [posting, setPosting]           = useState(false)
  const [, startT]                      = useTransition()

  // Load comments on first render
  if (!loaded) {
    setLoaded(true)
    getComments(card.id).then(setComments)
  }

  async function handleAddComment() {
    if (!commentText.trim()) return
    setPosting(true)
    const c = await addComment(card.id, commentText)
    if (c) setComments((prev) => [...prev, c])
    setCommentText('')
    setPosting(false)
  }

  async function handleDeleteComment(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    startT(() => { deleteComment(commentId) })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[#111] border-l border-[#222] flex flex-col shadow-2xl">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#222] shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold text-base leading-snug">{card.title}</h2>
            {card.clients?.name && (
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                <Building2 className="h-3 w-3" />{card.clients.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: PRIORITY_COLOR[card.priority] + '20', color: PRIORITY_COLOR[card.priority] }}>
              {PRIORITY_LABEL[card.priority]}
            </span>
            {card.format && (
              <span className="flex items-center gap-1 text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full">
                <Film className="h-3 w-3" />{FORMAT_LABEL[card.format] ?? card.format}
              </span>
            )}
            {card.platform && (
              <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">
                <Globe className="h-3 w-3" />{PLATFORM_LABEL[card.platform] ?? card.platform}
              </span>
            )}
            {card.due_date && (
              <span className="flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                <Calendar className="h-3 w-3" />
                {new Date(card.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
            {card.profiles?.full_name && (
              <span className="flex items-center gap-1 text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                <User className="h-3 w-3" />{card.profiles.full_name}
              </span>
            )}
            {card.tags?.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs text-[#EACE00]/70 bg-[#EACE00]/10 px-2 py-1 rounded-full">
                <Tag className="h-3 w-3" />{t}
              </span>
            ))}
          </div>

          {/* Description */}
          {card.description && (
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-wide mb-2">Descrição</p>
              <p className="text-sm text-white/70 whitespace-pre-wrap bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3">
                {card.description}
              </p>
            </div>
          )}

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-white/40" />
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">Comentários</p>
            </div>
            <div className="space-y-3 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="space-y-1 group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">{c.profiles?.full_name ?? 'Usuário'}</span>
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
                  <p className="text-sm text-white/70 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                placeholder="Escreva um comentário..." rows={2}
                className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00] resize-none" />
              <button onClick={handleAddComment} disabled={posting || !commentText.trim()}
                className="self-end px-3 py-2 rounded-xl bg-[#EACE00] text-black text-xs font-semibold disabled:opacity-40">
                {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function ClientKanbanBoard({ boardName, columns, cards, currentUserId, addComment, deleteComment, getComments }: Props) {
  const [openCard, setOpenCard] = useState<KanbanCard | null>(null)

  function cardsForCol(colId: string) {
    return cards.filter((c) => c.column_id === colId)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-white text-lg font-bold">{boardName}</h1>
        <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">somente leitura</span>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max items-start">
          {columns.map((col) => {
            const colCards = cardsForCol(col.id)
            return (
              <div key={col.id}
                className="flex flex-col min-h-[400px] w-72 shrink-0 rounded-2xl border border-[#222] bg-[#0d0d0d]">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-semibold text-white flex-1">{col.label}</span>
                  <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">{colCards.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  {colCards.map((card) => (
                    <div key={card.id}
                      className="bg-[#111] border border-[#222] rounded-xl p-3 space-y-2 cursor-pointer hover:border-[#444] transition-colors"
                      onClick={() => setOpenCard(card)}>
                      <p className="text-sm text-white font-medium leading-snug">{card.title}</p>
                      <div className="flex flex-wrap gap-1.5">
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
                        {card.due_date && (
                          <span className="flex items-center gap-1 text-[10px] text-white/40">
                            <Calendar className="h-3 w-3" />
                            {new Date(card.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-white/20">
                          <MessageSquare className="h-3 w-3" />comentários
                        </span>
                      </div>
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <div className="flex items-center justify-center h-16">
                      <p className="text-xs text-white/15">vazio</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {columns.length === 0 && (
            <div className="flex items-center justify-center w-full py-16">
              <p className="text-white/20 text-sm">Este quadro não tem colunas configuradas.</p>
            </div>
          )}
        </div>
      </div>

      {openCard && (
        <CardDetail
          card={openCard}
          currentUserId={currentUserId}
          addComment={addComment}
          deleteComment={deleteComment}
          getComments={getComments}
          onClose={() => setOpenCard(null)}
        />
      )}
    </div>
  )
}

// Inline add-column placeholder for type consistency
export function AddColumn() {
  return (
    <button className="flex items-center gap-2 h-fit px-4 py-3 rounded-2xl border border-dashed border-[#333] text-white/20 w-64 shrink-0 cursor-not-allowed">
      <Plus className="h-4 w-4" />
      <span className="text-sm">Somente leitura</span>
    </button>
  )
}
