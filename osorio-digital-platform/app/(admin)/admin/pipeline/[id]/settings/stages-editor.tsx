'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowDown, ArrowUp, Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { upsertStagesAction } from '@/app/actions/pipeline'
import type { PipelineStage } from '@/types'

interface Props {
  pipelineId: string
  initialStages: PipelineStage[]
}

type EditableStage = { id?: string; name: string; order: number; color: string }

const PRESET_COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#06b6d4', '#ec4899']

export function StagesEditor({ pipelineId, initialStages }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [stages, setStages] = useState<EditableStage[]>(
    [...initialStages]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ id: s.id, name: s.name, order: s.order, color: s.color })),
  )

  function addStage() {
    setStages((prev) => [...prev, { name: 'Nova etapa', order: prev.length + 1, color: '#6b7280' }])
  }

  function removeStage(idx: number) {
    setStages((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
  }

  function move(idx: number, dir: -1 | 1) {
    setStages((prev) => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      const tmp = next[idx]
      next[idx] = next[target]
      next[target] = tmp
      return next.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function updateField(idx: number, patch: Partial<EditableStage>) {
    setStages((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))
  }

  function handleSave() {
    setErr(null)
    if (stages.length < 2) { setErr('Mínimo 2 etapas'); return }
    if (stages.some((s) => !s.name.trim())) { setErr('Todos os nomes precisam estar preenchidos'); return }

    startTransition(async () => {
      const result = await upsertStagesAction(
        pipelineId,
        stages.map((s, i) => ({ id: s.id, name: s.name.trim(), order: i + 1, color: s.color })),
      )
      if (result.error) { setErr(result.error); toast.error(result.error); return }
      toast.success('Etapas salvas')
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

      <div className="space-y-2">
        {stages.map((s, idx) => (
          <div key={s.id ?? `new-${idx}`} className="flex items-center gap-2 bg-[#0a0a0a] border border-[#222] rounded-xl p-3">
            <div className="flex flex-col gap-0.5">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="text-[#555] hover:text-white disabled:opacity-30">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === stages.length - 1} className="text-[#555] hover:text-white disabled:opacity-30">
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>
            <span className="text-xs text-[#555] w-5 text-center">{idx + 1}</span>
            <input
              type="color"
              value={s.color}
              onChange={(e) => updateField(idx, { color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0 shrink-0"
              list="stage-colors"
            />
            <input
              value={s.name}
              onChange={(e) => updateField(idx, { name: e.target.value })}
              className="flex-1 bg-transparent text-sm text-white focus:outline-none border-b border-transparent focus:border-[#EACE00]/50 pb-0.5"
            />
            {stages.length > 2 && (
              <button type="button" onClick={() => removeStage(idx)} className="text-[#555] hover:text-red-400 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <datalist id="stage-colors">
        {PRESET_COLORS.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={addStage}
          className="inline-flex items-center gap-1.5 text-xs text-[#EACE00] hover:text-[#f5d800] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar etapa
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EACE00] text-black text-sm font-semibold hover:bg-[#f5d800] transition-colors disabled:opacity-50"
        >
          {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</> : 'Salvar etapas'}
        </button>
      </div>
    </div>
  )
}
