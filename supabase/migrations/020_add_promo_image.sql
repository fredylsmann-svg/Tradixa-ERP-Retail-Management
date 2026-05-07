-- 020_add_promo_image.sql
-- Menambahkan kolom promo_image_url ke tabel kampanye dan automasi

ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS promo_image_url TEXT DEFAULT '';

ALTER TABLE automation_rules 
ADD COLUMN IF NOT EXISTS promo_image_url TEXT DEFAULT '';
