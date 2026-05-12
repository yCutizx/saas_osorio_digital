'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { toast }                   from 'sonner'
import { confirmMfaRecovery }      from '../actions'

export function RecoveryConfirmForm({ token }: { token: string }) {
  const [isPending, start]  = useTransition()
  const [confirmed, setDone] = useState(false)
  const router               = useRouter()

  function handleConfirm() {
    start(async () => {
      try {
        await confirmMfaRecovery(token)
        setDone(true)
        setTimeout(() => router.push('/mfa/setup'), 2000)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao confirmar recuperação')
      }
    })
  }

  if (confirmed) {
    return (
      <div className="text-center space-y-2 py-4">
        <p className="text-green-400 font-semibold">MFA removido com sucesso!</p>
        <p className="text-[#888] text-sm">Redirecionando para configuração...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Processando...' : 'Confirmar e remover MFA'}
      </button>
      <a
        href="/mfa/verify"
        className="block text-center text-sm text-[#555] hover:text-[#888] transition-colors"
      >
        Cancelar
      </a>
    </div>
  )
}
