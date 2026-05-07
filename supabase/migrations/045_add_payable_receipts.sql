-- Add payment proof tracking for AR/AP
ALTER TABLE payables ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE payables ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;

ALTER TABLE receivables ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS payment_bank_name TEXT;
