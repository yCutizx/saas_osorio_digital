'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type Client = { id: string; name: string }

interface Props {
  clients:         Client[]
  currentPeriod:   string
  currentClientId: string | null
}

const PERIODS = [
  { value: '7',  label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
]

export function TrafficFilters({ clients, currentPeriod, currentClientId }: Props) {
  const router     = useRouter()
  const params     = useSearchParams()

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    router.push(`/traffic/dashboard?${next.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Seletor de período */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => navigate({ period: p.value })}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              currentPeriod === p.value
                ? 'bg-brand-yellow text-brand-black'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Seletor de cliente (só aparece se houver mais de 1) */}
      {clients.length > 1 && (
        <select
          value={currentClientId ?? ''}
          onChange={(e) => navigate({ client: e.target.value || null })}
          className="h-9 px-3 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-brand-yellow transition-colors"
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
