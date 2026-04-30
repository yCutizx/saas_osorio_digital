-- ============================================================
-- OSORIO DIGITAL — Patch v2
-- Adiciona coluna plan à tabela clients
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basico'
    CHECK (plan IN ('basico', 'pro', 'premium'));

-- Atualiza registros existentes (se houver) para o valor padrão
UPDATE public.clients SET plan = 'basico' WHERE plan IS NULL;
