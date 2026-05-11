-- ============================================================
-- 071: Fix inventory_serials — Add created_at column
-- ============================================================
-- API client default sort uses `created_at` but table only has `created_date`.
-- Add the missing column and backfill from created_date.

ALTER TABLE inventory_serials 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Backfill: copy created_date values into created_at for existing records
UPDATE inventory_serials 
SET created_at = created_date::timestamptz 
WHERE created_at IS NULL AND created_date IS NOT NULL;
