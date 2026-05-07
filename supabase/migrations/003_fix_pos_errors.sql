-- ============================================================
-- TRADIXA - PATCH 003: POS & Sales Errors Fix
-- Run this in Supabase SQL Editor to fix missing columns
-- ============================================================

-- DISCOUNTS: is_active
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- SALES_TRANSACTIONS: sale_location, profit, and common missing fields
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS sale_location TEXT DEFAULT 'Main Store';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS sales_pic TEXT DEFAULT '';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS invoice_number TEXT DEFAULT '';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC DEFAULT 0;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Cash';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Paid';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0;

-- BANK_TRANSACTIONS: payment_proof_url (KHUSUS UNTUK MODUL PAYMENT)
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS payment_proof_url TEXT DEFAULT '';

-- SUPPLIER_RETURNS: missing columns for approval
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS compensation_type TEXT;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS final_refund_amount NUMERIC;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS refund_proof_url TEXT;
ALTER TABLE supplier_returns ADD COLUMN IF NOT EXISTS replacement_items JSONB;

-- Ensure COA table exists or has expected fields for journal integration
ALTER TABLE coa ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE coa ADD COLUMN IF NOT EXISTS normal_balance TEXT DEFAULT 'Debit';

-- ============================================================
-- DONE!
-- ============================================================
