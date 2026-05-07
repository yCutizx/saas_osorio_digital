import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NewPostForm } from './new-post-form'

type StaffMember = { id: string; full_name: string | null; email: string }

async function getAccessibleClients() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (!['admin', 'social_media'].includes(profile?.role ?? '')) {
    redirect('/social/dashboard')
  }

  let query = supabase.from('clients').select('id, name').eq('active', true).order('name')

  if (profile?.role !== 'admin') {
    const { data: assignments } = await supabase
      .from('client_assignments').select('client_id')
      .eq('user_id', user.id).eq('role', 'social_media')
    const ids = (assignments ?? []).map((a) => a.client_id)
    if (ids.length === 0) return []
    query = query.in('id', ids)
  }

  const { data } = await query
  return data ?? []
}

interface PageProps {
  searchParams: { date?: string; client?: string }
}

export default async function NewPostPage({ searchParams }: PageProps) {
  const clients = await getAccessibleClients()

  const admin = createAdminClient()
  const { data: staffData } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .neq('role', 'client')
    .eq('active', true)
    .order('full_name')
  const staff = (staffData ?? []) as StaffMember[]

  return (
    <AppLayout pageTitle="Novo Post">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/social/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Calendário
          </Link>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Criar Post</h2>
            <p className="text-[#888] text-sm mt-1">
              Salve como rascunho ou envie diretamente para aprovação do cliente.
            </p>
          </div>

          {clients.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#888] text-sm mb-4">
                Você não tem clientes atribuídos para criar posts.
              </p>
              <Link href="/admin/clients" className="text-[#EACE00] text-sm hover:text-[#EACE00]/80 transition-colors">
                Ver clientes →
              </Link>
            </div>
          ) : (
            <NewPostForm clients={clients} staff={staff} defaultDate={searchParams.date} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
