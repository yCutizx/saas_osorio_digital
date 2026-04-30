-- ============================================================
-- OSORIO DIGITAL — Dados de exemplo para testar os gráficos
--
-- PRÉ-REQUISITO: Crie pelo menos 1 cliente pela plataforma
-- antes de rodar este script. Ele usa o primeiro cliente ativo.
--
-- Execute no SQL Editor do Supabase.
-- ============================================================

DO $$
DECLARE
  v_client_id   UUID;
  v_camp1_id    UUID := uuid_generate_v4();
  v_camp2_id    UUID := uuid_generate_v4();
  v_camp3_id    UUID := uuid_generate_v4();
BEGIN
  -- Pegar o primeiro cliente ativo cadastrado
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE active = true
  ORDER BY created_at
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Nenhum cliente ativo encontrado. Crie um cliente primeiro e rode novamente.';
    RETURN;
  END IF;

  RAISE NOTICE 'Criando dados para o cliente: %', v_client_id;

  -- --------------------------------------------------------
  -- Campanhas
  -- --------------------------------------------------------
  INSERT INTO public.campaigns (id, client_id, name, platform, status, budget_monthly, objective)
  VALUES
    (v_camp1_id, v_client_id, 'Meta Ads – Awareness',    'meta',    'active', 3000, 'Alcance e reconhecimento de marca'),
    (v_camp2_id, v_client_id, 'Google Ads – Conversão',  'google',  'active', 2000, 'Geração de leads e vendas'),
    (v_camp3_id, v_client_id, 'Meta Ads – Conversão',    'meta',    'active', 1500, 'Vendas diretas')
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------
  -- Relatórios diários — Meta Ads Awareness (30 dias)
  -- Perfil: alto alcance, CTR moderado, ROAS ~2.5x
  -- --------------------------------------------------------
  INSERT INTO public.traffic_reports
    (campaign_id, client_id, period_start, period_end,
     impressions, clicks, conversions, spend, revenue)
  SELECT
    v_camp1_id,
    v_client_id,
    (CURRENT_DATE - (n || ' days')::INTERVAL)::DATE,
    (CURRENT_DATE - (n || ' days')::INTERVAL)::DATE,
    (3000 + (random() * 2500)::INTEGER),
    (90  + (random() * 80)::INTEGER),
    (4   + (random() * 8)::INTEGER),
    ROUND((85 + random() * 40)::NUMERIC, 2),
    ROUND((200 + random() * 150)::NUMERIC, 2)
  FROM generate_series(0, 29) AS n
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------
  -- Relatórios diários — Google Ads Conversão (30 dias)
  -- Perfil: menor volume, CTR alto, ROAS ~3.2x
  -- --------------------------------------------------------
  INSERT INTO public.traffic_reports
    (campaign_id, client_id, period_start, period_end,
     impressions, clicks, conversions, spend, revenue)
  SELECT
    v_camp2_id,
    v_client_id,
    (CURRENT_DATE - (n || ' days')::INTERVAL)::DATE,
    (CURRENT_DATE - (n || ' days')::INTERVAL)::DATE,
    (1200 + (random() * 1000)::INTEGER),
    (55   + (random() * 50)::INTEGER),
    (3    + (random() * 6)::INTEGER),
    ROUND((55 + random() * 30)::NUMERIC, 2),
    ROUND((175 + random() * 120)::NUMERIC, 2)
  FROM generate_series(0, 29) AS n
  ON CONFLICT DO NOTHING;

  -- --------------------------------------------------------
  -- Relatórios diários — Meta Ads Conversão (30 dias)
  -- Perfil: volume médio, foco em conversão, ROAS ~2.8x
  -- --------------------------------------------------------
  INSERT INTO public.traffic_reports
    (campaign_id, client_id, period_start, period_end,
     impressions, clicks, conversions, spend, revenue)
  SELECT
    v_camp3_id,
    v_client_id,
    (CURRENT_DATE - (n || ' days')::INTERVAL)::DATE,
    (CURRENT_DATE - (n || ' days')::INTERVAL)::DATE,
    (1800 + (random() * 1200)::INTEGER),
    (60   + (random() * 60)::INTEGER),
    (3    + (random() * 7)::INTEGER),
    ROUND((45 + random() * 25)::NUMERIC, 2),
    ROUND((130 + random() * 90)::NUMERIC, 2)
  FROM generate_series(0, 29) AS n
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Dados de exemplo criados com sucesso! 3 campanhas + 90 dias de relatórios.';
END $$;
