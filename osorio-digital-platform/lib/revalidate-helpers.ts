import { revalidatePath } from 'next/cache'

/**
 * Invalida cache do mesmo board em todos os grupos (admin/social/client).
 * Use sempre que uma mudança em kanban_cards/comments/attachments/checklists/etc
 * deva refletir em mais de um grupo.
 */
export function revalidateKanbanBoardPaths(boardId: string) {
  revalidatePath(`/admin/kanban/${boardId}`)
  revalidatePath(`/social/kanban/${boardId}`)
  revalidatePath(`/client/kanban/${boardId}`)
}

/**
 * Invalida cache do pipeline em todos os grupos.
 */
export function revalidatePipelinePaths(pipelineId: string) {
  revalidatePath(`/admin/pipeline/${pipelineId}`)
  revalidatePath(`/social/pipeline/${pipelineId}`)
  revalidatePath(`/traffic/pipeline/${pipelineId}`)
  revalidatePath(`/admin/pipeline/${pipelineId}/settings`)
  revalidatePath(`/social/pipeline/${pipelineId}/settings`)
  revalidatePath(`/traffic/pipeline/${pipelineId}/settings`)
}

/**
 * Invalida cache do calendário editorial em todos os grupos.
 */
export function revalidateCalendarPaths() {
  revalidatePath('/social/dashboard')
  revalidatePath('/social/calendar')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/calendar')
  revalidatePath('/client/calendar')
  revalidatePath('/client/home')
}
