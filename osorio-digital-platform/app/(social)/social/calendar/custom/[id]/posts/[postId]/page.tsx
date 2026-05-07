import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, ExternalLink, Hash, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STATUS_CONFIG } from '@/components/calendar/calendar-grid'
import { CustomCommentBox, CustomStatusChanger } from './interactions'
import { cn } from '@/lib/utils'

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook',
  linkedin: 'LinkedIn', tiktok: 'TikTok', twitter: 'Twitter',
}

const COMMENT_TYPE_CONFIG = {
  comment:   { label: 'Comentário', classes: 'border-white/10 bg-white/5' },
  approval:  { label: 'Aprovação',  classes: 'border-green-500/30 bg-green-500/10' },
  rejection: { label: 'Reprovação', classes: 'border-red-500/30 bg-red-500/10' },
}

interface PageProps {
  params: Promise<{ id: string; postId: string }>
}

export default async function CustomPostDetailPage({ params }: PageProps) {
  const { id: calendarId, postId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
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

    const { data: post, error: postError } = await admin
      .from('custom_calendar_posts')
      .select('*')
      .eq('id', postId)
      .eq('calendar_id', calendarId)
      .maybeSingle()

    if (postError) {
      console.error('[CustomPostDetailPage] post error:', postError.message)
      notFound()
    }
    if (!post) notFound()

    const assignee = post.assigned_to
      ? (await admin.from('profiles').select('full_name, email').eq('id', post.assigned_to).maybeSingle()).data
      : null

    const { data: comments } = await admin
      .from('post_comments')
      .select('*, profiles(full_name)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    const statusCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft
    const platforms = (post.platform ?? '').split(',').filter(Boolean)
    const backHref  = `/social/calendar/custom/${calendarId}`

    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-[#888] hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {calendar.name}
            </Link>
            <CustomStatusChanger postId={post.id} currentStatus={post.status} />
          </div>

          <Card className="bg-[#111] border-[#222]">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h1 className="text-white font-semibold text-lg leading-tight">{post.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#888]">
                    {post.media_type && <span className="capitalize">{post.media_type}</span>}
                    {post.scheduled_at && isValid(parseISO(post.scheduled_at)) && (
                      <>
                        {post.media_type && <span>·</span>}
                        <span>
                          {format(parseISO(post.scheduled_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Plataformas */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {platforms.map(p => (
                      <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/60 border border-white/10">
                        {PLATFORM_LABEL[p] ?? p}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium shrink-0', statusCfg.chip)}>
                  {statusCfg.label}
                </span>
              </div>

              {/* Responsável */}
              {assignee && (
                <div className="flex items-center gap-2 text-sm text-[#888]">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>Responsável: <span className="text-white">{assignee.full_name || assignee.email}</span></span>
                </div>
              )}

              {post.media_url && (
                <a
                  href={post.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#EACE00] hover:text-[#EACE00]/80 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver arquivo de mídia
                </a>
              )}

              {/* Legenda */}
              {post.caption && (
                <div className="space-y-1.5">
                  <p className="text-xs text-[#888] font-medium uppercase tracking-wider">Legenda</p>
                  <p className="text-white text-sm whitespace-pre-wrap leading-relaxed bg-white/5 rounded-lg p-3">
                    {post.caption}
                  </p>
                </div>
              )}

              {/* Observações Internas */}
              {post.internal_notes && (
                <div className="space-y-1.5">
                  <p className="text-xs text-[#888] font-medium uppercase tracking-wider">Observações Internas</p>
                  <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3">
                    {post.internal_notes}
                  </p>
                </div>
              )}

              {/* Hashtags */}
              {post.hashtags && (post.hashtags as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(post.hashtags as string[]).map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-0.5 text-xs text-[#EACE00]/70 bg-[#EACE00]/10 px-2 py-0.5 rounded-full">
                      <Hash className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comentários */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">
              Histórico de Comentários
              {comments?.length ? (
                <span className="ml-2 text-xs font-normal text-[#888]">({comments.length})</span>
              ) : null}
            </h2>

            {!comments?.length ? (
              <p className="text-[#888] text-sm">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => {
                  const cfg = COMMENT_TYPE_CONFIG[c.type as keyof typeof COMMENT_TYPE_CONFIG]
                    ?? COMMENT_TYPE_CONFIG.comment
                  return (
                    <div key={c.id} className={cn('rounded-xl border p-4 space-y-1', cfg.classes)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(c.profiles as any)?.full_name ?? 'Usuário'}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                            {cfg.label}
                          </span>
                        </div>
                        <span className="text-xs text-[#888] shrink-0">
                          {c.created_at && isValid(parseISO(c.created_at))
                            ? format(parseISO(c.created_at), "dd/MM 'às' HH:mm")
                            : '—'}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{c.content}</p>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2">
              <CustomCommentBox postId={post.id} />
            </div>
          </div>

        </div>
      </AppLayout>
    )
  } catch (err) {
    console.error('[CustomPostDetailPage] unhandled exception:', err)
    notFound()
  }
}
