-- Migration: 059_add_grn_supplier_details.sql
-- Description: Add supplier address, phone, and email to goods_receipts for data parity

ALTER TABLE goods_receipts
ADD COLUMN IF NOT EXISTS supplier_address TEXT,
ADD COLUMN IF NOT EXISTS supplier_phone TEXT,
ADD COLUMN IF NOT EXISTS supplier_email TEXT,
ADD COLUMN IF NOT EXISTS confirmed_delivery_date TIMESTAMPTZ;

COMMENT ON COLUMN goods_receipts.supplier_address IS 'Alamat supplier saat GRN dibuat';
COMMENT ON COLUMN goods_receipts.supplier_phone IS 'Nomor telepon supplier saat GRN dibuat';
COMMENT ON COLUMN goods_receipts.supplier_email IS 'Email supplier saat GRN dibuat';
COMMENT ON COLUMN goods_receipts.confirmed_delivery_date IS 'ETA yang dikonfirmasi supplier';
