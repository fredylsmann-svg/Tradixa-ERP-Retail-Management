-- 034: Fix stock_opname_items - add missing columns
-- Tabel sudah dibuat oleh 033 tapi tanpa created_date/updated_date

ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS created_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE stock_opname_items ADD COLUMN IF NOT EXISTS updated_date DATE DEFAULT CURRENT_DATE;
