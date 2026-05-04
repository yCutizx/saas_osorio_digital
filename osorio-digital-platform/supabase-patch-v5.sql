-- ============================================================
-- OSORIO DIGITAL PLATFORM — Patch v5
-- Adiciona active em profiles + tabela tasks
-- Execute no SQL Editor do Supabase após patch v4
-- ============================================================

-- 1. Campo active na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Tabela de tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date    DATE,
  due_time    TIME,
  priority    TEXT NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta')),
  status      TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Admin gerencia tudo
CREATE POLICY "Admin gerencia tarefas" ON public.tasks
  FOR ALL USING (public.get_user_role() = 'admin');

-- Membro vê e atualiza as próprias tarefas
CREATE POLICY "Membro vê próprias tarefas" ON public.tasks
  FOR SELECT USING (assigned_to = auth.uid());

CREATE POLICY "Membro atualiza status das próprias tarefas" ON public.tasks
  FOR UPDATE USING (assigned_to = auth.uid());
