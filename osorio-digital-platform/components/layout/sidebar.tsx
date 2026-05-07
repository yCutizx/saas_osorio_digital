'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { type UserRole } from '@/types'
import {
  LayoutDashboard, Users, Users2, TrendingUp, Calendar,
  Lightbulb, FileSearch, LogOut, ChevronLeft, ChevronRight, X, BarChart2, Megaphone, LayoutList,
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
    { label: 'Equipe',     href: '/admin/team',           icon: Users2 },
    { label: 'Tráfego',    href: '/traffic/dashboard',    icon: TrendingUp },
    { label: 'Campanhas',  href: '/traffic/campaigns',    icon: Megaphone },
    { label: 'Calendário', href: '/social/dashboard',     icon: Calendar },
    { label: 'Insights',   href: '/admin/insights',       icon: Lightbulb },
    { label: 'Pesquisas',  href: '/admin/research',       icon: FileSearch },
    { label: 'Kanban',     href: '/admin/kanban',         icon: LayoutList },
  ],
  traffic_manager: [
    { label: 'Tráfego',    href: '/traffic/dashboard',    icon: TrendingUp },
    { label: 'Campanhas',  href: '/traffic/campaigns',    icon: Megaphone },
    { label: 'Calendário', href: '/social/dashboard',     icon: Calendar },
    { label: 'Insights',   href: '/admin/insights',       icon: Lightbulb },
    { label: 'Pesquisas',  href: '/admin/research',       icon: FileSearch },
  ],
  social_media: [
    { label: 'Calendário', href: '/social/dashboard',  icon: Calendar },
    { label: 'Tráfego',    href: '/traffic/dashboard', icon: TrendingUp },
    { label: 'Insights',   href: '/admin/insights',    icon: Lightbulb },
    { label: 'Pesquisas',  href: '/admin/research',    icon: FileSearch },
    { label: 'Kanban',     href: '/social/kanban',     icon: LayoutList },
  ],
}

const CLIENT_NAV: NavItem[] = [
  { label: 'Meu Painel', href: '/client/home',     icon: LayoutDashboard },
  { label: 'Quadros',    href: '/client/kanban',   icon: LayoutList },
  { label: 'Anúncios',   href: '/client/ads',      icon: BarChart2 },
  { label: 'Calendário', href: '/client/calendar', icon: Calendar },
  { label: 'Insights',   href: '/client/insights', icon: Lightbulb },
  { label: 'Pesquisas',  href: '/client/research', icon: FileSearch },
]

const CLIENT_NAV_COUNT: Record<string, number> = {
  basico:  3,
  pro:     6,
  premium: 6,
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

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-[#0A0A0A] border-r border-[#1a1a1a] transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 h-16 border-b border-[#1a1a1a] shrink-0',
        collapsed ? 'px-3 justify-center' : 'px-4'
      )}>
        <div className="relative shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#f5d800] to-[#EACE00] grid place-items-center font-black text-black text-base shadow-[0_0_20px_rgba(234,206,0,0.35)]">
            O
          </div>
          <div className="absolute -inset-1 rounded-xl bg-[#EACE00]/20 blur-md -z-10" />
        </div>
        {!collapsed && (
          <>
            <span className="font-black text-base tracking-tight flex-1 text-white">
              Osorio <span className="text-[#EACE00]">Digital</span>
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Navegação ─────────────────────────────────────── */}
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
                  ? 'bg-[#EACE00] text-black font-bold shadow-[0_2px_16px_rgba(234,206,0,0.25)]'
                  : 'text-[#888] hover:text-white hover:bg-[#1a1a1a]',
                collapsed && 'justify-center'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* ── Rodapé ────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[#1a1a1a] p-3 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#111] border border-[#222] mb-1">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#f5d800] to-[#EACE00] flex items-center justify-center text-black font-black text-[11px] ring-2 ring-[#EACE00]/25 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-none">{userName}</p>
              <p className="text-[#888] text-xs truncate mt-0.5">{userEmail}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-[#888] hover:bg-red-500/10 hover:text-red-400 transition-all',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>

      {/* ── Recolher (desktop) ────────────────────────────── */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="hidden md:flex absolute -right-3 top-20 bg-[#111] border border-[#222] rounded-full p-1 text-[#888] hover:text-white hover:border-[#EACE00]/30 transition-colors items-center justify-center"
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" />
          : <ChevronLeft  className="h-3 w-3" />}
      </button>
    </aside>
  )
}
