-- Etapa 13 — fix de alcance único IG
-- A soma de reach diário inflava (mesma pessoa contava 1x por dia). API v25
-- expõe reach único do período via metric_type=total_value — armazenamos esse
-- valor em snapshot separado pra o dashboard usar (em vez de somar daily).
-- Idempotente.

begin;

alter table public.instagram_accounts
  add column if not exists last_period_reach_unique int default 0;

commit;
