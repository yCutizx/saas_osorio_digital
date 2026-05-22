import { BarChart2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { InstagramPostCard } from './instagram-post-card'
import type {
  InstagramMedia,
  InstagramMediaInsight,
  InstagramMediaType,
  InstagramMediaWithInsights,
} from '@/types'
import type {
  PostsFilterType, PostsFilterPeriod, PostsFilterSort,
} from './instagram-posts-filters'

interface Props {
  clientId: string
  type:     PostsFilterType
  period:   PostsFilterPeriod
  sort:     PostsFilterSort
}

const PERIOD_DAYS: Record<PostsFilterPeriod, number> = {
  '7d':  7,
  '30d': 30,
  '90d': 90,
}

function typesFor(filter: PostsFilterType): InstagramMediaType[] {
  if (filter === 'posts') return ['IMAGE', 'CAROUSEL_ALBUM']
  if (filter === 'reels') return ['REELS', 'VIDEO']
  return ['IMAGE', 'CAROUSEL_ALBUM', 'REELS', 'VIDEO']
}

export async function InstagramPostsGrid({ clientId, type, period, sort }: Props) {
  const admin = createAdminClient()

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - PERIOD_DAYS[period])
  const sinceStr = sinceDate.toISOString()

  const { data: rawMedia } = await admin
    .from('instagram_media')
    .select('id, client_id, ig_user_id, media_id, media_type, caption, permalink, thumbnail_url, media_url, posted_at, synced_at, created_at, updated_at')
    .eq('client_id', clientId)
    .in('media_type', typesFor(type))
    .gte('posted_at', sinceStr)
    .order('posted_at', { ascending: false })

  const media = (rawMedia ?? []) as InstagramMedia[]

  if (media.length === 0) {
    return (
      <div className="rounded-2xl bg-[#111] border border-white/5 p-10 text-center">
        <div className="w-16 h-16 bg-[#EACE00]/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <BarChart2 className="h-7 w-7 text-[#EACE00]/60" />
        </div>
        <h3 className="text-white font-semibold mb-1">Nenhum post no período</h3>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Mude o filtro de período ou tipo. Posts aparecem após o próximo sync IG.
        </p>
      </div>
    )
  }

  // Busca último snapshot de cada mídia (sem N+1: 1 query buscando todos)
  const mediaIds = media.map((m) => m.media_id)
  const { data: rawInsights } = await admin
    .from('instagram_media_insights')
    .select('id, media_id, client_id, views, reach, likes, comments, shares, saves, total_interactions, ig_reels_avg_watch_time, ig_reels_video_view_total_time, snapshot_date, snapshot_at, created_at')
    .eq('client_id', clientId)
    .in('media_id', mediaIds)
    .order('snapshot_date', { ascending: false })

  const insights = (rawInsights ?? []) as InstagramMediaInsight[]

  // Pega o snapshot MAIS RECENTE por media_id
  const latestByMedia = new Map<string, InstagramMediaInsight>()
  for (const ins of insights) {
    if (!latestByMedia.has(ins.media_id)) latestByMedia.set(ins.media_id, ins)
  }

  const posts: InstagramMediaWithInsights[] = media.map((m) => ({
    ...m,
    latest_insight: latestByMedia.get(m.media_id) ?? null,
  }))

  // Ordenação
  const sorted = [...posts].sort((a, b) => {
    if (sort === 'views') {
      return (b.latest_insight?.views ?? 0) - (a.latest_insight?.views ?? 0)
    }
    if (sort === 'engagement') {
      return (b.latest_insight?.total_interactions ?? 0) - (a.latest_insight?.total_interactions ?? 0)
    }
    return b.posted_at.localeCompare(a.posted_at)
  })

  // Top post = maior total_interactions (independente do sort vigente)
  const topMediaId = posts.reduce<{ id: string | null; score: number }>(
    (best, p) => {
      const score = p.latest_insight?.total_interactions ?? 0
      return score > best.score ? { id: p.media_id, score } : best
    },
    { id: null, score: 0 },
  ).id

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((post) => (
        <InstagramPostCard
          key={post.id}
          clientId={clientId}
          post={post}
          isTop={post.media_id === topMediaId}
        />
      ))}
    </div>
  )
}
