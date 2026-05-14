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

const DEBUG = process.env.NODE_ENV !== 'production'

/**
 * Assina mudanças em uma tabela do Postgres via Supabase Realtime.
 * Passe `null` para desativar dinamicamente (ex: enquanto não há lead aberto).
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
        if (DEBUG) {
          console.log(`[Realtime] ${channel} ${table} event:`, payload?.eventType, payload)
        }
        if (currentUserId) {
          const newRow = payload?.new as Record<string, unknown> | null | undefined
          if (newRow && newRow[userColumn] === currentUserId) {
            if (DEBUG) console.log(`[Realtime] ${channel} ignorando evento do próprio user`)
            return
          }
        }
        onEventRef.current?.(payload)
      },
    ).subscribe((status: string, err?: Error) => {
      if (DEBUG) {
        console.log(`[Realtime] ${channel} status:`, status, err ?? '')
      }
      if (err) {
        console.error(`[Realtime] ${channel} error:`, err)
      }
    })

    return () => {
      if (DEBUG) console.log(`[Realtime] ${channel} unsubscribed`)
      supabase.removeChannel(ch)
    }
  }, [channel, table, filter, event, currentUserId, userColumn])
}
