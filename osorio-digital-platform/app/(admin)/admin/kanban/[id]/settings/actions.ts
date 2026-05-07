'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/lib/notifications'

export async function addBoardMemberAction(boardId: string, profileId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Sem permissão' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('kanban_board_members')
    .insert({ board_id: boardId, profile_id: profileId })

  if (error) {
    if (error.code === '23505') return { error: 'Membro já adicionado' }
    return { error: 'Erro ao adicionar membro' }
  }

  const { data: board } = await admin.from('kanban_boards').select('name').eq('id', boardId).single()
  await createNotification({
    userId: profileId,
    type: 'kanban_member_added',
    title: 'Adicionado a um quadro',
    message: `Você foi adicionado ao quadro "${board?.name ?? 'Kanban'}"`,
    link: `/admin/kanban/${boardId}`,
  })

  revalidatePath(`/admin/kanban/${boardId}/settings`)
  return {}
}

export async function removeBoardMemberAction(boardId: string, profileId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Sem permissão' }

  const admin = createAdminClient()

  await admin
    .from('kanban_board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('profile_id', profileId)

  revalidatePath(`/admin/kanban/${boardId}/settings`)
  return {}
}
