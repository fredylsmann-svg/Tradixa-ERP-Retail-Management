-- Add payment gateway columns to receivables
ALTER TABLE receivables
ADD COLUMN IF NOT EXISTS payment_link TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS payment_gateway_id TEXT DEFAULT '';
