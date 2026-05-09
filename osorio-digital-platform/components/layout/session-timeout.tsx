'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000   // 30 min de inatividade
const WARNING_MS =  5 * 60 * 1000   // aviso 5 min antes

export function SessionTimeout() {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [remaining,   setRemaining]   = useState(WARNING_MS / 1000)
  const warnTimer  = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const countTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastReset  = useRef(0)

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const clearTimers = useCallback(() => {
    if (warnTimer.current)  clearTimeout(warnTimer.current)
    if (countTimer.current) clearInterval(countTimer.current)
  }, [])

  const resetTimer = useCallback(() => {
    clearTimers()
    setShowWarning(false)
    sessionStorage.setItem('lastActivity', String(Date.now()))

    warnTimer.current = setTimeout(() => {
      setShowWarning(true)
      setRemaining(WARNING_MS / 1000)

      countTimer.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countTimer.current!)
            logout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, TIMEOUT_MS - WARNING_MS)
  }, [clearTimers, logout])

  useEffect(() => {
    // Detecta inatividade prévia
    const saved = sessionStorage.getItem('lastActivity')
    if (saved && Date.now() - parseInt(saved) > TIMEOUT_MS) {
      logout()
      return
    }

    const events: string[] = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']

    const handle = () => {
      const now = Date.now()
      if (now - lastReset.current < 30_000) return // throttle: 1x por 30s
      lastReset.current = now
      resetTimer()
    }

    events.forEach((e) => document.addEventListener(e, handle, { passive: true }))
    resetTimer()

    return () => {
      events.forEach((e) => document.removeEventListener(e, handle))
      clearTimers()
    }
  }, [resetTimer, clearTimers, logout])

  if (!showWarning) return null

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')} min`
    : `${secs}s`

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111] border border-[#222] rounded-2xl p-8 w-full max-w-sm mx-4 text-center space-y-4 shadow-2xl">
        <div className="text-4xl select-none">⏱</div>
        <h2 className="text-white text-lg font-bold">Sessão expirando</h2>
        <p className="text-[#888] text-sm leading-relaxed">
          Sua sessão expirará em{' '}
          <span className="text-[#EACE00] font-bold">{timeStr}</span>{' '}
          por inatividade.
        </p>
        <div className="flex gap-3">
          <button
            onClick={logout}
            className="flex-1 py-2.5 rounded-xl border border-[#333] text-[#888] text-sm hover:text-white hover:border-[#444] transition-colors"
          >
            Sair agora
          </button>
          <button
            onClick={resetTimer}
            className="flex-1 py-2.5 rounded-xl bg-[#EACE00] text-black font-bold text-sm hover:bg-[#EACE00]/90 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
