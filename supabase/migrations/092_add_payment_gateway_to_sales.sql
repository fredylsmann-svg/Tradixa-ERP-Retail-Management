-- Migration 092: Add payment_gateway_id to sales_transactions table
ALTER TABLE public.sales_transactions
ADD COLUMN IF NOT EXISTS payment_gateway_id TEXT DEFAULT '';

-- Add index to speed up lookup by webhook
CREATE INDEX IF NOT EXISTS idx_sales_transactions_gateway_id ON public.sales_transactions(payment_gateway_id);
