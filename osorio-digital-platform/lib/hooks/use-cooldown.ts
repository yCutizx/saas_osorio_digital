'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Cooldown contador-regressivo pra botões. Após `startCooldown()`,
 * `isCoolingDown` fica true e `remaining` decrementa a cada segundo até zerar.
 */
export function useCooldown(seconds: number = 60) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [remaining])

  const startCooldown = useCallback(() => {
    setRemaining(seconds)
  }, [seconds])

  return {
    isCoolingDown: remaining > 0,
    remaining,
    startCooldown,
  }
}
