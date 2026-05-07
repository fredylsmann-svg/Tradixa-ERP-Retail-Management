-- 033: Stock Opname (Physical Inventory Count)
-- Modul untuk mencocokkan stok sistem vs stok fisik

CREATE TABLE IF NOT EXISTS stock_opnames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id),
  opname_number TEXT NOT NULL,
  location TEXT,
  opname_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Progress', 'Completed', 'Approved', 'Rejected')),
  notes TEXT,
  total_items INT DEFAULT 0,
  matched_items INT DEFAULT 0,
  surplus_items INT DEFAULT 0,
  deficit_items INT DEFAULT 0,
  total_variance_value NUMERIC DEFAULT 0,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by TEXT,
  created_date DATE DEFAULT CURRENT_DATE,
  updated_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_opname_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opname_id UUID REFERENCES stock_opnames(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT,
  sku TEXT,
  barcode TEXT,
  unit TEXT DEFAULT 'pcs',
  system_stock NUMERIC DEFAULT 0,
  physical_stock NUMERIC,
  variance NUMERIC DEFAULT 0,
  variance_type TEXT CHECK (variance_type IN ('Surplus', 'Deficit', 'Match')),
  unit_cost NUMERIC DEFAULT 0,
  variance_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_date DATE DEFAULT CURRENT_DATE,
  updated_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_opname_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_opnames_all" ON stock_opnames FOR ALL USING (true);
CREATE POLICY "stock_opname_items_all" ON stock_opname_items FOR ALL USING (true);
