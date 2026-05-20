-- Etapa 13 — fix v25 (Instagram Graph API)
-- A Meta dividiu métricas IG em 2 grupos a partir da v25:
--   - Grupo A (diárias): reach, follower_count
--   - Grupo B (agregadas do período): views, profile_views, website_clicks,
--     profile_links_taps, total_interactions, likes, comments, shares, saves,
--     accounts_engaged
-- Daily continua em instagram_daily; agregadas vão em instagram_accounts como
-- snapshot do último sync.
-- Idempotente.

begin;

alter table public.instagram_accounts
  add column if not exists last_period_since              date,
  add column if not exists last_period_until              date,
  add column if not exists last_period_views              int default 0,
  add column if not exists last_period_profile_views      int default 0,
  add column if not exists last_period_website_clicks     int default 0,
  add column if not exists last_period_profile_links_taps int default 0,
  add column if not exists last_period_total_interactions int default 0,
  add column if not exists last_period_likes              int default 0,
  add column if not exists last_period_comments           int default 0,
  add column if not exists last_period_shares             int default 0,
  add column if not exists last_period_saves              int default 0,
  add column if not exists last_period_accounts_engaged   int default 0;

-- Limpa daily fake gerado pelos syncs anteriores (que devolviam 0 dias mas
-- podem ter linhas residuais com colunas legacy populadas zeradas).
delete from public.instagram_daily;

commit;
