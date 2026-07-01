import { ClientFilesSection } from '@/components/client-files/client-files-section'

export default function ClientSpaceFilesPage({ params }: { params: { id: string } }) {
  return <ClientFilesSection clientId={params.id} folderId={null} />
}

export const dynamic = 'force-dynamic'
