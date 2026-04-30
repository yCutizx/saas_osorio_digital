-- ============================================================
-- OSORIO DIGITAL PLATFORM — Schema do Banco de Dados
-- Execute este arquivo no SQL Editor do painel do Supabase:
-- https://supabase.com/dashboard > seu projeto > SQL Editor
-- ============================================================

-- Habilitar extensão UUID (já vem ativa no Supabase, mas garantimos)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: profiles
-- Perfis dos usuários com papéis (roles)
-- Criada automaticamente ao registrar usuário no auth
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'client'
                CHECK (role IN ('admin', 'traffic_manager', 'social_media', 'client')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criar perfil automaticamente após cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABELA: clients
-- Clientes da agência
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  logo_url        TEXT,
  industry        TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABELA: client_assignments
-- Relacionamento: qual usuário atende qual cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('traffic_manager', 'social_media', 'client')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, user_id)
);

-- ============================================================
-- TABELA: campaigns
-- Campanhas de tráfego pago por cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  platform         TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'linkedin', 'other')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),
  objective        TEXT,
  budget_monthly   NUMERIC(10, 2),
  start_date       DATE,
  end_date         DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABELA: traffic_reports
-- Relatórios de métricas de tráfego por período
-- ============================================================
CREATE TABLE IF NOT EXISTS public.traffic_reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id    UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_start   DATE NOT NULL,
  period_end     DATE NOT NULL,
  impressions    INTEGER NOT NULL DEFAULT 0,
  clicks         INTEGER NOT NULL DEFAULT 0,
  conversions    INTEGER NOT NULL DEFAULT 0,
  spend          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  revenue        NUMERIC(10, 2),
  cpm            NUMERIC(10, 4),
  cpc            NUMERIC(10, 4),
  ctr            NUMERIC(6, 4),
  roas           NUMERIC(8, 4),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: traffic_feedbacks
