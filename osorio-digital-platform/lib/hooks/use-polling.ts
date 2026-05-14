'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UsePollingOptions {
  /** Intervalo em milissegundos entre cada refresh */
  interval: number
  /** Se false, polling desativado (útil pra condicionais) */
  enabled?: boolean
  /** Se true, pausa quando a aba não está visível (economia de requests) */
  pauseWhenHidden?: boolean
}

/**
 * Roda router.refresh() em intervalos regulares para sincronizar a tela
 * com mudanças do servidor. Útil quando Realtime não está disponível.
 *
 * Pausa automaticamente quando a aba está em background (visibility hidden) —
 * economia de requests sem prejuízo de UX. Ao voltar pra aba, faz um refresh
 * imediato pra pegar o que perdeu.
 */
export function usePolling({ interval, enabled = true, pauseWhenHidden = true }: UsePollingOptions) {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    function start() {
      if (intervalRef.current) return
      intervalRef.current = setInterval(() => {
        router.refresh()
      }, interval)
    }

    function stop() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        if (pauseWhenHidden) stop()
      } else {
        start()
        router.refresh()
      }
    }

    if (!pauseWhenHidden || !document.hidden) {
      start()
    }

    if (pauseWhenHidden) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      stop()
      if (pauseWhenHidden) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [interval, enabled, pauseWhenHidden, router])
}
