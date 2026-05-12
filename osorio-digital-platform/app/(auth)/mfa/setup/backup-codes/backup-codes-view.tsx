'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { BackupCodesGrid }     from '@/components/mfa/backup-codes-grid'
import { AlertTriangle }       from 'lucide-react'

export function BackupCodesView() {
  const [codes, setCodes]   = useState<string[]>([])
  const [ready, setReady]   = useState(false)
  const router              = useRouter()

  useEffect(() => {
    const raw = sessionStorage.getItem('mfa_backup_codes')
    if (!raw) {
      router.replace('/mfa/setup')
      return
    }
    try {
      setCodes(JSON.parse(raw))
    } catch {
      router.replace('/mfa/setup')
      return
    }
    sessionStorage.removeItem('mfa_backup_codes')
    setReady(true)
  }, [router])

  if (!ready) return null

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
        <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-yellow-300 text-xs">
          Esses códigos não serão exibidos novamente. Guarde-os agora.
        </p>
      </div>

      <BackupCodesGrid codes={codes} />

      <button
        onClick={() => router.push('/')}
        className="w-full py-3 bg-[#EACE00] text-black font-bold rounded-xl hover:bg-[#f5d800] transition-colors"
      >
        Entrar na plataforma
      </button>
    </div>
  )
}
