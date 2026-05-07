-- ============================================================
-- Update Marketing & Automation Schema
-- Menyesuaikan kolom dengan fitur Campaign & Resend
-- ============================================================

-- 1. Update marketing_campaigns
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'Email',
ADD COLUMN IF NOT EXISTS trigger_type TEXT DEFAULT 'Manual',
ADD COLUMN IF NOT EXISTS segment_id TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS message_content TEXT,
ADD COLUMN IF NOT EXISTS schedule_date TEXT,
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sent_count NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS opened_count NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count NUMERIC DEFAULT 0;

-- Migrasi data lama (pindahkan 'name' ke 'campaign_name' jika ada)
UPDATE marketing_campaigns SET campaign_name = name WHERE campaign_name IS NULL;

-- 2. Update automation_rules
ALTER TABLE automation_rules
ADD COLUMN IF NOT EXISTS rule_name TEXT,
ADD COLUMN IF NOT EXISTS "trigger" TEXT,
ADD COLUMN IF NOT EXISTS campaign_template JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_run TEXT,
ADD COLUMN IF NOT EXISTS total_executions NUMERIC DEFAULT 0;

-- Migrasi data lama (pindahkan 'name' ke 'rule_name')
UPDATE automation_rules SET rule_name = name WHERE rule_name IS NULL;
