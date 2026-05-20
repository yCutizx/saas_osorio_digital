-- Etapa 12 (fix) — Filtro de período preciso
-- Adiciona result_type em traffic_daily pra que computeStatsFromDaily +
-- buildResultSummaryFromDaily respeitem o filtro de data exato do dashboard
-- (até hoje o stats vinha de traffic_reports, que tem granularidade do período
-- da sync — 30 ou 90 dias — e ignorava filtros menores).
--
-- Idempotente.

begin;

alter table public.traffic_daily
  add column if not exists result_type text;

create index if not exists traffic_daily_result_type_idx
  on public.traffic_daily (result_type)
  where result_type is not null;

commit;
