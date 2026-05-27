'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SellerOption {
  id:        string
  full_name: string | null
  email:     string
}

interface ClientOption {
  id:   string
  name: string
}

interface MonthOption {
  value: string  // yyyy-mm
  label: string
}

interface Props {
  status:   string
  sellerId: string
  clientId: string
  month:    string
  sellers:  SellerOption[]
  clients:  ClientOption[]
  months:   MonthOption[]
}

const STATUS_OPTIONS = [
  { value: 'all',      label: 'Todos os status' },
  { value: 'pending',  label: 'Pendentes'        },
  { value: 'paid',     label: 'Pagas'            },
  { value: 'canceled', label: 'Canceladas'       },
]

export function CommissionsFilters({ status, sellerId, clientId, month, sellers, clients, months }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete(key)
    else params.set(key, value)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        label="Status"
        value={status}
        onChange={(v) => update('status', v)}
        disabled={pending}
        options={STATUS_OPTIONS}
      />
      <Select
        label="Vendedor"
        value={sellerId}
        onChange={(v) => update('seller_id', v)}
        disabled={pending}
        options={[
          { value: 'all', label: 'Todos' },
          ...sellers.map((s) => ({ value: s.id, label: s.full_name ?? s.email })),
        ]}
      />
      <Select
        label="Cliente"
        value={clientId}
        onChange={(v) => update('client_id', v)}
        disabled={pending}
        options={[
          { value: 'all', label: 'Todos os clientes' },
          ...clients.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <Select
        label="Mês"
        value={month}
        onChange={(v) => update('month', v)}
        disabled={pending}
        options={[
          { value: 'all', label: 'Todos os meses' },
          ...months.map((m) => ({ value: m.value, label: m.label })),
        ]}
      />
      {pending && (
        <Loader2 className="h-4 w-4 animate-spin text-[#EACE00] ml-auto" />
      )}
    </div>
  )
}

function Select({ label, value, onChange, disabled, options }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  disabled: boolean
  options:  { value: string; label: string }[]
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-white/40 uppercase tracking-widest">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'bg-[#0A0A0A] border border-[#222] rounded-lg px-3 py-1.5 text-sm text-[#F5F5F0]',
          'focus:outline-none focus:border-[#EACE00]/60 disabled:opacity-50',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
