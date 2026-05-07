-- ============================================================
-- 012_add_template_type_to_marketing.sql
-- Menambahkan kolom template_type yang hilang
-- ============================================================

ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'Standard';
