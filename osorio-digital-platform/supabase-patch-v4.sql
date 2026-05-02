-- ============================================================
-- OSORIO DIGITAL PLATFORM — Patch v4
-- Adiciona campos de contrato à tabela clients
-- Execute no SQL Editor do Supabase após patch v3
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contract_status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (contract_status IN ('ativo', 'pausado', 'encerrado')),
  ADD COLUMN IF NOT EXISTS monthly_value NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS renewal_date  DATE;

-- Atualiza registros existentes
UPDATE public.clients SET contract_status = 'ativo' WHERE contract_status IS NULL;
