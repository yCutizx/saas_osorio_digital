'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { toast }                   from 'sonner'
import { OtpInput }                from '@/components/ui/otp-input'
import { verifyMfaLogin }          from '@/app/(auth)/mfa/actions'

export function VerifyForm() {
  const [code, setCode]        = useState('')
  const [trustDevice, setTrust] = useState(false)
  const [isPending, start]     = useTransition()
  const router                 = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) return
    start(async () => {
      try {
        await verifyMfaLogin(code, trustDevice)
        router.refresh()
        router.push('/')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Código inválido')
        setCode('')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <OtpInput value={code} onChange={setCode} disabled={isPending} />

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          role="checkbox"
          aria-checked={trustDevice}
          tabIndex={0}
          onClick={() => setTrust((v) => !v)}
          onKeyDown={(e) => e.key === ' ' && setTrust((v) => !v)}
          className={`w-5 h-5 rounded border transition-colors flex items-center justify-center ${
            trustDevice ? 'bg-[#EACE00] border-[#EACE00]' : 'bg-transparent border-[#444]'
          }`}
        >
          {trustDevice && (
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="text-[#888] text-sm">Confiar neste dispositivo por 30 dias</span>
      </label>

      <button
        type="submit"
        disabled={isPending || code.length < 6}
        className="w-full py-3 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#f5d800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Verificando...' : 'Verificar'}
      </button>
    </form>
  )
}
