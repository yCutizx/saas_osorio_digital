'use client'

import { useState }               from 'react'
import { toast }                  from 'sonner'
import { regenerateBackupCodes, resetMfa } from '../actions'
import { Card }                   from '@/components/ui/card'
import { Button }                 from '@/components/ui/button'
import { OtpInput }               from '@/components/ui/otp-input'
import { BackupCodesGrid }        from '@/components/mfa/backup-codes-grid'
import { ShieldCheck, KeyRound, RotateCw, AlertCircle, Loader2 } from 'lucide-react'

type Mode = 'idle' | 'regenerate' | 'reset' | 'show-codes'

export function MfaSection() {
  const [mode, setMode]         = useState<Mode>('idle')
  const [code, setCode]         = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [newCodes, setNewCodes] = useState<string[]>([])

  function reset() {
    setCode('')
    setError(null)
    setIsPending(false)
  }

  async function handleRegenerate() {
    setError(null)
    setIsPending(true)
    const result = await regenerateBackupCodes(code)
    if (!result.success) {
      setError(result.error ?? 'Erro')
      setIsPending(false)
      return
    }
    setNewCodes(result.backupCodes ?? [])
    setMode('show-codes')
    reset()
    toast.success('Códigos de backup regenerados')
  }

  async function handleReset() {
    setError(null)
    setIsPending(true)
    const result = await resetMfa(code)
    // If result returned (error case), show it; success triggers redirect server-side
    if (result && !result.success) {
      setError(result.error ?? 'Erro')
      setIsPending(false)
    }
  }

  if (mode === 'show-codes') {
    return (
      <Card className="bg-[#111] border-[#222] p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F0]">Novos códigos de backup</h2>
          <p className="text-sm text-[#888] mt-1">
            Salve estes códigos em local seguro. Os antigos foram invalidados.
          </p>
        </div>
        <BackupCodesGrid codes={newCodes} />
        <Button
          variant="outline"
          onClick={() => { setMode('idle'); setNewCodes([]) }}
        >
          Fechar
        </Button>
      </Card>
    )
  }

  if (mode === 'regenerate' || mode === 'reset') {
    const isReset = mode === 'reset'
    return (
      <Card className="bg-[#111] border-[#222] p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#F5F5F0]">
            {isReset ? 'Resetar MFA' : 'Regenerar códigos de backup'}
          </h2>
          <p className="text-sm text-[#888] mt-1">
            {isReset
              ? 'Sua configuração de MFA será removida e você precisará configurar novamente no próximo acesso.'
              : 'Os códigos antigos serão invalidados e 10 novos serão gerados.'}
          </p>
        </div>

        <OtpInput value={code} onChange={setCode} disabled={isPending} />

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => { setMode('idle'); reset() }}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={isReset ? handleReset : handleRegenerate}
            disabled={isPending || code.length !== 6}
            className={isReset
              ? 'bg-red-600 hover:bg-red-500 text-white font-semibold'
              : 'bg-[#EACE00] text-black hover:bg-[#EACE00]/90 font-semibold'
            }
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
              : isReset ? 'Resetar MFA' : 'Regenerar'
            }
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111] border-[#222] p-6 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-[#EACE00] mt-0.5 shrink-0" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[#F5F5F0]">Autenticação em dois fatores</h2>
          <p className="text-sm text-[#888] mt-1">
            MFA está <span className="text-green-400 font-medium">ativo</span> na sua conta.
            Você precisa do app autenticador pra fazer login.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => setMode('regenerate')}
          className="justify-start h-auto py-3 px-4"
        >
          <KeyRound className="h-4 w-4 mr-3 shrink-0" />
          <div className="text-left">
            <p className="font-medium">Regenerar códigos</p>
            <p className="text-xs text-[#888]">Invalida os antigos</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => setMode('reset')}
          className="justify-start h-auto py-3 px-4 hover:border-red-500/50 hover:text-red-400"
        >
          <RotateCw className="h-4 w-4 mr-3 shrink-0" />
          <div className="text-left">
            <p className="font-medium">Resetar MFA</p>
            <p className="text-xs text-[#888]">Configurar de novo</p>
          </div>
        </Button>
      </div>
    </Card>
  )
}
