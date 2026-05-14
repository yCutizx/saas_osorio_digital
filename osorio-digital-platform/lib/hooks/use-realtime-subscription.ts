'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export type SubscriptionOptions = {
  channel: string
  table: string
  filter?: string
  event?: RealtimeEvent
  /**
   * Quando setado, eventos com payload.new[userColumn] === currentUserId são ignorados
   * (evita double-update do próprio user que já fez router.refresh).
   */
  currentUserId?: string | null
  /** Coluna de autor. Default 'user_id'. */
  userColumn?: string
  onEvent: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
}

/**
 * Assina mudanças em uma tabela do Postgres via Supabase Realtime.
 * Passe `null` para desativar dinamicamente (ex: enquanto não há lead aberto).
 *
 * Telemetria via `console.warn` (não `log`) porque alguns pipelines de build
 * removem `console.log` em produção. `warn` quase nunca é stripped.
 */
export function useRealtimeSubscription(opts: SubscriptionOptions | null) {
  const onEventRef = useRef(opts?.onEvent)
  onEventRef.current = opts?.onEvent

  const channel = opts?.channel ?? null
  const table = opts?.table ?? null
  const filter = opts?.filter ?? null
  const event = opts?.event ?? '*'
  const currentUserId = opts?.currentUserId ?? null
  const userColumn = opts?.userColumn ?? 'user_id'

  useEffect(() => {
    if (!channel || !table) return

    console.warn(`[Realtime] mounting subscription: ${channel} → ${table}${filter ? ` (${filter})` : ''}`)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch: any = supabase.channel(channel)

    ch.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        console.warn(`[Realtime] ${channel} ${table} event:`, payload?.eventType, payload)
        if (currentUserId) {
          const newRow = payload?.new as Record<string, unknown> | null | undefined
          if (newRow && newRow[userColumn] === currentUserId) {
            console.warn(`[Realtime] ${channel} ignorando evento do próprio user`)
            return
          }
        }
        onEventRef.current?.(payload)
      },
    ).subscribe((status: string, err?: Error) => {
      console.warn(`[Realtime] ${channel} status:`, status, err ?? '')
      if (err) {
        console.error(`[Realtime] ${channel} error:`, err)
      }
    })

    return () => {
      console.warn(`[Realtime] ${channel} unsubscribed`)
      supabase.removeChannel(ch)
    }
  }, [channel, table, filter, event, currentUserId, userColumn])
}
