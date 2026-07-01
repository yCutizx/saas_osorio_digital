import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientFilesManager, type ClientFile, type ClientFolder } from './client-files-manager'
import type { Crumb } from './files-breadcrumb'

const MAX_DEPTH = 50

export async function ClientFilesSection({
  clientId,
  folderId,
}: {
  clientId: string
  folderId: string | null
}) {
  const admin = createAdminClient()

  // Valida a pasta atual + monta o breadcrumb (raiz → pasta atual).
  const breadcrumb: Crumb[] = []
  if (folderId !== null) {
    const { data: current } = await admin
      .from('client_folders')
      .select('id, name, parent_id, client_id')
      .eq('id', folderId)
      .maybeSingle()
    // Pasta inexistente ou de outro cliente → 404 (não vaza existência).
    if (!current || current.client_id !== clientId) notFound()

    const chain: Crumb[] = []
    let node: { id: string; name: string; parent_id: string | null } | null = {
      id: current.id, name: current.name, parent_id: current.parent_id,
    }
    let depth = 0
    while (node && depth < MAX_DEPTH) {
      chain.unshift({ id: node.id, name: node.name })
      if (node.parent_id === null) break
      const parentRow = await admin
        .from('client_folders')
        .select('id, name, parent_id, client_id')
        .eq('id', node.parent_id)
        .maybeSingle()
      const parent = parentRow.data as
        | { id: string; name: string; parent_id: string | null; client_id: string }
        | null
      if (!parent || parent.client_id !== clientId) break
      node = { id: parent.id, name: parent.name, parent_id: parent.parent_id }
      depth++
    }
    breadcrumb.push(...chain)
  }

  // Subpastas e arquivos da pasta atual (folderId null = raiz).
  const foldersQ = folderId === null
    ? admin.from('client_folders').select('id, name, parent_id, created_at')
        .eq('client_id', clientId).is('parent_id', null).order('name')
    : admin.from('client_folders').select('id, name, parent_id, created_at')
        .eq('client_id', clientId).eq('parent_id', folderId).order('name')

  const filesQ = folderId === null
    ? admin.from('client_files')
        .select('id, file_name, file_path, file_size, file_type, folder_id, created_at, uploaded_by')
        .eq('client_id', clientId).is('folder_id', null).order('created_at', { ascending: false })
    : admin.from('client_files')
        .select('id, file_name, file_path, file_size, file_type, folder_id, created_at, uploaded_by')
        .eq('client_id', clientId).eq('folder_id', folderId).order('created_at', { ascending: false })

  const [{ data: folders }, { data: files }] = await Promise.all([foldersQ, filesQ])

  return (
    <ClientFilesManager
      // Remonta ao trocar de pasta: navegação pasta→pasta fica no mesmo segmento
      // [folderId], então sem key o React reusa a instância e o useState do
      // manager não re-semeia com os dados da nova pasta (conteúdo velho).
      key={folderId ?? 'root'}
      clientId={clientId}
      folderId={folderId}
      breadcrumb={breadcrumb}
      initialFolders={(folders ?? []) as ClientFolder[]}
      initialFiles={(files ?? []) as ClientFile[]}
    />
  )
}
