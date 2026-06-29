'use client'

import { useState } from 'react'
import { Pencil, Trash2, Loader2, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, getAvatarGradient, getAvatarTextColor } from '@/lib/avatar-utils'
import { createNoteAction, updateNoteAction, deleteNoteAction } from '@/app/actions/client-notes'

export type ClientNote = {
  id:         string
  client_id:  string
  content:    string
  created_at: string
  updated_at: string
  author_id:  string | null
  author:     { full_name: string | null; email: string | null } | null
}

interface Props {
  clientId:      string
  initialNotes:  ClientNote[]
  currentUserId: string
}

function formatStamp(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

export function ClientNotesManager({ clientId, initialNotes, currentUserId }: Props) {
  const [notes, setNotes]         = useState<ClientNote[]>(initialNotes)
  const [draft, setDraft]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [busyId, setBusyId]       = useState<string | null>(null)

  async function handleCreate() {
    if (saving || !draft.trim()) return
    setSaving(true)
    try {
      const r = await createNoteAction(clientId, draft)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao salvar nota'); return }
      setNotes((prev) => [r.note as unknown as ClientNote, ...prev])
      setDraft('')
      toast.success('Nota adicionada')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(note: ClientNote) {
    setEditingId(note.id)
    setEditDraft(note.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  async function handleUpdate(note: ClientNote) {
    if (busyId || !editDraft.trim()) return
    setBusyId(note.id)
    try {
      const r = await updateNoteAction(note.id, editDraft)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao atualizar nota'); return }
      setNotes((prev) => prev.map((n) => (n.id === note.id ? (r.note as unknown as ClientNote) : n)))
      setEditingId(null)
      setEditDraft('')
      toast.success('Nota atualizada')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(note: ClientNote) {
    if (busyId) return
    if (!confirm('Apagar esta anotação? Não pode ser desfeito.')) return
    setBusyId(note.id)
    try {
      const r = await deleteNoteAction(note.id)
      if ('error' in r) { toast.error(r.error ?? 'Falha ao remover nota'); return }
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
      toast.success('Nota removida')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Nova nota */}
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleCreate() }
          }}
          rows={3}
          disabled={saving}
          placeholder="Escreva uma anotação sobre o cliente..."
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] placeholder-[#555] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50 resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/25">Ctrl+Enter pra adicionar</span>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving || !draft.trim()}
            className="inline-flex items-center gap-1.5 bg-[#EACE00] text-black text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Adicionar nota
          </button>
        </div>
      </div>

      {/* Feed */}
      {notes.length === 0 ? (
        <p className="text-center text-[#888] text-sm py-6">Nenhuma anotação ainda</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const display = note.author?.full_name ?? note.author?.email ?? 'Desconhecido'
            const seed    = note.author_id ?? note.author?.email ?? '?'
            const grad    = getAvatarGradient(seed)
            const isOwner = !!currentUserId && note.author_id === currentUserId
            const editing = editingId === note.id
            const busy    = busyId === note.id
            const edited  = note.updated_at !== note.created_at

            return (
              <div key={note.id} className="bg-[#0a0a0a] border border-[#222] rounded-lg p-3 group">
                {/* Cabeçalho */}
                <div className="flex items-center gap-2">
                  <Avatar className="size-6 shrink-0">
                    <AvatarFallback className={cn(
                      'bg-gradient-to-br text-[10px] font-black',
                      grad, getAvatarTextColor(grad),
                    )}>
                      {getInitials(note.author?.full_name ?? note.author?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white/80 truncate">{display}</span>
                  <span className="text-xs text-white/30 shrink-0">
                    {formatStamp(note.created_at)}{edited && ' · editado'}
                  </span>

                  {/* Ações */}
                  <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />}
                    {!editing && isOwner && (
                      <button
                        type="button"
                        onClick={() => startEdit(note)}
                        disabled={busy}
                        aria-label="Editar"
                        className="text-white/30 hover:text-[#EACE00] transition-colors disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!editing && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        disabled={busy}
                        aria-label="Apagar"
                        className="text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Corpo */}
                {editing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleUpdate(note) }
                        if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                      }}
                      autoFocus
                      rows={3}
                      disabled={busy}
                      className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50 resize-y"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate(note)}
                        disabled={busy || !editDraft.trim()}
                        className="inline-flex items-center gap-1.5 bg-[#EACE00] text-black text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#f5d800] disabled:opacity-50 transition-colors"
                      >
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 border border-[#222] text-[#888] text-xs px-3 py-1.5 rounded-lg hover:bg-[#111] hover:text-white disabled:opacity-50 transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Cancelar
                      </button>
                      <span className="text-[10px] text-white/25">Ctrl+Enter salva · Esc cancela</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
