import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NewCustomPostForm } from './new-custom-post-form'

type StaffMember = { id: string; full_name: string | null; email: string }

interface PageProps {
  params:       Promise<{ id: string }>
  searchParams: { date?: string }
}

export default async function NewCustomPostPage({ params, searchParams }: PageProps) {
  const { id: calendarId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'social_media', 'traffic_manager'].includes(profile?.role ?? '')) {
    redirect('/social/dashboard')
  }

  const admin = createAdminClient()

  if (profile?.role !== 'admin') {
    const { data: membership } = await admin
      .from('custom_calendar_members')
      .select('user_id').eq('calendar_id', calendarId).eq('user_id', user.id).maybeSingle()
    if (!membership) redirect('/social/dashboard')
  }

  const { data: calendar } = await admin
    .from('custom_calendars').select('id, name').eq('id', calendarId).single()
  if (!calendar) notFound()

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
            href={`/social/calendar/custom/${calendarId}`}
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
              Calendário: <span className="text-white">{calendar.name}</span>
            </p>
          </div>
          <NewCustomPostForm
            calendarId={calendarId}
            staff={staff}
            defaultDate={searchParams.date}
          />
        </div>
      </div>
    </AppLayout>
  )
}
