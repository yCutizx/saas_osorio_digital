-- ============================================================
-- OSORIO DIGITAL PLATFORM — Patch v6
-- Tabela kanban_cards para os dois boards
-- Execute no SQL Editor do Supabase após patch v5
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_type  TEXT NOT NULL CHECK (board_type IN ('agency', 'content')),
  column_id   TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date    DATE,
  due_time    TIME,
  priority    TEXT NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa', 'media', 'alta')),
  tags        TEXT[],
  format      TEXT CHECK (format IN ('reels', 'feed', 'stories', 'carrossel')),
  platform    TEXT CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin')),
  position    BIGINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kanban_cards_board_column_idx
  ON public.kanban_cards(board_type, column_id, position);

CREATE TRIGGER kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

-- Admin vê e gerencia tudo
CREATE POLICY "Admin gerencia kanban" ON public.kanban_cards
  FOR ALL USING (public.get_user_role() = 'admin');

-- Funcionário vê cards do board da agência atribuídos a ele
CREATE POLICY "Membro vê próprios cards da agência" ON public.kanban_cards
  FOR SELECT USING (
    board_type = 'agency'
    AND assigned_to = auth.uid()
    AND public.get_user_role() IN ('traffic_manager', 'social_media')
  );

-- Social media gerencia cards do board de conteúdo
CREATE POLICY "Social media gerencia board de conteúdo" ON public.kanban_cards
  FOR ALL USING (
    board_type = 'content'
    AND public.get_user_role() = 'social_media'
  );

-- Funcionário pode mover os próprios cards da agência
CREATE POLICY "Membro atualiza próprios cards" ON public.kanban_cards
  FOR UPDATE USING (
    board_type = 'agency'
    AND assigned_to = auth.uid()
    AND public.get_user_role() IN ('traffic_manager', 'social_media')
  );
