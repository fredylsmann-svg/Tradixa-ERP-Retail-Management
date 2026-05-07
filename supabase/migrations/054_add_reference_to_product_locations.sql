-- Migration: Add reference column to product_locations
ALTER TABLE product_locations ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';
