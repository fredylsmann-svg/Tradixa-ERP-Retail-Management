-- Add font_family column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';
