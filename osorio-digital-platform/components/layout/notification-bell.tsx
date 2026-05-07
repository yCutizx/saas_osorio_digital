'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Bell, Check, X, BarChart2, Kanban, FileText, Lightbulb, MessageSquare, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  getUnreadCount, getNotifications, markAsRead, markAllAsRead,
  type Notification,
} from '@/app/actions/notifications'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'agora mesmo'
  if (mins < 60)  return `há ${mins} min`
  if (hours < 24) return `há ${hours}h`
  if (days < 7)   return `há ${days} dia${days > 1 ? 's' : ''}`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function NotifIcon({ type }: { type: string }) {
  const cls = 'h-4 w-4 shrink-0'
  if (type.startsWith('kanban'))  return <Kanban    className={`${cls} text-blue-400`} />
  if (type.startsWith('traffic')) return <BarChart2  className={`${cls} text-[#EACE00]`} />
  if (type.startsWith('insight')) return <Lightbulb  className={`${cls} text-purple-400`} />
  if (type.startsWith('post'))    return <FileText   className={`${cls} text-green-400`} />
  if (type.startsWith('comment')) return <MessageSquare className={`${cls} text-cyan-400`} />
  if (type.startsWith('team'))    return <Users      className={`${cls} text-orange-400`} />
  return                                 <Bell       className={`${cls} text-white/40`} />
}

export function NotificationBell() {
  const [count, setCount]             = useState(0)
  const [open, setOpen]               = useState(false)
  const [notifications, setNotifs]    = useState<Notification[]>([])
  const [loaded, setLoaded]           = useState(false)
  const [, startT]                    = useTransition()
  const ref                           = useRef<HTMLDivElement>(null)
  const router                        = useRouter()

  // Poll unread count every 60s
  useEffect(() => {
    getUnreadCount().then(setCount)
    const interval = setInterval(() => getUnreadCount().then(setCount), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    setOpen((v) => !v)
    if (!loaded) {
      setLoaded(true)
      getNotifications().then(setNotifs)
    }
  }

  function handleClick(n: Notification) {
    if (!n.read) {
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
      setCount((c) => Math.max(0, c - 1))
      startT(() => { markAsRead(n.id) })
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  function handleMarkAll() {
    setNotifs((prev) => prev.map((x) => ({ ...x, read: true })))
    setCount(0)
    startT(() => { markAllAsRead() })
  }

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative text-[#888] hover:text-white transition-colors p-2 rounded-lg hover:bg-[#1a1a1a]"
        aria-label="Notificações"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-[#EACE00] text-black text-[9px] font-black flex items-center justify-center leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-[#111] border border-[#222] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notificações</span>
              {count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#EACE00] text-black font-bold">
                  {count}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-white/40 hover:text-[#EACE00] transition-colors flex items-center gap-1"
                >
                  <Check className="h-3 w-3" />
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-white/[0.04]">
            {!loaded ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#EACE00]/30 border-t-[#EACE00] rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="h-8 w-8 text-white/10" />
                <p className="text-xs text-white/30">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                    !n.read ? 'bg-[#EACE00]/[0.04]' : ''
                  }`}
                >
                  <div className="mt-0.5">
                    <NotifIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold leading-snug ${n.read ? 'text-white/60' : 'text-white'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#EACE00] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-white/25 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
