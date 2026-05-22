-- Etapa 15 — Módulo Financeiro (Push 1: backend)
-- 3 tabelas: financial_contracts, financial_invoices, financial_transactions
-- + view financial_invoices_live (effective_status + days_overdue)
-- + RLS policies (admin all, client só próprias invoices)
--
-- ⚠️ Rafael: copia este SQL inteiro pro Supabase Studio → SQL Editor → Run.
-- Após rodar, esse arquivo pode ser deletado (vive aqui só pra organização).

begin;

-- =========================================================================
-- 1) CONTRATOS — vigência ativa por cliente, valor mensal, dia de vencimento
-- =========================================================================
create table if not exists public.financial_contracts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  monthly_value   numeric(12, 2) not null check (monthly_value >= 0),
  billing_day     int not null check (billing_day between 1 and 28),
  start_date      date not null,
  end_date        date,
  status          text not null default 'active' check (status in ('active', 'paused', 'ended')),
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create unique index if not exists financial_contracts_one_active_per_client
  on public.financial_contracts (client_id)
  where status = 'active';

create index if not exists financial_contracts_client_idx
  on public.financial_contracts (client_id, status);

-- =========================================================================
-- 2) FATURAS (com discount + paid_by)
-- =========================================================================
create table if not exists public.financial_invoices (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  contract_id     uuid references public.financial_contracts(id) on delete set null,
  reference_month date not null,
  due_date        date not null,
  amount          numeric(12, 2) not null check (amount >= 0),
  discount        numeric(12, 2) not null default 0 check (discount >= 0),
  status          text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'canceled')),
  paid_at         timestamptz,
  paid_amount     numeric(12, 2),
  paid_by         uuid references public.profiles(id),
  payment_method  text,
  notes           text,
  seller_id       uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(client_id, reference_month)
);

create index if not exists financial_invoices_status_due_idx
  on public.financial_invoices (status, due_date);

create index if not exists financial_invoices_client_ref_idx
  on public.financial_invoices (client_id, reference_month desc);

create index if not exists financial_invoices_seller_idx
  on public.financial_invoices (seller_id)
  where seller_id is not null;

-- =========================================================================
-- 3) TRANSAÇÕES — lançamentos extras (não vinculados a fatura mensal)
-- =========================================================================
create table if not exists public.financial_transactions (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.clients(id) on delete set null,
  type             text not null check (type in ('income', 'expense', 'refund', 'adjustment')),
  amount           numeric(12, 2) not null,
  description      text not null,
  transaction_date date not null,
  category         text,
  invoice_id       uuid references public.financial_invoices(id) on delete set null,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz default now()
);

create index if not exists financial_transactions_client_date_idx
  on public.financial_transactions (client_id, transaction_date desc);

create index if not exists financial_transactions_date_idx
  on public.financial_transactions (transaction_date desc);

-- =========================================================================
-- 4) Função + view live (effective_status + days_overdue)
-- =========================================================================
create or replace function public.compute_invoice_status(
  current_status text,
  due_date date,
  paid_at timestamptz
) returns text language sql immutable as $$
  select case
    when current_status in ('paid', 'canceled') then current_status
    when paid_at is not null then 'paid'
    when due_date < current_date then 'overdue'
    else 'pending'
  end
$$;

create or replace view public.financial_invoices_live as
  select
    i.*,
    public.compute_invoice_status(i.status, i.due_date, i.paid_at) as effective_status,
    greatest(0, current_date - i.due_date)::int as days_overdue
  from public.financial_invoices i;

-- =========================================================================
-- 5) RLS — admin all; client só próprias invoices; service_role bypass
-- =========================================================================
alter table public.financial_contracts    enable row level security;
alter table public.financial_invoices     enable row level security;
alter table public.financial_transactions enable row level security;

drop policy if exists admin_all_contracts on public.financial_contracts;
create policy admin_all_contracts on public.financial_contracts
  for all to authenticated
  using     (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists admin_all_invoices on public.financial_invoices;
create policy admin_all_invoices on public.financial_invoices
  for all to authenticated
  using     (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists admin_all_transactions on public.financial_transactions;
create policy admin_all_transactions on public.financial_transactions
  for all to authenticated
  using     (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists client_select_own_invoices on public.financial_invoices;
create policy client_select_own_invoices on public.financial_invoices
  for select to authenticated
  using (
    exists (
      select 1 from public.client_assignments ca
      where ca.client_id = financial_invoices.client_id
        and ca.user_id   = auth.uid()
        and ca.role      = 'client'
    )
  );

drop policy if exists service_all_contracts on public.financial_contracts;
create policy service_all_contracts on public.financial_contracts
  for all to public using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_all_invoices on public.financial_invoices;
create policy service_all_invoices on public.financial_invoices
  for all to public using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists service_all_transactions on public.financial_transactions;
create policy service_all_transactions on public.financial_transactions
  for all to public using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

commit;
