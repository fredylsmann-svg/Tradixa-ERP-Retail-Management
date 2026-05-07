-- TRADIXA - Fix Loyalty Tables Schema
-- Run this in your Supabase SQL Editor to add missing store_id columns

-- Fix customer_loyalties
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_loyalties' AND column_name='store_id') THEN
        ALTER TABLE customer_loyalties ADD COLUMN store_id UUID;
    END IF;
END $$;

-- Fix loyalty_tiers
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loyalty_tiers' AND column_name='store_id') THEN
        ALTER TABLE loyalty_tiers ADD COLUMN store_id UUID;
    END IF;
END $$;

-- Fix loyalty_rewards
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loyalty_rewards' AND column_name='store_id') THEN
        ALTER TABLE loyalty_rewards ADD COLUMN store_id UUID;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_loyalties_store ON customer_loyalties(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_store ON loyalty_tiers(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_store ON loyalty_rewards(store_id);
