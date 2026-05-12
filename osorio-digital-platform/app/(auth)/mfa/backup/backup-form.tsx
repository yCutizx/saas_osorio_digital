'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { toast }                   from 'sonner'
import { verifyBackupCode }        from '@/app/(auth)/mfa/actions'

export function BackupForm() {
  const [code, setCode]     = useState('')
  const [isPending, start]  = useTransition()
  const router              = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^A-Fa-f0-9-]/g, '').toUpperCase()
    // Auto-insert dash after 4 chars
    if (raw.length === 4 && !raw.includes('-') && code.length === 3) {
      setCode(raw + '-')
      return
    }
    setCode(raw.slice(0, 9))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 9) return
    start(async () => {
      try {
        const result = await verifyBackupCode(code)
        if (!result.success) {
          toast.error('Código inválido ou já utilizado.')
          setCode('')
          return
        }
        router.refresh()
        router.push('/')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao verificar código')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        value={code}
        onChange={handleChange}
        placeholder="XXXX-XXXX"
        disabled={isPending}
        className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-center text-lg font-mono tracking-widest placeholder-[#444] focus:border-[#EACE00] focus:outline-none transition-colors"
      />
      <button
        type="submit"
        disabled={isPending || code.length < 9}
        className="w-full py-3 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#f5d800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Verificando...' : 'Usar código de backup'}
      </button>
    </form>
  )
}
