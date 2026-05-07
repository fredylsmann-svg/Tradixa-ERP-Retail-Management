-- Add marketing logo preference to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS show_marketing_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS marketing_logo_align TEXT DEFAULT 'center';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS marketing_logo_size TEXT DEFAULT 'medium';

-- Add custom CTA text to marketing campaigns
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Belanja Sekarang';
