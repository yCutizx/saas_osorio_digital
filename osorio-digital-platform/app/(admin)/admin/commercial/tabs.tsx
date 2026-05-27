'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users2, HandCoins, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Visão geral',   href: '/admin/commercial',             icon: LayoutDashboard, exact: true },
  { label: 'Time',          href: '/admin/commercial/team',        icon: Users2 },
  { label: 'Comissões',     href: '/admin/commercial/commissions', icon: HandCoins },
  { label: 'Configurações', href: '/admin/commercial/settings',    icon: Settings },
]

export function CommercialTabs() {
  const pathname = usePathname()
  return (
    <div className="border-b border-[#1a1a1a] flex items-center gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const Icon = t.icon
        const isActive = t.exact
          ? pathname === t.href
          : pathname === t.href || pathname.startsWith(t.href + '/')
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              isActive
                ? 'border-[#EACE00] text-[#EACE00]'
                : 'border-transparent text-[#888] hover:text-white',
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
