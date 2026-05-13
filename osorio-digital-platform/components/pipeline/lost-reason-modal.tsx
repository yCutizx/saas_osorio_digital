'use client'

import { useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { LEAD_LOST_REASONS } from '@/types'
import { setLostReasonAction } from '@/app/actions/pipeline'

interface LostReasonModalProps {
  leadId: string
  onClose: () => void
  onSaved: () => void
}

export function LostReasonModal({ leadId, onClose, onSaved }: LostReasonModalProps) {
  const [reason, setReason]           = useState<string>('Sem orçamento')
  const [reasonOther, setReasonOther] = useState('')
  const [pending, setPending]         = useState(false)
  const [err, setErr]                 = useState<string | null>(null)

  async function handleSave() {
    setErr(null)
    if (reason === 'Outro' && !reasonOther.trim()) {
      setErr('Descreva o motivo')
      return
    }
    setPending(true)
    const result = await setLostReasonAction(
      leadId,
      reason,
      reason === 'Outro' ? reasonOther.trim() : null,
    )
    setPending(false)
    if (result.error) {
      setErr(result.error)
      toast.error(result.error)
      return
    }
    toast.success('Motivo registrado')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-base">Motivo da perda</h3>
          <button onClick={onClose} className="text-[#888] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {err && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-3 py-2 text-sm mb-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {err}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[#888] text-xs mb-1.5 block">Motivo *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 [color-scheme:dark]"
            >
              {LEAD_LOST_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {reason === 'Outro' && (
            <div>
              <label className="text-[#888] text-xs mb-1.5 block">Descreva *</label>
              <textarea
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                rows={3}
                placeholder="Conte o que aconteceu..."
                className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#EACE00]/50 resize-none placeholder-[#555]"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={pending}
              className="flex-1 py-2 border border-[#333] text-[#888] rounded-lg text-sm hover:border-[#555] hover:text-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={pending}
              className="flex-1 py-2 bg-red-500 text-white font-semibold rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {pending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</> : 'Confirmar perda'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
