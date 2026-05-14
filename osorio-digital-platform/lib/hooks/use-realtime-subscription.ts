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
 * Nota: o Realtime do projeto Supabase está com problema fora do nosso código.
 * O hook segue montado para o dia em que voltar a funcionar; sincronia atual
 * vem via polling (lib/hooks/use-polling.ts).
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
        if (currentUserId) {
          const newRow = payload?.new as Record<string, unknown> | null | undefined
          if (newRow && newRow[userColumn] === currentUserId) {
            return
          }
        }
        onEventRef.current?.(payload)
      },
    ).subscribe((_status: string, err?: Error) => {
      if (err) {
        console.error(`[Realtime] ${channel} error:`, err)
      }
    })

    return () => {
      supabase.removeChannel(ch)
    }
  }, [channel, table, filter, event, currentUserId, userColumn])
}
