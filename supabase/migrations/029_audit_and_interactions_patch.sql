-- 029_audit_and_interactions_patch.sql
-- Fix Audit Log store_id type and expand Customer Interactions
-- Final Patch for missing store_id columns in multiple tables

-- 1. Alter system_audit_logs store_id to TEXT to match all entity types
ALTER TABLE system_audit_logs ALTER COLUMN store_id TYPE TEXT;

-- 2. Add missing store_id columns to Customer-related tables
ALTER TABLE customer_interactions ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT '';
ALTER TABLE follow_up_reminders ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT '';
ALTER TABLE communication_logs ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT '';
ALTER TABLE customer_loyalties ADD COLUMN IF NOT EXISTS store_id TEXT DEFAULT '';

-- 3. Expand customer_interactions to support Marketing Automation logs
ALTER TABLE customer_interactions 
ADD COLUMN IF NOT EXISTS interaction_type TEXT,
ADD COLUMN IF NOT EXISTS campaign_name TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Ensure Sales Transactions has discount_id and subtotal if missing
ALTER TABLE sales_transactions 
ADD COLUMN IF NOT EXISTS discount_id TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
