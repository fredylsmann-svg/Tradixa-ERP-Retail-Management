-- ============================================================
-- TRADIXA - PATCH 004: Bank Reconciliation & Sales Relations Fix
-- Run this in Supabase SQL Editor to fix missing link columns
-- ============================================================

-- BANK_TRANSACTIONS: Link to Sales Transactions for auto-matching
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS sales_transaction_id TEXT DEFAULT '';
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS customer_id TEXT DEFAULT '';
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '';

-- SALES_TRANSACTIONS: Ensure bank reference fields exist
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS bank_account_id TEXT DEFAULT '';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS payment_proof_url TEXT DEFAULT '';

-- RECEIVABLES: Link to Bank Transactions
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT DEFAULT '';

-- PAYABLES: Link to Bank Transactions
ALTER TABLE payables ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT DEFAULT '';

-- AGENT_SERVICES: Aligning with DaftarLayanan.jsx (Fixing field names)
DO $$ 
BEGIN 
  -- Rename service_name to name if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_services' AND column_name = 'service_name') THEN
    ALTER TABLE agent_services RENAME COLUMN service_name TO name;
  END IF;
  
  -- Rename fee_amount to fee if exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_services' AND column_name = 'fee_amount') THEN
    ALTER TABLE agent_services RENAME COLUMN fee_amount TO fee;
  END IF;
END $$;

-- Add missing columns for Agent Services
ALTER TABLE agent_services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Lainnya';
ALTER TABLE agent_services ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE agent_services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================
-- DONE!
-- ============================================================
