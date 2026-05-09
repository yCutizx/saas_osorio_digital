'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateProjectStageAction } from '@/app/actions/pipeline'
import { ChevronDown } from 'lucide-react'

type Stage = { id: string; name: string; order: number; color: string }

const STAGE_COLORS: Record<string, string> = {
  'A Fazer':       '#3B82F6',
  'Em Andamento':  '#F59E0B',
  'Em Revisão':    '#8B5CF6',
  'Concluído':     '#22C55E',
}

interface Props {
  projectId: string
  currentStage: string
  stages: Stage[]
}

export function ProjectStageSelector({ projectId, currentStage, stages }: Props) {
  const [isPending, startTransition] = useTransition()
  const [stage, setStage] = useState(currentStage)
  const [open, setOpen] = useState(false)

  const stageColor = STAGE_COLORS[stage] ?? '#6B7280'

  function handleSelect(newStage: string) {
    setStage(newStage)
    setOpen(false)
    startTransition(async () => {
      try {
        await updateProjectStageAction(projectId, newStage)
        toast.success('Estágio atualizado!')
      } catch {
        setStage(currentStage)
        toast.error('Erro ao atualizar estágio')
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50"
        style={{ borderColor: stageColor + '44', background: stageColor + '11', color: stageColor }}
      >
        {stage}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#111] border border-[#222] rounded-xl overflow-hidden shadow-xl z-20 min-w-[160px]">
          {stages.map((s) => {
            const color = STAGE_COLORS[s.name] ?? '#6B7280'
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span style={{ color: s.name === stage ? color : 'rgba(255,255,255,0.7)' }}>
                  {s.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
