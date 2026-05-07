-- Add warehouse_name to products table for better location tracking
ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_name TEXT DEFAULT '';

-- Add warehouse_name to inventory_grns table to track where items were received
ALTER TABLE inventory_grns ADD COLUMN IF NOT EXISTS warehouse_name TEXT DEFAULT '';
