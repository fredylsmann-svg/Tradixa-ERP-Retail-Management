-- ============================================================
-- 069: Inventory Serial Tracking Management (Enterprise)
-- ============================================================

-- 1. Create inventory_serials table
CREATE TABLE IF NOT EXISTS inventory_serials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL,
  warehouse_id UUID,
  product_id UUID NOT NULL,
  serial_number TEXT NOT NULL,
  status TEXT DEFAULT 'Available', -- 'Available', 'Sold', 'Returned', 'RMA'
  supplier_id UUID,
  po_id UUID,
  inventory_grn_id UUID,
  sales_transaction_id UUID,
  unit_cost NUMERIC DEFAULT 0,
  created_date DATE DEFAULT CURRENT_DATE,
  updated_date DATE DEFAULT CURRENT_DATE,
  UNIQUE(store_id, product_id, serial_number)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_serials_store ON inventory_serials(store_id, status);
CREATE INDEX IF NOT EXISTS idx_serials_product ON inventory_serials(product_id, status);
CREATE INDEX IF NOT EXISTS idx_serials_number ON inventory_serials(serial_number);
CREATE INDEX IF NOT EXISTS idx_serials_grn ON inventory_serials(inventory_grn_id);
CREATE INDEX IF NOT EXISTS idx_serials_sales ON inventory_serials(sales_transaction_id);

-- 3. Add to Supabase Realtime (optional but good)
-- ALTER PUBLICATION supabase_realtime ADD TABLE inventory_serials;
