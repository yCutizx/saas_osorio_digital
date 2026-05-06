-- ============================================================
-- OSORIO DIGITAL PLATFORM — Patch v8
-- Card detail: checklists, labels, attachments, comments, board members
-- Execute no SQL Editor do Supabase após patch v7
-- AÇÃO MANUAL: criar bucket "kanban-attachments" em Storage > Buckets (público)
-- ============================================================

-- Arquivamento de cards
ALTER TABLE public.kanban_cards
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Checklists por card
CREATE TABLE IF NOT EXISTS public.kanban_checklists (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Checklist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kanban_checklist_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES public.kanban_checklists(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  checked      BOOLEAN NOT NULL DEFAULT FALSE,
  position     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Etiquetas por quadro
CREATE TABLE IF NOT EXISTS public.kanban_labels (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name     TEXT NOT NULL DEFAULT '',
  color    TEXT NOT NULL DEFAULT '#3b82f6'
);

-- Etiquetas por card (junção)
CREATE TABLE IF NOT EXISTS public.kanban_card_labels (
  card_id  UUID NOT NULL REFERENCES public.kanban_cards(id)   ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.kanban_labels(id)  ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

-- Anexos por card
CREATE TABLE IF NOT EXISTS public.kanban_attachments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id     UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários por card
CREATE TABLE IF NOT EXISTS public.kanban_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID NOT NULL REFERENCES public.kanban_cards(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Membros de quadro (compartilhamento com clientes)
CREATE TABLE IF NOT EXISTS public.kanban_board_members (
  board_id   UUID NOT NULL REFERENCES public.kanban_boards(id)  ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  PRIMARY KEY (board_id, profile_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS kc_checklist_card_idx     ON public.kanban_checklists(card_id);
CREATE INDEX IF NOT EXISTS kc_items_checklist_idx    ON public.kanban_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS kl_board_idx              ON public.kanban_labels(board_id);
CREATE INDEX IF NOT EXISTS kcl_card_idx              ON public.kanban_card_labels(card_id);
CREATE INDEX IF NOT EXISTS ka_card_idx               ON public.kanban_attachments(card_id);
CREATE INDEX IF NOT EXISTS kcom_card_idx             ON public.kanban_comments(card_id);
CREATE INDEX IF NOT EXISTS kbm_board_idx             ON public.kanban_board_members(board_id);
CREATE INDEX IF NOT EXISTS kbm_profile_idx           ON public.kanban_board_members(profile_id);

-- RLS
ALTER TABLE public.kanban_checklists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_checklist_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_labels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_card_labels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_board_members    ENABLE ROW LEVEL SECURITY;

-- Políticas: equipe interna gerencia tudo (via adminClient no app)
DO $$
BEGIN
  -- checklists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_checklists' AND policyname='team_checklists') THEN
    CREATE POLICY "team_checklists" ON public.kanban_checklists FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  -- checklist items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_checklist_items' AND policyname='team_checklist_items') THEN
    CREATE POLICY "team_checklist_items" ON public.kanban_checklist_items FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  -- labels
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_labels' AND policyname='team_labels') THEN
    CREATE POLICY "team_labels" ON public.kanban_labels FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  -- card labels
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_card_labels' AND policyname='team_card_labels') THEN
    CREATE POLICY "team_card_labels" ON public.kanban_card_labels FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  -- attachments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_attachments' AND policyname='team_attachments') THEN
    CREATE POLICY "team_attachments" ON public.kanban_attachments FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  -- comments: equipe + cliente (leitura)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_comments' AND policyname='team_comments') THEN
    CREATE POLICY "team_comments" ON public.kanban_comments FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_comments' AND policyname='client_comments') THEN
    CREATE POLICY "client_comments" ON public.kanban_comments FOR ALL
      USING (public.get_user_role() = 'client');
  END IF;
  -- board members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_board_members' AND policyname='team_board_members') THEN
    CREATE POLICY "team_board_members" ON public.kanban_board_members FOR ALL
      USING (public.get_user_role() IN ('admin','traffic_manager','social_media'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_board_members' AND policyname='client_board_members') THEN
    CREATE POLICY "client_board_members" ON public.kanban_board_members FOR SELECT
      USING (public.get_user_role() = 'client');
  END IF;
END$$;
