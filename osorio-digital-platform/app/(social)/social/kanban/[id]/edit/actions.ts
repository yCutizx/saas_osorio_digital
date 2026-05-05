'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type FormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  success?: boolean
}

const ALLOWED = ['admin', 'social_media']

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) return null
  return { supabase, admin: createAdminClient(), user, role: profile!.role }
}

const BoardSchema = z.object({
  board_id:     z.string().uuid(),
  name:         z.string().min(1, 'Nome obrigatório'),
  description:  z.string().optional(),
  color:        z.string().min(1),
  columns_json: z.string().min(1),
})

export async function updateBoardAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getCtx()
  if (!ctx) return { message: 'Não autorizado.' }

  const result = BoardSchema.safeParse({
    board_id:     formData.get('board_id'),
    name:         formData.get('name'),
    description:  (formData.get('description') as string) || undefined,
    color:        formData.get('color'),
    columns_json: formData.get('columns_json'),
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors as FormState['errors'] }

  let columns: unknown
  try { columns = JSON.parse(result.data.columns_json) } catch { return { message: 'Colunas inválidas.' } }

  const { error } = await ctx.admin.from('kanban_boards').update({
    name:        result.data.name,
    description: result.data.description ?? null,
    color:       result.data.color,
    columns,
  }).eq('id', result.data.board_id)

  if (error) return { message: error.message }

  revalidatePath(`/social/kanban/${result.data.board_id}`)
  revalidatePath('/social/kanban')
  return { success: true }
}

export async function deleteBoardAction(boardId: string): Promise<void> {
  const ctx = await getCtx()
  if (!ctx) return
  await ctx.admin.from('kanban_boards').delete().eq('id', boardId)
  revalidatePath('/social/kanban')
  redirect('/social/kanban')
}
