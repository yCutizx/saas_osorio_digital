-- Etapa 12 — Métricas por Objetivo de Campanha
-- Adiciona coluna optimization_goal em campaigns. Vem do AdSet via Meta API
-- (alguns campaigns expõem direto também), nulável porque nem toda campanha
-- expõe esse campo via /campaigns endpoint.
--
-- Idempotente (IF NOT EXISTS) — seguro rodar várias vezes.

begin;

alter table public.campaigns
  add column if not exists optimization_goal text;

create index if not exists campaigns_optimization_goal_idx
  on public.campaigns (optimization_goal)
  where optimization_goal is not null;

commit;
