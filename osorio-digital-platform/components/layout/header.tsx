'use client'

import { Menu, Settings, ShieldCheck, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { type UserRole } from '@/types'
import { NotificationBell } from '@/components/layout/notification-bell'
import { getInitials, getAvatarGradient, getAvatarTextColor } from '@/lib/avatar-utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:           'Administrador',
  traffic_manager: 'Gestor de Tráfego',
  social_media:    'Social Media',
  client:          'Cliente',
}

interface HeaderProps {
  userId:      string
  userName:    string
  userEmail:   string
  userRole:    UserRole
  avatarUrl?:  string | null
  pageTitle?:  string
  onMenuOpen?: () => void
}

export function Header({ userId, userName, userEmail, userRole, avatarUrl, pageTitle, onMenuOpen }: HeaderProps) {
  const router   = useRouter()
  const initials = getInitials(userName)
  const gradient = getAvatarGradient(userId)
  const textColor = getAvatarTextColor(gradient)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
        <NotificationBell />

        <div className="w-px h-5 bg-[#1a1a1a]" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2.5 hover:opacity-80 transition-opacity outline-none">
            <div className="text-right hidden sm:block">
              <p className="text-[#F5F5F0] text-sm font-semibold leading-none">{userName}</p>
              <p className="text-[#888] text-xs mt-0.5">{ROLE_LABELS[userRole]}</p>
            </div>
            <Avatar className="h-8 w-8 ring-2 ring-[#EACE00]/35 ring-offset-1 ring-offset-[#0A0A0A]">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className={`bg-gradient-to-br ${gradient} ${textColor} text-xs font-black`}>
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="min-w-[256px] bg-[#111] border-[#222] p-1"
          >
            <div className="px-3 py-2.5 border-b border-[#222] mb-1">
              <p className="text-sm font-semibold text-[#F5F5F0] truncate">{userName}</p>
              <p className="text-xs text-[#888] truncate">{userEmail}</p>
            </div>

            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-lg text-[#F5F5F0] cursor-pointer focus:bg-[#1a1a1a] focus:text-white"
              onClick={() => router.push('/settings/profile')}
            >
              <Settings className="h-4 w-4 text-[#888]" />
              Configurações
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-lg text-[#F5F5F0] cursor-pointer focus:bg-[#1a1a1a] focus:text-white"
              onClick={() => router.push('/settings/security')}
            >
              <ShieldCheck className="h-4 w-4 text-[#888]" />
              Segurança
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-[#222] my-1" />

            <DropdownMenuItem
              className="gap-2.5 px-3 py-2 rounded-lg text-red-400 cursor-pointer focus:bg-red-500/10 focus:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
