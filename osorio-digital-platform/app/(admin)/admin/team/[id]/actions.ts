'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return createAdminClient()
}

export async function toggleActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  if (!admin) return

  const memberId = formData.get('member_id') as string
  const active   = formData.get('active') === 'true'

  await admin.from('profiles').update({ active }).eq('id', memberId)
  revalidatePath('/admin/team')
  revalidatePath(`/admin/team/${memberId}`)
}

const TaskSchema = z.object({
  assigned_to: z.string().uuid(),
  title:       z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  client_id:   z.string().uuid().optional().or(z.literal('')),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
  priority:    z.enum(['baixa', 'media', 'alta'] as const),
})

export type TaskFormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
}

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Não autorizado.' }

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { message: 'Acesso negado.' }

  const result = TaskSchema.safeParse({
    assigned_to: formData.get('assigned_to'),
    title:       formData.get('title'),
    description: (formData.get('description') as string) || undefined,
    client_id:   (formData.get('client_id') as string) || '',
    due_date:    (formData.get('due_date') as string) || undefined,
    due_time:    (formData.get('due_time') as string) || undefined,
    priority:    formData.get('priority'),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as TaskFormState['errors'] }
  }

  const d     = result.data
  const admin = createAdminClient()

  const { error } = await admin.from('tasks').insert({
    assigned_to: d.assigned_to,
    created_by:  user.id,
    title:       d.title,
    description: d.description ?? null,
    client_id:   d.client_id || null,
    due_date:    d.due_date || null,
    due_time:    d.due_time || null,
    priority:    d.priority,
    status:      'pendente',
  })

  if (error) return { message: error.message }

  revalidatePath(`/admin/team/${d.assigned_to}`)
  return {}
}

export async function updateTaskStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  if (!admin) return

  const taskId = formData.get('task_id') as string
  const status = formData.get('status') as string

  await admin.from('tasks').update({ status }).eq('id', taskId)
  const assignedTo = formData.get('assigned_to') as string
  revalidatePath(`/admin/team/${assignedTo}`)
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  if (!admin) return

  const taskId     = formData.get('task_id') as string
  const assignedTo = formData.get('assigned_to') as string

  await admin.from('tasks').delete().eq('id', taskId)
  revalidatePath(`/admin/team/${assignedTo}`)
}
