import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NewBoardForm } from './new-board-form'

const ALLOWED = ['admin', 'traffic_manager', 'social_media']

export default async function NewAdminBoardPage() {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/admin/kanban')

  const [{ data: clients }, { data: staff }] = await Promise.all([
    admin.from('clients').select('id, name').eq('active', true).order('name'),
    admin.from('profiles').select('id, full_name, email, role')
      .in('role', ['admin', 'traffic_manager', 'social_media'])
      .eq('active', true)
      .order('full_name'),
  ])

  return (
    <AppLayout pageTitle="Novo Quadro">
      <div className="max-w-2xl">
        <div className="mb-6">
          <p className="text-xs text-white/30 mb-1">
            <Link href="/admin/kanban" className="hover:text-white/60 transition-colors">Kanban</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/50">Novo Quadro</span>
          </p>
          <h1 className="text-xl font-bold text-white">Criar Novo Quadro</h1>
          <p className="text-white/40 text-sm mt-0.5">Configure o quadro e defina as colunas de trabalho</p>
        </div>
        <NewBoardForm clients={clients ?? []} staff={staff ?? []} currentUserId={user.id} />
      </div>
    </AppLayout>
  )
}
