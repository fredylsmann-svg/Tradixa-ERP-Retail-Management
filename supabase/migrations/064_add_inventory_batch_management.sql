-- ============================================================
-- 064: Inventory Batch Management & FEFO Support (Enterprise)
-- ============================================================

-- 1. Tambah kolom tracking ke tabel products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tracking_type TEXT DEFAULT 'None';
ALTER TABLE products ADD COLUMN IF NOT EXISTS track_expiry BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS default_shelf_life INTEGER DEFAULT 365;
ALTER TABLE products ADD COLUMN IF NOT EXISTS issue_method TEXT DEFAULT 'FIFO';

-- 2. Drop tabel lama jika ada (dari migrasi sebelumnya yang terlalu sederhana)
DROP TABLE IF EXISTS inventory_batches;

-- 3. Buat tabel inventory_batches dengan skema enterprise
CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL,
  warehouse_id UUID,
  location_id UUID,
  product_id UUID NOT NULL,
  batch_number TEXT NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  supplier_id UUID,
  po_id UUID,
  procurement_grn_id UUID,
  inventory_grn_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  qty_received NUMERIC DEFAULT 0,
  qty_reserved NUMERIC DEFAULT 0,
  qty_issued NUMERIC DEFAULT 0,
  qty_on_hand NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Available',
  created_date DATE DEFAULT CURRENT_DATE,
  updated_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(product_id, batch_number, warehouse_id)
);

-- 4. Tambah kolom batch ke stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS manufacture_date DATE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS fefo_status TEXT;

-- 5. Index untuk performa FEFO query
CREATE INDEX IF NOT EXISTS idx_batches_fefo ON inventory_batches(product_id, expiry_date, status);
CREATE INDEX IF NOT EXISTS idx_batches_store ON inventory_batches(store_id, status);
CREATE INDEX IF NOT EXISTS idx_batches_warehouse ON inventory_batches(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_batch ON stock_movements(batch_id);
