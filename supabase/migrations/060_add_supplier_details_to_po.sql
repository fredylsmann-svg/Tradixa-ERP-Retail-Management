-- Migration: 060_add_supplier_details_to_po.sql
-- Description: Menambahkan detail kontak supplier ke tabel purchase_orders untuk standardisasi logistik.

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS supplier_phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS supplier_email TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS supplier_address TEXT DEFAULT '';

COMMENT ON COLUMN purchase_orders.supplier_phone IS 'Nomor telepon supplier yang disalin saat pembuatan PO';
COMMENT ON COLUMN purchase_orders.supplier_email IS 'Email supplier yang disalin saat pembuatan PO';
COMMENT ON COLUMN purchase_orders.supplier_address IS 'Alamat fisik supplier yang disalin saat pembuatan PO';
