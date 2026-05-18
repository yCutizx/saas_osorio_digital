'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Pencil, Eye, EyeOff, Trash2, ExternalLink, Loader2, Tag, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Insight, InsightType } from '@/types'
import { INSIGHT_TYPE_LABELS } from '@/types'

interface Props {
  insight: Insight | null
  canEdit: boolean
  onClose: () => void
  editHref?: string
  onTogglePublish?: () => Promise<{ error?: string } | void>
  onDelete?: () => Promise<{ error?: string } | void>
}

export function InsightDrawer({
  insight, canEdit, onClose, editHref, onTogglePublish, onDelete,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'publish' | 'delete' | null>(null)

  useEffect(() => {
    if (!insight) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [insight, onClose])

  if (!insight) return null

  const typeLabel = insight.type ? INSIGHT_TYPE_LABELS[insight.type as InsightType] ?? insight.type : null
  const tags = insight.tags ?? []

  async function handleTogglePublish() {
    if (!onTogglePublish) return
    setBusy('publish')
    const r = await onTogglePublish()
    setBusy(null)
    if (r && 'error' in r && r.error) {
      toast.error(r.error)
      return
    }
    toast.success(insight!.published ? 'Despublicado' : 'Publicado')
    router.refresh()
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!confirm('Deletar este insight? Esta ação não pode ser desfeita.')) return
    setBusy('delete')
    const r = await onDelete()
    setBusy(null)
    if (r && 'error' in r && r.error) {
      toast.error(r.error)
      return
    }
    toast.success('Insight deletado')
    onClose()
    router.refresh()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-[#0A0A0A] border-l border-[#222] z-50 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#222] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {insight.published ? (
              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full border border-green-500/20">Publicado</span>
            ) : (
              <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/20">Rascunho</span>
            )}
            {typeLabel && (
              <span className="text-xs bg-[#1a1a1a] text-[#888] px-2 py-1 rounded-full border border-[#222]">
                {typeLabel}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white p-1 rounded hover:bg-[#1a1a1a] transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cover */}
        {insight.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={insight.cover_url}
            alt={insight.title}
            className="w-full aspect-video object-cover bg-[#111]"
          />
        )}

        {/* Body */}
        <div className="flex-1 p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#F5F5F0] mb-1 leading-tight">{insight.title}</h2>
            <p className="text-sm text-[#888]">
              {insight.client?.name ?? 'Geral'}
              {' · '}
              {format(new Date(insight.published_at ?? insight.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs text-[#EACE00]/80 bg-[#EACE00]/10 px-2 py-0.5 rounded-full border border-[#EACE00]/20"
                >
                  <Tag className="h-3 w-3" />
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="text-[#ccc] text-sm whitespace-pre-wrap leading-relaxed">
            {insight.content}
          </div>

          {insight.file_url && (
            <a
              href={insight.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#EACE00] hover:text-[#f5d800] text-sm border border-[#EACE00]/30 hover:border-[#EACE00]/60 bg-[#EACE00]/5 hover:bg-[#EACE00]/10 px-3 py-2 rounded-lg transition-colors"
            >
              <FileText className="h-4 w-4" />
              Abrir documento anexo
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Footer (admin) */}
        {canEdit && (
          <div className="sticky bottom-0 bg-[#0A0A0A]/95 backdrop-blur border-t border-[#222] px-6 py-4 flex items-center gap-2 flex-wrap">
            {editHref && (
              <Link
                href={editHref}
                className="inline-flex items-center gap-2 bg-[#EACE00] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#f5d800] transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            )}

            {onTogglePublish && (
              <button
                onClick={handleTogglePublish}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#222] text-[#ccc] px-4 py-2 rounded-lg hover:bg-[#222] disabled:opacity-50 transition-colors"
              >
                {busy === 'publish'
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : insight.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {insight.published ? 'Despublicar' : 'Publicar'}
              </button>
            )}

            {onDelete && (
              <button
                onClick={handleDelete}
                disabled={busy !== null}
                className="ml-auto inline-flex items-center gap-2 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Deletar
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
