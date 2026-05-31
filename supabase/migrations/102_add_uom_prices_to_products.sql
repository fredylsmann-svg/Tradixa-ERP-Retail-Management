-- ============================================================
-- MIGRATION 102: Add Multi-UoM Pricing to Products
-- Adds uom_prices JSONB column for bulk/wholesale pricing tiers
-- ============================================================
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE products ADD COLUMN IF NOT EXISTS uom_prices JSONB DEFAULT '[]';

-- Example data format:
-- [
--   { "unit": "Pcs",  "qty_per_base": 1,  "sell_price": 6000 },
--   { "unit": "Pack", "qty_per_base": 6,  "sell_price": 33000 },
--   { "unit": "Dus",  "qty_per_base": 24, "sell_price": 130000 }
-- ]
