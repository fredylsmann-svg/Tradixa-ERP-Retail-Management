-- 019_add_automation_subject.sql
-- Menambahkan kolom email_subject ke tabel automation_rules
-- Menambahkan kolom statistik ke automation_rules agar sejajar dengan kampanye

ALTER TABLE automation_rules 
ADD COLUMN IF NOT EXISTS email_subject TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;
