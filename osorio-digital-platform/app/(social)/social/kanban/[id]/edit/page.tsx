import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { EditBoardForm } from './edit-board-form'

const ALLOWED = ['admin', 'social_media']

export default async function EditSocialBoardPage({ params }: { params: { id: string } }) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!ALLOWED.includes(profile?.role ?? '')) redirect('/social/kanban')

  const { data: board } = await adminSupabase
    .from('kanban_boards')
    .select('id, name, description, color, columns')
    .eq('id', params.id)
    .single()

  if (!board) notFound()

  return (
    <AppLayout pageTitle="Configurar Quadro">
      <div className="max-w-2xl">
        <div className="mb-6">
          <p className="text-xs text-white/30 mb-1">
            <Link href="/social/kanban" className="hover:text-white/60 transition-colors">Kanban</Link>
            <span className="mx-1.5">›</span>
            <Link href={`/social/kanban/${board.id}`} className="hover:text-white/60 transition-colors">{board.name}</Link>
            <span className="mx-1.5">›</span>
            <span className="text-white/50">Configurar</span>
          </p>
          <h1 className="text-xl font-bold text-white">Configurar Quadro</h1>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <EditBoardForm board={board as any} />
      </div>
    </AppLayout>
  )
}
