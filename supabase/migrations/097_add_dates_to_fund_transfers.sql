-- Migration 097: Add missing date columns to fund_transfers table
-- Required by the API client which auto-injects created_date & updated_date on every create/update
ALTER TABLE public.fund_transfers ADD COLUMN IF NOT EXISTS created_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.fund_transfers ADD COLUMN IF NOT EXISTS updated_date DATE DEFAULT CURRENT_DATE;
