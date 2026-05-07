-- 021_link_logs_to_entities.sql
-- Menghubungkan communication_logs ke kampanye dan aturan automasi

ALTER TABLE communication_logs 
ADD COLUMN IF NOT EXISTS campaign_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS rule_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_communication_logs_campaign ON communication_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_rule ON communication_logs(rule_id);
