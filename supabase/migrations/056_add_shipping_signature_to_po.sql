-- Migration: 056_add_shipping_signature_to_po.sql
-- Description: Menambahkan kolom shipping_signature dan shipping_signed_at
-- yang dibutuhkan oleh Portal Supplier Fase 2 (Konfirmasi Pengiriman).

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS shipping_signature TEXT,
ADD COLUMN IF NOT EXISTS shipping_signed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN purchase_orders.shipping_signature IS 'Tanda tangan digital supplier saat mengkonfirmasi pengiriman barang (Fase 2)';
COMMENT ON COLUMN purchase_orders.shipping_signed_at IS 'Timestamp saat supplier menandatangani konfirmasi pengiriman';
