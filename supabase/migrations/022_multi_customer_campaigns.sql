-- 022_multi_customer_campaigns.sql
-- Menambahkan dukungan untuk multiple customer dalam satu kampanye

ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS target_customer_ids TEXT DEFAULT '';

-- Jika sudah ada data di customer_id, pindahkan ke target_customer_ids
UPDATE marketing_campaigns 
SET target_customer_ids = customer_id::text 
WHERE (target_customer_ids = '' OR target_customer_ids IS NULL) AND customer_id IS NOT NULL;
