-- Migration: Add Advance Balance and Invoice Payments

-- 1. Add advance_balance to suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS advance_balance NUMERIC DEFAULT 0;

-- 2. Add advance_balance to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS advance_balance NUMERIC DEFAULT 0;

-- 3. Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
    updated_date TEXT DEFAULT '',
    store_id TEXT NOT NULL,
    invoice_type TEXT NOT NULL, -- 'Payable' or 'Receivable'
    invoice_id TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    bank_name TEXT DEFAULT '',
    payment_proof_url TEXT DEFAULT '',
    reference TEXT DEFAULT '',
    payment_date TEXT DEFAULT '',
    timestamp_wib TEXT DEFAULT ''
);

-- Index for fast lookup by invoice_id
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);
