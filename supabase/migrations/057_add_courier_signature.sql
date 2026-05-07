-- Migration: 057_add_courier_signature.sql
-- Description: Menambahkan kolom courier_signature untuk tanda tangan pengirim / kurir 
-- pada Surat Jalan (Delivery Order) di modul Procurement dan penerimaan barang.

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS courier_signature TEXT;

COMMENT ON COLUMN purchase_orders.courier_signature IS 'Tanda tangan digital kurir / driver saat pengiriman barang';

-- Untuk Goods Receipts juga relevan
ALTER TABLE goods_receipts 
ADD COLUMN IF NOT EXISTS courier_signature TEXT;

COMMENT ON COLUMN goods_receipts.courier_signature IS 'Tanda tangan digital kurir / driver saat menyerahkan barang ke gudang';
