'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Client = { id: string; name: string }

interface Props {
  clients:         Client[]
  currentClientId: string | null
}

export function SocialFilters({ clients, currentClientId }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    router.push(`/social/dashboard?${next.toString()}`)
  }

  if (clients.length <= 1) return null

  return (
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
  )
}
