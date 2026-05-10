-- ============================================================
-- TRADIXA ERP - Tax Rates Table
-- Centralized tax configuration for all modules
-- ============================================================

CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  rate NUMERIC NOT NULL DEFAULT 0,
  type TEXT DEFAULT 'Value Added Tax',
  applied_to TEXT DEFAULT 'Sales',
  status TEXT DEFAULT 'active'
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_tax_rates_store ON tax_rates(store_id);
CREATE INDEX IF NOT EXISTS idx_tax_rates_status ON tax_rates(status);
