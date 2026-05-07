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
    <header className="h-16 bg-[#0A0A0A] border-b border-[#1a1a1a] flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-lg text-[#888] hover:bg-[#1a1a1a] hover:text-white transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {pageTitle && (
          <h1 className="text-white font-bold text-base md:text-lg tracking-tight">{pageTitle}</h1>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button
          className="relative text-[#888] hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a1a1a]"
          aria-label="Notificações"
        >
          <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </button>

        <div className="w-px h-5 bg-[#1a1a1a]" />

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-[#F5F5F0] text-sm font-semibold leading-none">{userName}</p>
            <p className="text-[#888] text-xs mt-0.5">{ROLE_LABELS[userRole]}</p>
          </div>
          <Avatar className="h-8 w-8 ring-2 ring-[#EACE00]/35 ring-offset-1 ring-offset-[#0A0A0A]">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
            <AvatarFallback className="bg-gradient-to-br from-[#f5d800] to-[#EACE00] text-black text-xs font-black">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
