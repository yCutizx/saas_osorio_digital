import { ClientFilesSection } from '@/components/client-files/client-files-section'

export default function ClientSpaceFolderPage({
  params,
}: {
  params: { id: string; folderId: string }
}) {
  return <ClientFilesSection clientId={params.id} folderId={params.folderId} />
}

export const dynamic = 'force-dynamic'
