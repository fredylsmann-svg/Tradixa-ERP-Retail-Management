-- Migration: 009_add_shipping_via_to_po.sql
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS shipping_via TEXT;

COMMENT ON COLUMN purchase_orders.shipping_via IS 'Nama ekspedisi atau metode pengiriman untuk Purchase Order';
