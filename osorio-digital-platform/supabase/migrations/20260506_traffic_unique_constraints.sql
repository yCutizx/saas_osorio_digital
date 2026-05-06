-- Evita duplicar a mesma campanha (mesmo nome/plataforma por cliente)
-- Permite que imports diferentes reutilizem a mesma campanha,
-- acumulando relatórios sem criar campanhas duplicadas.
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_client_name_platform_unique
  UNIQUE (client_id, name, platform);

-- Evita duplicar relatório para o mesmo período e campanha.
-- Subir o mesmo CSV duas vezes ignora as linhas já existentes.
ALTER TABLE traffic_reports
  ADD CONSTRAINT traffic_reports_campaign_period_unique
  UNIQUE (client_id, campaign_id, period_start, period_end);
