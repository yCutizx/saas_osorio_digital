-- ============================================================
-- OSORIO DIGITAL PLATFORM — Patch v3
-- Phase 5: Insights & Portal do Cliente
-- Execute no SQL Editor do Supabase após patch v2
-- ============================================================

-- Permite que equipe crie insights (admin publica via toggle)
CREATE POLICY "Equipe cria insights" ON public.insights
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('traffic_manager', 'social_media')
    AND author_id = auth.uid()
  );

CREATE POLICY "Equipe atualiza próprios rascunhos de insight" ON public.insights
  FOR UPDATE USING (
    public.get_user_role() IN ('traffic_manager', 'social_media')
    AND author_id = auth.uid()
    AND published = FALSE
  );

-- Permite que equipe crie pesquisas de mercado
CREATE POLICY "Equipe cria pesquisas de mercado" ON public.market_research
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('traffic_manager', 'social_media')
    AND author_id = auth.uid()
  );

CREATE POLICY "Equipe atualiza próprias pesquisas" ON public.market_research
  FOR UPDATE USING (
    public.get_user_role() IN ('traffic_manager', 'social_media')
    AND author_id = auth.uid()
  );
