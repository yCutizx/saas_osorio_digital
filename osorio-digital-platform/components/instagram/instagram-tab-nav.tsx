import Link from 'next/link'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'posts'

interface Props {
  basePath: string
  active:   Tab
  /** Outros searchParams a preservar (from/to/etc) */
  preserve?: Record<string, string | undefined>
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'posts',    label: 'Posts'       },
]

export function InstagramTabNav({ basePath, active, preserve }: Props) {
  function hrefFor(tab: Tab) {
    const params = new URLSearchParams()
    params.set('tab', tab)
    if (preserve) {
      for (const [k, v] of Object.entries(preserve)) {
        if (v) params.set(k, v)
      }
    }
    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="inline-flex items-center gap-1 bg-[#111] border border-white/5 rounded-xl p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={hrefFor(t.key)}
          scroll={false}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            t.key === active
              ? 'bg-[#EACE00] text-black shadow'
              : 'text-white/50 hover:text-white hover:bg-white/5',
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
