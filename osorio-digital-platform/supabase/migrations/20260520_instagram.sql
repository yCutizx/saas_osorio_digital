-- Etapa 13 — Instagram Insights
-- Tabelas para perfil-level insights da Instagram Graph API + RLS policies.
-- Idempotente.

begin;

-- =========================
-- 1. Tabelas
-- =========================

create table if not exists public.instagram_accounts (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  ig_user_id       text not null,
  ig_username      text,
  account_kind     text check (account_kind is null or account_kind in ('business', 'creator')),
  page_id          text,
  page_name        text,
  connected_at     timestamptz default now(),
  last_sync_at     timestamptz,
  last_sync_status text check (last_sync_status is null or last_sync_status in ('success', 'error', 'pending')),
  last_sync_error  text,
  is_primary       boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(client_id, ig_user_id)
);

create table if not exists public.instagram_daily (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  ig_user_id            text not null,
  date                  date not null,
  impressions           int default 0,
  views                 int default 0,
  reach                 int default 0,
  profile_views         int default 0,
  profile_links_taps    int default 0,
  website_clicks        int default 0,
  follower_count        int default 0,
  email_contacts        int default 0,
  phone_call_clicks     int default 0,
  text_message_clicks   int default 0,
  get_directions_clicks int default 0,
  created_at            timestamptz default now(),
  unique(client_id, ig_user_id, date)
);

create index if not exists instagram_accounts_sync_idx
  on public.instagram_accounts (last_sync_at);

create index if not exists instagram_daily_client_date_idx
  on public.instagram_daily (client_id, date);

-- =========================
-- 2. RLS Policies
-- =========================

alter table public.instagram_accounts enable row level security;
alter table public.instagram_daily   enable row level security;

drop policy if exists instagram_accounts_select on public.instagram_accounts;
create policy instagram_accounts_select on public.instagram_accounts
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'traffic_manager', 'social_media')
    )
    or
    exists (
      select 1 from public.client_assignments ca
      where ca.client_id = instagram_accounts.client_id
        and ca.user_id   = auth.uid()
        and ca.role      = 'client'
    )
  );

drop policy if exists instagram_daily_select on public.instagram_daily;
create policy instagram_daily_select on public.instagram_daily
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'traffic_manager', 'social_media')
    )
    or
    exists (
      select 1 from public.client_assignments ca
      where ca.client_id = instagram_daily.client_id
        and ca.user_id   = auth.uid()
        and ca.role      = 'client'
    )
  );

commit;
