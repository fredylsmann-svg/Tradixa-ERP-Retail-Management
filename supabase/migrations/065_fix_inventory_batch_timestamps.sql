-- ============================================================
-- 065: Fix missing columns for inventory_batches & UI sync
-- ============================================================

-- 1. Add created_at and updated_at (Supabase Standards for sorting)
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add denormalized fields for faster reporting (matching UI expectations)
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE inventory_batches ADD COLUMN IF NOT EXISTS grn_number TEXT;

-- 3. Data Migration: Update existing records
UPDATE inventory_batches SET created_at = created_date::TIMESTAMPTZ WHERE created_at IS NULL;
UPDATE inventory_batches SET updated_at = updated_date::TIMESTAMPTZ WHERE updated_at IS NULL;

-- 4. Attempt to backfill product_name if empty (via JOIN)
UPDATE inventory_batches ib
SET product_name = p.name
FROM products p
WHERE ib.product_id = p.id AND ib.product_name IS NULL;
