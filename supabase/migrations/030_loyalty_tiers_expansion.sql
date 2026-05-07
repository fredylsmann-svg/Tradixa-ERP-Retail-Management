-- Migration: Expansion of loyalty_tiers table
-- Description: Adds supporting columns for automated discounts, point multipliers, and aesthetics.

ALTER TABLE loyalty_tiers 
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_multiplier DECIMAL DEFAULT 1,
ADD COLUMN IF NOT EXISTS benefits TEXT,
ADD COLUMN IF NOT EXISTS tier_color TEXT DEFAULT '#94a3b8';

-- Also ensure customer_loyalties has store_id and other necessary columns if missed
ALTER TABLE customer_loyalties
ADD COLUMN IF NOT EXISTS store_id UUID,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_store ON loyalty_tiers(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalties_store ON customer_loyalties(store_id);
