'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { type UserRole } from '@/types'

interface ShellLayoutProps {
  children:    React.ReactNode
  role:        UserRole
  userName:    string
  userEmail:   string
  avatarUrl:   string | null
  pageTitle?:  string
  clientPlan?: string | null
}

export function ShellLayout({
  children, role, userName, userEmail, avatarUrl, pageTitle, clientPlan,
}: ShellLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden">

      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar role={role} userName={userName} userEmail={userEmail} clientPlan={clientPlan} />
      </div>

      {/* Mobile sidebar — overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 shrink-0">
            <Sidebar
              role={role}
              userName={userName}
              userEmail={userEmail}
              clientPlan={clientPlan}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          userName={userName}
          userRole={role}
          avatarUrl={avatarUrl}
          pageTitle={pageTitle}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
