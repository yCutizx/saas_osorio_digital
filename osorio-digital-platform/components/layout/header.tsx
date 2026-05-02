'use client'

import { Bell, Menu } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { type UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:           'Administrador',
  traffic_manager: 'Gestor de Tráfego',
  social_media:    'Social Media',
  client:          'Cliente',
}

interface HeaderProps {
  userName:    string
  userRole:    UserRole
  avatarUrl?:  string | null
  pageTitle?:  string
  onMenuOpen?: () => void
}

export function Header({ userName, userRole, avatarUrl, pageTitle, onMenuOpen }: HeaderProps) {
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-16 bg-[#0A0A0A] border-b border-[#1e1e1e] flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-lg text-white/40 hover:bg-white/5 hover:text-white transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {pageTitle && (
          <h1 className="text-white font-bold text-base md:text-xl">{pageTitle}</h1>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button
          className="relative text-white/25 hover:text-white transition-colors"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-semibold leading-none">{userName}</p>
            <p className="text-white/35 text-xs mt-0.5">{ROLE_LABELS[userRole]}</p>
          </div>
          <Avatar className="h-8 w-8 border border-[#EACE00]/30">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
            <AvatarFallback className="bg-[#EACE00] text-black text-xs font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
