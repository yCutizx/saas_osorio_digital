import { FolderOpen } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientFilesManager, type ClientFile } from './client-files-manager'

export async function ClientFilesSection({ clientId }: { clientId: string }) {
  const admin = createAdminClient()

  // A página /admin/clients/[id]/edit já é admin-only (guard no topo), então este
  // fetch herda esse contexto. Se a feature for exposta a equipe no futuro,
  // adicionar checagem de acesso por cliente aqui.
  const { data: files } = await admin
    .from('client_files')
    .select('id, file_name, file_path, file_size, file_type, created_at, uploaded_by')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  return (
    <section className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-[#EACE00]" />
        <h3 className="text-sm font-semibold text-[#F5F5F0]">Arquivos do cliente</h3>
      </div>
      <p className="text-xs text-[#888]">
        Imagens e materiais do cliente. A equipe atribuída pode baixar. Máx. 50 MB por arquivo.
      </p>

      <ClientFilesManager clientId={clientId} initialFiles={(files ?? []) as ClientFile[]} />
    </section>
  )
}
