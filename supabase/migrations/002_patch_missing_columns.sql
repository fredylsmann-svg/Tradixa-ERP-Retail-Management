-- ============================================================
-- TRADIXA - PATCH: All missing columns found during code audit
-- Run this AFTER 001_initial_schema.sql in Supabase SQL Editor
-- ============================================================

-- SUPPLIERS: supplier_code
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code TEXT DEFAULT '';

-- BANK_TRANSACTIONS: missing fields from BankTransactions.jsx
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS bank_account_id TEXT DEFAULT '';
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC DEFAULT 0;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '';

-- AGENTS: balance, commission_rate
ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;

-- AGENT_TRANSACTIONS: missing fields from TransaksiAgen.jsx & SaldoKasAgen.jsx
ALTER TABLE agent_transactions ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT '';
ALTER TABLE agent_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT '';
ALTER TABLE agent_transactions ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT '';
ALTER TABLE agent_transactions ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE agent_transactions ADD COLUMN IF NOT EXISTS balance_after NUMERIC DEFAULT 0;
ALTER TABLE agent_transactions ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';

-- EMPLOYEES: employee_id, join_date, photo_url
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id TEXT DEFAULT '';

-- CUSTOMERS: bank_name, bank_account, status
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_account TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- DISCOUNTS: code, discount_type, discount_value (different field names from schema)
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS code TEXT DEFAULT '';
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'percentage';
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;

-- RECEIVABLES: customer_id
ALTER TABLE receivables ADD COLUMN IF NOT EXISTS customer_id TEXT DEFAULT '';

-- PURCHASE_REQUISITIONS: date_required, requester, approval_history
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS date_required TEXT DEFAULT '';
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS requester TEXT DEFAULT '';
ALTER TABLE purchase_requisitions ADD COLUMN IF NOT EXISTS approval_history JSONB DEFAULT '[]'::jsonb;

-- PURCHASE_ORDERS: missing fields from PurchaseOrders.jsx
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_id TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS original_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_date TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS pr_id TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS pr_number TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS admin_signature TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS admin_name TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS approval_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_signature TEXT DEFAULT '';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_signed_at TEXT DEFAULT '';

-- GOODS_RECEIPTS: missing fields from GoodsReceipt.jsx
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS surat_jalan TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS vehicle_no TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS driver_name TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS driver_phone TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS verified_at TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS admin_signature TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS admin_name TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS signed_at TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS driver_signature TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS driver_signed_at TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS inventory_grn_number TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS approval_history JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- DONE! All patches applied.
-- ============================================================
