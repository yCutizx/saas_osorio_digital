'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createTagAction, deleteTagAction } from '@/app/actions/pipeline'
import type { PipelineTag } from '@/types'

interface Props {
  pipelineId: string
  tags: PipelineTag[]
}

const PRESET_COLORS = ['#EACE00', '#3b82f6', '#8b5cf6', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899']

export function TagsEditor({ pipelineId, tags }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [err, setErr] = useState<string | null>(null)

  function handleCreate() {
    setErr(null)
    if (!name.trim()) { setErr('Nome obrigatório'); return }
    startTransition(async () => {
      const result = await createTagAction(pipelineId, name, color)
      if (result.error) { setErr(result.error); toast.error(result.error); return }
      toast.success('Tag criada')
      setName('')
      router.refresh()
    })
  }

  function handleDelete(tagId: string) {
    startTransition(async () => {
      const result = await deleteTagAction(tagId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Tag removida')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {err && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {err}
        </div>
      )}

      {tags.length === 0 ? (
        <p className="text-[#555] text-sm">Nenhuma tag ainda. Crie a primeira abaixo.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
              style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}40` }}
            >
              {t.name}
              <button onClick={() => handleDelete(t.id)} disabled={pending} className="hover:opacity-70 disabled:opacity-30">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-[#222]">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0 shrink-0"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
          placeholder="Nome da tag..."
          className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#EACE00]/50 placeholder-[#555]"
        />
        <button
          onClick={handleCreate}
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
