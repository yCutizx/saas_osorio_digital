'use client'

import { useState, useTransition } from 'react'
import { Loader2, AlertCircle, Ban, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { cancelCommissionAction } from '@/app/actions/commercial'

interface Props {
  commissionId: string
}

export function CancelModal({ commissionId }: Props) {
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [pending, startSubmit] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (reason.trim().length < 3) {
      setError('Motivo deve ter no mínimo 3 caracteres')
      return
    }
    startSubmit(async () => {
      const r = await cancelCommissionAction(commissionId, reason.trim())
      if ('error' in r) {
        setError(r.error ?? 'Erro ao cancelar')
        return
      }
      toast.success('Comissão cancelada')
      setOpen(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex items-center gap-1.5 border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
        <Ban className="h-3.5 w-3.5" />
        Cancelar
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0A] border-l border-[#222] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">Cancelar comissão</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 rounded-lg px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            Esta ação não pode ser desfeita. Comissão será marcada como
            cancelada e ficará registrada com o motivo abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-xs text-[#888] font-medium uppercase tracking-wider">
              Motivo do cancelamento <span className="text-red-400">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              disabled={pending}
              placeholder="Ex: cliente cancelou o serviço antes do pagamento; erro no cálculo, etc."
              className="w-full bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#F5F5F0] focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50 resize-none"
            />
            <p className="text-[10px] text-[#666]">Mínimo 3 caracteres.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="flex-1 px-4 py-2 rounded-lg border border-[#222] text-[#888] hover:bg-[#111] text-sm transition-colors disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Confirmar cancelamento
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
