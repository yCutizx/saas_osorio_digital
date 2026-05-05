-- ============================================================
-- OSORIO DIGITAL PLATFORM — Patch v7
-- Múltiplos quadros Kanban (kanban_boards)
-- Execute no SQL Editor do Supabase após patch v6
-- ============================================================

-- Tabela de quadros
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#EACE00',
  board_type  TEXT NOT NULL CHECK (board_type IN ('agency', 'content')),
  columns     JSONB NOT NULL DEFAULT '[]',
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;

-- Admin gerencia todos os quadros
CREATE POLICY "Admin all kanban_boards" ON public.kanban_boards
  FOR ALL USING (public.get_user_role() = 'admin');

-- Membros veem quadros da agência
CREATE POLICY "Members see agency boards" ON public.kanban_boards
  FOR SELECT USING (
    board_type = 'agency'
    AND public.get_user_role() IN ('traffic_manager', 'social_media')
  );

-- Social media gerencia quadros de conteúdo
CREATE POLICY "Social media manages content boards" ON public.kanban_boards
  FOR ALL USING (
    board_type = 'content'
    AND public.get_user_role() = 'social_media'
  );

-- Adiciona board_id nas kanban_cards (ON DELETE CASCADE: excluir o quadro exclui os cards)
ALTER TABLE public.kanban_cards
  ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.kanban_boards(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS kanban_cards_board_id_idx ON public.kanban_cards(board_id);