-- Feedbacks do gestor de tráfego para o cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.traffic_feedbacks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES public.profiles(id),
  report_id     UUID REFERENCES public.traffic_reports(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER traffic_feedbacks_updated_at
  BEFORE UPDATE ON public.traffic_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABELA: content_posts
-- Posts do calendário editorial
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_posts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id      UUID NOT NULL REFERENCES public.profiles(id),
  title          TEXT NOT NULL,
  caption        TEXT,
  media_url      TEXT,
  media_type     TEXT CHECK (media_type IN ('image', 'video', 'carousel', 'reel', 'story')),
  platform       TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter')),
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  scheduled_at   TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  hashtags       TEXT[],
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER content_posts_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABELA: post_comments
-- Comentários e aprovações em posts (pelo cliente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id),
  content     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'comment' CHECK (type IN ('comment', 'approval', 'rejection')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: insights
-- Insights e conteúdos publicados pela equipe para os clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insights (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    UUID NOT NULL REFERENCES public.profiles(id),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  cover_url    TEXT,
  tags         TEXT[],
  published    BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER insights_updated_at
  BEFORE UPDATE ON public.insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TABELA: market_research
-- Pesquisas de mercado em PDF
-- ============================================================
CREATE TABLE IF NOT EXISTS public.market_research (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id),
  title        TEXT NOT NULL,
  description  TEXT,
  file_url     TEXT NOT NULL,
  file_size    INTEGER,
  tags         TEXT[],
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER market_research_updated_at
  BEFORE UPDATE ON public.market_research
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada usuário só vê o que tem permissão
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_research  ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna o role do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função auxiliar: verifica se usuário tem acesso a um cliente
CREATE OR REPLACE FUNCTION public.user_has_client_access(p_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_assignments
    WHERE client_id = p_client_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- POLICIES: profiles ----
CREATE POLICY "Usuário vê próprio perfil" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin vê todos os perfis" ON public.profiles
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "Usuário edita próprio perfil" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin gerencia todos os perfis" ON public.profiles
  FOR ALL USING (public.get_user_role() = 'admin');

-- ---- POLICIES: clients ----
CREATE POLICY "Admin vê todos os clientes" ON public.clients
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Usuário vê clientes atribuídos" ON public.clients
  FOR SELECT USING (public.user_has_client_access(id));

-- ---- POLICIES: client_assignments ----
CREATE POLICY "Admin gerencia atribuições" ON public.client_assignments
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Usuário vê próprias atribuições" ON public.client_assignments
  FOR SELECT USING (user_id = auth.uid());

-- ---- POLICIES: campaigns ----
CREATE POLICY "Admin vê todas as campanhas" ON public.campaigns
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Gestor/Social vê campanhas de clientes atribuídos" ON public.campaigns
  FOR SELECT USING (
    public.get_user_role() IN ('traffic_manager', 'social_media')
    AND public.user_has_client_access(client_id)
  );

CREATE POLICY "Cliente vê próprias campanhas" ON public.campaigns
  FOR SELECT USING (
    public.get_user_role() = 'client'
    AND public.user_has_client_access(client_id)
  );

-- ---- POLICIES: traffic_reports ----
CREATE POLICY "Admin vê todos os relatórios" ON public.traffic_reports
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Gestor de tráfego vê relatórios de clientes atribuídos" ON public.traffic_reports
  FOR SELECT USING (
    public.get_user_role() = 'traffic_manager'
    AND public.user_has_client_access(client_id)
  );

CREATE POLICY "Cliente vê próprios relatórios" ON public.traffic_reports
  FOR SELECT USING (
    public.get_user_role() = 'client'
    AND public.user_has_client_access(client_id)
  );

-- ---- POLICIES: traffic_feedbacks ----
CREATE POLICY "Admin vê todos os feedbacks" ON public.traffic_feedbacks
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Gestor gerencia feedbacks de clientes atribuídos" ON public.traffic_feedbacks
  FOR ALL USING (
    public.get_user_role() = 'traffic_manager'
    AND public.user_has_client_access(client_id)
  );

CREATE POLICY "Cliente vê feedbacks do próprio negócio" ON public.traffic_feedbacks
  FOR SELECT USING (
    public.get_user_role() = 'client'
    AND public.user_has_client_access(client_id)
  );

-- ---- POLICIES: content_posts ----
CREATE POLICY "Admin vê todos os posts" ON public.content_posts
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Social media gerencia posts de clientes atribuídos" ON public.content_posts
  FOR ALL USING (
    public.get_user_role() = 'social_media'
    AND public.user_has_client_access(client_id)
  );

CREATE POLICY "Gestor vê posts de clientes atribuídos" ON public.content_posts
  FOR SELECT USING (
    public.get_user_role() = 'traffic_manager'
    AND public.user_has_client_access(client_id)
  );

CREATE POLICY "Cliente vê posts do próprio negócio" ON public.content_posts
  FOR SELECT USING (
    public.get_user_role() = 'client'
    AND public.user_has_client_access(client_id)
  );

-- ---- POLICIES: post_comments ----
CREATE POLICY "Admin vê todos os comentários" ON public.post_comments
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Usuário vê comentários de posts que tem acesso" ON public.post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.content_posts cp
      WHERE cp.id = post_id
      AND public.user_has_client_access(cp.client_id)
    )
  );

CREATE POLICY "Usuário comenta em posts que tem acesso" ON public.post_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.content_posts cp
      WHERE cp.id = post_id
      AND public.user_has_client_access(cp.client_id)
    )
  );

-- ---- POLICIES: insights ----
CREATE POLICY "Admin gerencia insights" ON public.insights
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Equipe vê e cria insights" ON public.insights
  FOR SELECT USING (
    public.get_user_role() IN ('traffic_manager', 'social_media')
    OR (public.get_user_role() = 'client' AND published = TRUE)
  );

-- ---- POLICIES: market_research ----
CREATE POLICY "Admin gerencia pesquisas" ON public.market_research
  FOR ALL USING (public.get_user_role() = 'admin');

CREATE POLICY "Equipe vê pesquisas" ON public.market_research
  FOR SELECT USING (
    public.get_user_role() IN ('traffic_manager', 'social_media')
  );

CREATE POLICY "Cliente vê pesquisas do próprio negócio" ON public.market_research
  FOR SELECT USING (
    public.get_user_role() = 'client'
    AND (client_id IS NULL OR public.user_has_client_access(client_id))
  );

-- ============================================================
-- DADOS INICIAIS: usuário admin
-- Após rodar este SQL, crie seu usuário admin no painel do
-- Supabase em: Authentication > Users > Add user
-- Depois atualize o role manualmente:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';
-- ============================================================
