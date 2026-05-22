'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export type PostsFilterType   = 'all' | 'posts' | 'reels'
export type PostsFilterPeriod = '7d' | '30d' | '90d'
export type PostsFilterSort   = 'recent' | 'views' | 'engagement'

interface Props {
  type:   PostsFilterType
  period: PostsFilterPeriod
  sort:   PostsFilterSort
}

const TYPES:   { key: PostsFilterType;   label: string }[] = [
  { key: 'all',   label: 'Todos'  },
  { key: 'posts', label: 'Posts'  },
  { key: 'reels', label: 'Reels'  },
]

const PERIODS: { key: PostsFilterPeriod; label: string }[] = [
  { key: '7d',  label: '7 dias'  },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
]

const SORTS:   { key: PostsFilterSort;   label: string }[] = [
  { key: 'recent',     label: 'Mais recentes'   },
  { key: 'views',      label: 'Mais views'      },
  { key: 'engagement', label: 'Mais engajamento' },
]

export function InstagramPostsFilters({ type, period, sort }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'posts')
    params.set(key, value)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <FilterGroup label="Tipo">
        {TYPES.map((t) => (
          <Pill key={t.key} active={t.key === type} onClick={() => update('type', t.key)}>
            {t.label}
          </Pill>
        ))}
      </FilterGroup>

      <FilterGroup label="Período">
        {PERIODS.map((p) => (
          <Pill key={p.key} active={p.key === period} onClick={() => update('period', p.key)}>
            {p.label}
          </Pill>
        ))}
      </FilterGroup>

      <FilterGroup label="Ordenar">
        {SORTS.map((s) => (
          <Pill key={s.key} active={s.key === sort} onClick={() => update('sort', s.key)}>
            {s.label}
          </Pill>
        ))}
      </FilterGroup>

      {pending && (
        <Loader2 className="h-4 w-4 animate-spin text-[#EACE00] ml-auto" />
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-white/30">{label}</span>
      <div className="flex gap-1 bg-black/40 rounded-lg p-1">{children}</div>
    </div>
  )
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
        active
          ? 'bg-[#EACE00] text-black'
          : 'text-white/40 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}
