import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect, notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SpaceTabs } from './tabs'

export default async function ClientSpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin/dashboard')

  const admin = createAdminClient()
  const { data: client } = await admin
    .from('clients').select('name').eq('id', params.id).single()
  if (!client) notFound()

  return (
    <AppLayout pageTitle={`Espaço · ${client.name}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-3">
          <Link
            href={`/admin/clients/${params.id}/edit`}
            className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o cliente
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{client.name}</h1>
            <p className="text-xs text-[#888] mt-0.5">Espaço do cliente</p>
          </div>
        </div>

        <SpaceTabs id={params.id} />

        {children}
      </div>
    </AppLayout>
  )
}

export const dynamic = 'force-dynamic'
