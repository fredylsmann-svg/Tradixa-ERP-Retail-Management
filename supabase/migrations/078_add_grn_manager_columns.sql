ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS warehouse_manager_signature TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS warehouse_manager_name TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS manager_signed_at TEXT DEFAULT '';
ALTER TABLE goods_receipts ADD COLUMN IF NOT EXISTS manager_phone TEXT DEFAULT '';
