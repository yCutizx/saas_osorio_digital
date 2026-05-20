-- Etapa 13 — Fix Reach Meta Ads + TZ
-- Adiciona colunas em clients pra guardar reach único do período (chamada
-- separada à API sem time_increment) e timezone da Ad Account (corrige drift
-- de ~3-4% vs Ads Manager).
-- Idempotente.

begin;

alter table public.clients
  add column if not exists meta_account_timezone        text,
  add column if not exists meta_last_period_reach       int,
  add column if not exists meta_last_period_frequency   numeric(8, 2),
  add column if not exists meta_last_period_impressions bigint,
  add column if not exists meta_last_period_since       date,
  add column if not exists meta_last_period_until       date;

commit;
