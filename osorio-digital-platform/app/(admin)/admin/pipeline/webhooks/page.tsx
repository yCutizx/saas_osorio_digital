import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import Link from 'next/link'
import { ArrowLeft, Webhook } from 'lucide-react'
import { WebhooksClient } from './webhooks-client'

export default async function AdminPipelineWebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/admin/dashboard')
  }

  const admin = createAdminClient()

  const { data: webhooks } = await admin
    .from('pipeline_webhooks')
    .select('id, name, url, events, active, secret_key, created_at')
    .order('created_at', { ascending: false })

  const { data: logsRaw } = await admin
    .from('pipeline_webhook_logs')
    .select('id, webhook_id, event, status, created_at, webhook:pipeline_webhooks(name)')
    .order('created_at', { ascending: false })
    .limit(20)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs = ((logsRaw ?? []) as any[]).map((l) => ({
    ...l,
    webhook: Array.isArray(l.webhook) ? (l.webhook[0] ?? null) : l.webhook,
  }))

  return (
    <AppLayout pageTitle="Webhooks">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Webhook className="h-5 w-5 text-[#EACE00]" />
              Webhooks
            </h1>
            <p className="text-white/40 text-sm mt-0.5">Integre o pipeline com sistemas externos</p>
          </div>
          <Link
            href="/admin/pipeline"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#333] text-white/50 text-sm hover:text-white hover:border-[#555] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Pipeline
          </Link>
        </div>

        <WebhooksClient
          webhooks={(webhooks ?? []) as Parameters<typeof WebhooksClient>[0]['webhooks']}
          logs={(logs ?? []) as Parameters<typeof WebhooksClient>[0]['logs']}
        />
      </div>
    </AppLayout>
  )
}
