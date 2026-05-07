-- Migration: 058_add_grn_receiving_columns.sql
-- Description: Add received_by and received_signature columns for GRN staff sign-off

ALTER TABLE goods_receipts
ADD COLUMN IF NOT EXISTS received_by TEXT,
ADD COLUMN IF NOT EXISTS received_signature TEXT;

COMMENT ON COLUMN goods_receipts.received_by IS 'Nama staf gudang yang menandatangani penerimaan barang';
COMMENT ON COLUMN goods_receipts.received_signature IS 'Tanda tangan digital staf gudang (base64)';
