-- Etapa 14 — Posts IG individuais com snapshots diários
-- Tabelas: instagram_media (catálogo) + instagram_media_insights (snapshots)
-- + RLS policies (staff vê tudo, client só os próprios; INSERT/UPDATE só service_role)

begin;

-- =========================
-- 1) Catálogo de mídia
-- =========================

create table if not exists public.instagram_media (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  ig_user_id    text not null,
  media_id      text not null,
  media_type    text not null check (media_type in ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS')),
  caption       text,
  permalink     text,
  thumbnail_url text,
  media_url     text,
  posted_at     timestamptz not null,
  synced_at     timestamptz default now(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(client_id, media_id)
);

create index if not exists idx_instagram_media_client_posted
  on public.instagram_media (client_id, posted_at desc);

-- =========================
-- 2) Snapshots diários de insights
-- =========================

create table if not exists public.instagram_media_insights (
  id                              uuid primary key default gen_random_uuid(),
  media_id                        text not null,
  client_id                       uuid not null references public.clients(id) on delete cascade,
  views                           int default 0,
  reach                           int default 0,
  likes                           int default 0,
  comments                        int default 0,
  shares                          int default 0,
  saves                           int default 0,
  total_interactions              int default 0,
  ig_reels_avg_watch_time         int,
  ig_reels_video_view_total_time  bigint,
  snapshot_date                   date not null,
  snapshot_at                     timestamptz default now(),
  created_at                      timestamptz default now(),
  unique(media_id, snapshot_date)
);

create index if not exists idx_media_insights_media_date
  on public.instagram_media_insights (media_id, snapshot_date desc);

create index if not exists idx_media_insights_client_date
  on public.instagram_media_insights (client_id, snapshot_date desc);

-- =========================
-- 3) RLS
-- =========================

alter table public.instagram_media          enable row level security;
alter table public.instagram_media_insights enable row level security;

-- Staff (admin/traffic/social) vê tudo
drop policy if exists staff_select_media on public.instagram_media;
create policy staff_select_media on public.instagram_media
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'traffic_manager', 'social_media')
    )
  );

drop policy if exists staff_select_media_insights on public.instagram_media_insights;
create policy staff_select_media_insights on public.instagram_media_insights
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'traffic_manager', 'social_media')
    )
  );

-- Cliente vê só os próprios
drop policy if exists client_select_own_media on public.instagram_media;
create policy client_select_own_media on public.instagram_media
  for select to authenticated
  using (
    exists (
      select 1 from public.client_assignments
      where client_assignments.client_id = instagram_media.client_id
        and client_assignments.user_id   = auth.uid()
        and client_assignments.role      = 'client'
    )
  );

drop policy if exists client_select_own_media_insights on public.instagram_media_insights;
create policy client_select_own_media_insights on public.instagram_media_insights
  for select to authenticated
  using (
    exists (
      select 1 from public.client_assignments
      where client_assignments.client_id = instagram_media_insights.client_id
        and client_assignments.user_id   = auth.uid()
        and client_assignments.role      = 'client'
    )
  );

-- INSERT/UPDATE/DELETE: só service_role (sync server)
drop policy if exists service_all_media on public.instagram_media;
create policy service_all_media on public.instagram_media
  for all to public
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists service_all_media_insights on public.instagram_media_insights;
create policy service_all_media_insights on public.instagram_media_insights
  for all to public
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
