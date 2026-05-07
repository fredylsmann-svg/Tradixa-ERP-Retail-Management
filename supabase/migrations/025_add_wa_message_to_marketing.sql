-- Add wa_message to marketing_campaigns
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS wa_message TEXT;
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS wa_message TEXT;
