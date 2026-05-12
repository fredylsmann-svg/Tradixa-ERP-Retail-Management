-- 023_add_tracking_columns.sql
-- Menambahkan kolom statistik untuk kampanye dan aturan automasi

-- 1. Tambah kolom ke marketing_campaigns (jika belum ada dari 014)
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;

-- 2. Tambah kolom ke automation_rules
ALTER TABLE automation_rules 
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;

-- 3. Update RPC untuk handle tracking
CREATE OR REPLACE FUNCTION increment_marketing_stat(
    target_id UUID, 
    stat_type TEXT, -- 'open' atau 'click'
    entity_type TEXT -- 'campaign' atau 'automation'
)
RETURNS void AS $$
BEGIN
    IF entity_type = 'campaign' THEN
        IF stat_type = 'open' THEN
            UPDATE marketing_campaigns SET opened_count = COALESCE(opened_count, 0) + 1 WHERE id = target_id;
        ELSIF stat_type = 'click' THEN
            UPDATE marketing_campaigns SET clicked_count = COALESCE(clicked_count, 0) + 1 WHERE id = target_id;
        END IF;
    ELSIF entity_type = 'automation' THEN
        IF stat_type = 'open' THEN
            UPDATE marketing_automation_rules SET opened_count = COALESCE(opened_count, 0) + 1 WHERE id = target_id;
        ELSIF stat_type = 'click' THEN
            UPDATE marketing_automation_rules SET clicked_count = COALESCE(clicked_count, 0) + 1 WHERE id = target_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
