-- Etapa 13 — fix gráfico de seguidores
-- A API v25 retorna `follower_count` daily como DELTA (novos seguidores no dia),
-- não saldo total. Gravamos o delta em instagram_daily.follower_count e o saldo
-- atual aqui em instagram_accounts.followers_count_snapshot. O gráfico calcula
-- saldo histórico revertendo os deltas a partir do snapshot.
-- Idempotente.

begin;

alter table public.instagram_accounts
  add column if not exists followers_count_snapshot int default 0;

commit;
