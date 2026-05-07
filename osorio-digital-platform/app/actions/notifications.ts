'use server'

import { createClient } from '@/lib/supabase/server'

export type Notification = {
  id:         string
  type:       string
  title:      string
  message:    string
  link:       string | null
  read:       boolean
  created_at: string
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
  return count ?? 0
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, message, link, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(25)
  return (data ?? []) as Notification[]
}

export async function markAsRead(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id)
}

export async function markAllAsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
}
