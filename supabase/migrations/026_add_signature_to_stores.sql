-- Add signature_url and signature_history to stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS signature_history JSONB DEFAULT '[]'::jsonb;
