-- Migration 028: Add sale_location columns to sales_transactions
-- Menambahkan kolom lokasi dan koordinat penjualan

ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS sale_location TEXT DEFAULT '';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS sale_coordinates TEXT DEFAULT '';
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS sales_pic TEXT DEFAULT '';
