-- 017_fix_communication_logs.sql
-- Menambahkan kolom yang kurang pada tabel communication_logs

ALTER TABLE communication_logs 
ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Sent';

-- Update index untuk performa
CREATE INDEX IF NOT EXISTS idx_communication_logs_store ON communication_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_customer ON communication_logs(customer_id);
