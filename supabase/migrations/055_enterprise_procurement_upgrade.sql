-- Migration: 055_enterprise_procurement_upgrade.sql
-- Description: Menambahkan kolom untuk alur logistik enterprise, negosiasi, dan receiving.

-- 1) Update Table Purchase Orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS shipping_confirmation JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS confirmed_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS negotiation_mode TEXT DEFAULT 'Item', -- 'Item' or 'Total'
ADD COLUMN IF NOT EXISTS counter_offer_price DECIMAL(20, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS negotiation_notes TEXT;

COMMENT ON COLUMN purchase_orders.shipping_confirmation IS 'Data detail logistik yang diinput oleh supplier saat konfirmasi PO';
COMMENT ON COLUMN purchase_orders.confirmed_delivery_date IS 'Tanggal kedatangan barang yang dikonfirmasi oleh supplier';

-- 2) Update Table Goods Receipts
ALTER TABLE goods_receipts 
ADD COLUMN IF NOT EXISTS delivery_reference_snapshot JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS actual_arrival_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS receiving_status TEXT DEFAULT 'pending', -- pending, partial_received, fully_received, rejected, pending_qc, completed
ADD COLUMN IF NOT EXISTS warehouse_manager_signature TEXT,
ADD COLUMN IF NOT EXISTS warehouse_manager_name TEXT;

COMMENT ON COLUMN goods_receipts.delivery_reference_snapshot IS 'Snapshot data shipping dari PO pada saat barang diterima';
COMMENT ON COLUMN goods_receipts.actual_arrival_at IS 'Waktu aktual barang sampai di gudang untuk perhitungan SLA/KPI';

-- 3) Ensure audit trail captures these
-- (Audit logs are generic and usually capture all changes automatically via the API proxy)
