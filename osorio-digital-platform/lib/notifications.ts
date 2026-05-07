import { createAdminClient } from './supabase/admin'

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: {
  userId: string
  type:   string
  title:  string
  message: string
  link?:  string
}) {
  try {
    const admin = createAdminClient()
    await admin.from('notifications').insert({ user_id: userId, type, title, message, link: link ?? null })
  } catch {
    // Notifications are fire-and-forget — never throw
  }
}

export async function createNotificationForMany(userIds: string[], payload: {
  type:    string
  title:   string
  message: string
  link?:   string
}) {
  if (!userIds.length) return
  try {
    const admin = createAdminClient()
    await admin.from('notifications').insert(
      userIds.map((userId) => ({ user_id: userId, ...payload, link: payload.link ?? null }))
    )
  } catch {
    // fire-and-forget
  }
}
