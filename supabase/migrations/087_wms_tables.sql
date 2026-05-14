-- WMS: Warehouse Transfers
CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  transfer_number TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  status TEXT DEFAULT 'Draft',
  notes TEXT,
  transferred_by TEXT,
  received_by TEXT,
  transfer_date DATE,
  received_date DATE,
  timestamp_wib TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WMS: Pick Lists
CREATE TABLE IF NOT EXISTS pick_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  pick_number TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  assigned_to TEXT,
  notes TEXT,
  items JSONB DEFAULT '[]',
  source_orders JSONB DEFAULT '[]',
  picked_at TIMESTAMPTZ,
  timestamp_wib TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
