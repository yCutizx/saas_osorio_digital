'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Mail, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Perfil',    href: '/settings/profile',  icon: User,        description: 'Nome, bio, avatar' },
  { label: 'Conta',     href: '/settings/account',  icon: Mail,        description: 'Email e senha' },
  { label: 'Segurança', href: '/settings/security', icon: ShieldCheck, description: 'MFA e dispositivos' },
]

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0">
      <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3 px-3">
        Configurações
      </h2>
      <nav className="space-y-0.5">
        {NAV.map((item) => {
          const Icon     = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-[#EACE00]/10 text-[#EACE00]'
                  : 'text-[#F5F5F0] hover:bg-[#1a1a1a]'
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className={cn('text-xs mt-0.5', isActive ? 'text-[#EACE00]/70' : 'text-[#666]')}>
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
