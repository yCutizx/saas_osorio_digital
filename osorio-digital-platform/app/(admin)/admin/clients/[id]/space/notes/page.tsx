import { ClientNotesSection } from '@/components/client-notes/client-notes-section'

export default function ClientSpaceNotesPage({ params }: { params: { id: string } }) {
  return <ClientNotesSection clientId={params.id} />
}

export const dynamic = 'force-dynamic'
