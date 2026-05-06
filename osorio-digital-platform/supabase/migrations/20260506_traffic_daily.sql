-- Tabela de dados diários de tráfego por campanha.
-- Cada linha representa um dia de veiculação de uma campanha.
-- Usada para construir o gráfico dia a dia no dashboard.

CREATE TABLE IF NOT EXISTS traffic_daily (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
  campaign_id uuid        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  spend       numeric(12, 4) DEFAULT 0,
  impressions integer        DEFAULT 0,
  clicks      integer        DEFAULT 0,
  conversions integer        DEFAULT 0,
  created_at  timestamptz    DEFAULT now(),

  UNIQUE (client_id, campaign_id, date)
);

-- Índice para queries de dashboard por período e cliente
CREATE INDEX IF NOT EXISTS traffic_daily_client_date_idx
  ON traffic_daily (client_id, date);
