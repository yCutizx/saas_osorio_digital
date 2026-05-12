'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { toast }                   from 'sonner'
import { QrCodeDisplay }           from '@/components/mfa/qr-code-display'
import { OtpInput }                from '@/components/ui/otp-input'
import { activateMfa }             from '@/app/(auth)/mfa/actions'

interface SetupFormProps {
  qrCodeDataUrl:  string
  manualEntryKey: string
}

export function SetupForm({ qrCodeDataUrl, manualEntryKey }: SetupFormProps) {
  const [code, setCode]       = useState('')
  const [isPending, start]    = useTransition()
  const router                = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) return
    start(async () => {
      try {
        const result = await activateMfa(code)
        sessionStorage.setItem('mfa_backup_codes', JSON.stringify(result.backupCodes))
        router.push('/mfa/setup/backup-codes')
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao ativar MFA')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <QrCodeDisplay qrCodeDataUrl={qrCodeDataUrl} manualEntryKey={manualEntryKey} />

      <div className="space-y-2">
        <p className="text-[#888] text-xs text-center">
          Digite o código de 6 dígitos gerado pelo app:
        </p>
        <OtpInput value={code} onChange={setCode} disabled={isPending} />
      </div>

      <button
        type="submit"
        disabled={isPending || code.length < 6}
        className="w-full py-3 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#f5d800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Verificando...' : 'Ativar MFA'}
      </button>
    </form>
  )
}
