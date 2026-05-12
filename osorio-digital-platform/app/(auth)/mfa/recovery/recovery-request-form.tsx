'use client'

import { useState, useTransition } from 'react'
import { toast }                   from 'sonner'
import { requestMfaRecovery }      from './actions'
import { CheckCircle }             from 'lucide-react'

export function RecoveryRequestForm() {
  const [sent, setSent]     = useState(false)
  const [isPending, start]  = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      try {
        await requestMfaRecovery()
        setSent(true)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar e-mail')
      }
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <CheckCircle className="h-12 w-12 text-green-400" />
        <p className="text-white font-semibold text-center">E-mail enviado!</p>
        <p className="text-[#888] text-sm text-center">
          Verifique sua caixa de entrada. O link expira em 15 minutos.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#f5d800] transition-colors disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>
    </form>
  )
}
