ALTER TABLE traffic_reports ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0;
ALTER TABLE traffic_reports ADD COLUMN IF NOT EXISTS result_type text DEFAULT '';
