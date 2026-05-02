'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type UserRole } from '@/types'
import {
  LayoutDashboard, Users, TrendingUp, Calendar,
  Lightbulb, FileSearch, LogOut, ChevronLeft, ChevronRight, X, BarChart2, Megaphone,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavItem {
  label: string
  href:  string
  icon:  React.ComponentType<{ className?: string }>
}

const NAV_BY_ROLE: Record<Exclude<UserRole, 'client'>, NavItem[]> = {
  admin: [
    { label: 'Dashboard',  href: '/admin/dashboard',      icon: LayoutDashboard },
    { label: 'Clientes',   href: '/admin/clients',        icon: Users },
    { label: 'Tráfego',    href: '/traffic/dashboard',    icon: TrendingUp },
    { label: 'Campanhas',  href: '/traffic/campaigns',    icon: Megaphone },
    { label: 'Calendário', href: '/social/dashboard',     icon: Calendar },
    { label: 'Insights',   href: '/admin/insights',       icon: Lightbulb },
    { label: 'Pesquisas',  href: '/admin/research',       icon: FileSearch },
  ],
  traffic_manager: [
    { label: 'Tráfego',    href: '/traffic/dashboard',    icon: TrendingUp },
    { label: 'Campanhas',  href: '/traffic/campaigns',    icon: Megaphone },
    { label: 'Calendário', href: '/social/dashboard',     icon: Calendar },
    { label: 'Insights',   href: '/traffic/insights',     icon: Lightbulb },
    { label: 'Pesquisas',  href: '/traffic/research',     icon: FileSearch },
  ],
  social_media: [
    { label: 'Calendário', href: '/social/dashboard',  icon: Calendar },
    { label: 'Tráfego',    href: '/traffic/dashboard', icon: TrendingUp },
    { label: 'Insights',   href: '/social/insights',   icon: Lightbulb },
    { label: 'Pesquisas',  href: '/social/research',   icon: FileSearch },
  ],
}

const CLIENT_NAV: NavItem[] = [
  { label: 'Meu Painel', href: '/client/home',     icon: LayoutDashboard },
  { label: 'Anúncios',   href: '/client/ads',      icon: BarChart2 },
  { label: 'Calendário', href: '/client/calendar', icon: Calendar },
  { label: 'Insights',   href: '/client/insights', icon: Lightbulb },
  { label: 'Pesquisas',  href: '/client/research', icon: FileSearch },
]

const CLIENT_NAV_COUNT: Record<string, number> = {
  basico:  2,   // Dashboard + Anúncios
  pro:     3,   // + Calendário
  premium: 5,   // + Insights + Pesquisas
}

interface SidebarProps {
  role:        UserRole
  userName:    string
  userEmail:   string
  clientPlan?: string | null
  onClose?:    () => void
}

export function Sidebar({ role, userName, userEmail, clientPlan, onClose }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const navItems: NavItem[] = role === 'client'
    ? CLIENT_NAV.slice(0, CLIENT_NAV_COUNT[clientPlan ?? 'basico'] ?? 1)
    : (NAV_BY_ROLE[role as Exclude<UserRole, 'client'>] ?? [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-[#0A0A0A] border-r border-[#222] transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#222] shrink-0">
        <div className="w-8 h-8 bg-[#EACE00] rounded-lg flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(234,206,0,0.3)]">
          <span className="text-black font-black text-sm">O</span>
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-base tracking-tight flex-1">
            Osorio <span className="text-[#EACE00]">Digital</span>
          </span>
        )}
        {/* Close button on mobile overlay */}
        {onClose && !collapsed && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon     = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                isActive
                  ? 'bg-[#EACE00] text-black font-bold shadow-[0_2px_12px_rgba(234,206,0,0.2)]'
                  : 'text-white/40 hover:bg-white/5 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé */}
      <div className="shrink-0 border-t border-[#222] p-3 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 mb-1">
            <p className="text-white text-sm font-semibold truncate">{userName}</p>
            <p className="text-white/30 text-xs truncate mt-0.5">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>

      {/* Recolher — desktop only */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="hidden md:flex absolute -right-3 top-20 bg-[#1a1a1a] border border-white/10 rounded-full p-1 text-white/40 hover:text-white transition-colors items-center justify-center"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft  className="h-3 w-3" />}
      </button>
    </aside>
  )
}
