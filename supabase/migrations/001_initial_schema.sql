-- ============================================================
-- TRADIXA ERP - MASTER SQL MIGRATION
-- Generated from 37 entity JSON + 67 page JSX analysis
-- For: Fresh Supabase project (empty)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HELPER: All tables share these base columns
-- id, created_at, created_date, updated_date
-- ============================================================

-- 1. STORES
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_name TEXT NOT NULL DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  owner_user_id TEXT DEFAULT '',
  owner_email TEXT DEFAULT '',
  owner_name TEXT DEFAULT '',
  owner_position TEXT DEFAULT '',
  owner_phone TEXT DEFAULT '',
  owner_photo_url TEXT DEFAULT '',
  owner_notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  password TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  username TEXT DEFAULT '',
  role TEXT DEFAULT 'staff',
  position TEXT DEFAULT '',
  department TEXT DEFAULT '',
  site TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  modules JSONB DEFAULT '[]',
  photo_url TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  current_store_id TEXT DEFAULT '',
  linked_employee_id TEXT DEFAULT '',
  is_store_setup_completed BOOLEAN DEFAULT false
);

-- 3. SUPPLIERS (replaces Vendor)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  supplier_code TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  phone_code TEXT DEFAULT '+62',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  npwp TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  notes TEXT DEFAULT '',
  image_url TEXT DEFAULT ''
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  sku TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  buy_unit TEXT DEFAULT '',
  sell_unit TEXT DEFAULT '',
  conversion_rate NUMERIC DEFAULT 1,
  cogs_per_unit NUMERIC DEFAULT 0,
  location_name TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  buy_price NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  stock NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 10,
  expired_date TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'In Stock',
  timestamp_wib TEXT DEFAULT ''
);

-- 5. STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  product_id TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  movement_type TEXT DEFAULT '',
  stock_type TEXT DEFAULT '',
  quantity NUMERIC DEFAULT 0,
  expired_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 6. PRODUCT LOCATIONS
CREATE TABLE IF NOT EXISTS product_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'rack',
  address TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  coordinates TEXT DEFAULT ''
);

-- 7. PURCHASE REQUISITIONS
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  pr_number TEXT DEFAULT '',
  department TEXT DEFAULT '',
  priority TEXT DEFAULT 'Normal',
  days_needed NUMERIC DEFAULT 0,
  justification TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  timestamp_wib TEXT DEFAULT '',
  approved_by TEXT DEFAULT '',
  approved_at TEXT DEFAULT '',
  converted_to_po BOOLEAN DEFAULT false,
  date_required TEXT DEFAULT '',
  requester TEXT DEFAULT '',
  approval_history JSONB DEFAULT '[]'::jsonb,
  po_id TEXT DEFAULT ''
);

-- 8. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  po_number TEXT DEFAULT '',
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  vendor_id TEXT DEFAULT '', -- Legacy support
  vendor_name TEXT DEFAULT '', -- Legacy support
  items JSONB DEFAULT '[]',
  original_items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  delivery_date TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  pr_id TEXT DEFAULT '',
  pr_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  admin_signature TEXT DEFAULT '',
  admin_name TEXT DEFAULT '',
  admin_role TEXT DEFAULT '',
  approval_history JSONB DEFAULT '[]'::jsonb,
  cancellation_reason TEXT DEFAULT '',
  supplier_signature TEXT DEFAULT '',
  supplier_signed_at TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 9. GOODS RECEIPTS
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  gr_number TEXT DEFAULT '',
  po_id TEXT DEFAULT '',
  po_number TEXT DEFAULT '',
  vendor_name TEXT DEFAULT '',
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  total_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Draft',
  surat_jalan TEXT DEFAULT '',
  vehicle_no TEXT DEFAULT '',
  driver_name TEXT DEFAULT '',
  driver_phone TEXT DEFAULT '',
  storage_location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  verified_at TEXT DEFAULT '',
  admin_signature TEXT DEFAULT '',
  admin_name TEXT DEFAULT '',
  admin_role TEXT DEFAULT '',
  signed_at TEXT DEFAULT '',
  driver_signature TEXT DEFAULT '',
  driver_signed_at TEXT DEFAULT '',
  inventory_grn_number TEXT DEFAULT '',
  approval_history JSONB DEFAULT '[]'::jsonb,
  timestamp_wib TEXT DEFAULT '',
  signatures JSONB DEFAULT '{}' -- Legacy support
);

-- 10. INVENTORY GRN
CREATE TABLE IF NOT EXISTS inventory_grns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  igrn_number TEXT DEFAULT '',
  journal_id TEXT DEFAULT '',
  procurement_grn_id TEXT DEFAULT '',
  procurement_grn_number TEXT DEFAULT '',
  po_id TEXT DEFAULT '',
  po_number TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  surat_jalan TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  total_amount NUMERIC DEFAULT 0,
  storage_location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  signatures JSONB DEFAULT '{}',
  status TEXT DEFAULT 'Draft',
  timestamp_wib TEXT DEFAULT ''
);

-- 11. SUPPLIER RETURNS
CREATE TABLE IF NOT EXISTS supplier_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  return_number TEXT DEFAULT '',
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  bank_account_id TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  total_value NUMERIC DEFAULT 0,
  activity_log JSONB DEFAULT '[]',
  timestamp_wib TEXT DEFAULT ''
);

-- 12. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  status TEXT DEFAULT 'Active'
);

-- 13. CUSTOMER SEGMENTS
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT DEFAULT '',
  criteria JSONB DEFAULT '{}'
);

-- 14. CUSTOMER INTERACTIONS
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  type TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  date TEXT DEFAULT '',
  status TEXT DEFAULT ''
);

-- 15. CUSTOMER LOYALTIES
CREATE TABLE IF NOT EXISTS customer_loyalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  points NUMERIC DEFAULT 0,
  tier TEXT DEFAULT 'Bronze',
  total_spent NUMERIC DEFAULT 0,
  join_date TEXT DEFAULT '',
  status TEXT DEFAULT 'Active'
);

-- 16. COMMUNICATION LOGS
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  type TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  timestamp TEXT DEFAULT ''
);

-- 17. FOLLOW UP REMINDERS
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  priority TEXT DEFAULT 'Normal',
  assigned_to TEXT DEFAULT ''
);

-- 18. MARKETING CAMPAIGNS
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  status TEXT DEFAULT 'Draft',
  budget NUMERIC DEFAULT 0,
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  target_segment TEXT DEFAULT '',
  description TEXT DEFAULT '',
  results JSONB DEFAULT '{}'
);

-- 19. AUTOMATION RULES
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT DEFAULT '',
  trigger_type TEXT DEFAULT '',
  action_type TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  conditions JSONB DEFAULT '{}',
  actions JSONB DEFAULT '{}'
);

-- 20. SALES TRANSACTIONS
CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  invoice_number TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax_percentage NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  payment_status TEXT DEFAULT 'Paid',
  paid_amount NUMERIC DEFAULT 0,
  bank_account_id TEXT DEFAULT '',
  payment_proof_url TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 21. COA (Chart of Accounts)
CREATE TABLE IF NOT EXISTS coa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'Asset',
  normal_balance TEXT DEFAULT 'Debit',
  description TEXT DEFAULT ''
);

-- 22. JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  date TEXT DEFAULT '',
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'Manual',
  status TEXT DEFAULT 'Draft',
  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  created_by TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  entries JSONB DEFAULT '[]',
  account_name TEXT DEFAULT '',
  account_type TEXT DEFAULT '',
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0
);

-- 23. JOURNAL LINES
CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  journal_id TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0
);

-- 24. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  date TEXT DEFAULT '',
  category TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 25. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  balance NUMERIC DEFAULT 0,
  account_type TEXT DEFAULT 'Savings',
  is_active BOOLEAN DEFAULT true
);

-- 26. BANK TRANSACTIONS
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  transaction_type TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  bank_id TEXT DEFAULT '',
  bank_account_id TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  reference_number TEXT DEFAULT '',
  reference TEXT DEFAULT '',
  balance_after NUMERIC DEFAULT 0,
  status TEXT DEFAULT '',
  attachment_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 27. PAYABLES (Account Payable)
CREATE TABLE IF NOT EXISTS payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  invoice_number TEXT DEFAULT '',
  vendor_id TEXT DEFAULT '',
  vendor_name TEXT DEFAULT '',
  supplier_id TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  po_id TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  due_date TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  notes TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 28. RECEIVABLES (Account Receivable)
CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  invoice_number TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  sales_id TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  remaining_amount NUMERIC DEFAULT 0,
  due_date TEXT DEFAULT '',
  status TEXT DEFAULT 'Belum Lunas',
  notes TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 29. AGENTS
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  balance NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0
);

-- 30. AGENT SERVICES
CREATE TABLE IF NOT EXISTS agent_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  service_name TEXT DEFAULT '',
  fee_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active'
);

-- 31. AGENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS agent_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  agent_id TEXT DEFAULT '',
  agent_name TEXT DEFAULT '',
  service_id TEXT DEFAULT '',
  transaction_type TEXT DEFAULT '',
  service_type TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  reference TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending',
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  timestamp_wib TEXT DEFAULT ''
);

-- 32. EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  employee_id TEXT DEFAULT '',
  name TEXT DEFAULT '',
  position TEXT DEFAULT '',
  department TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  join_date TEXT DEFAULT '',
  address TEXT DEFAULT '',
  photo_url TEXT DEFAULT ''
);

-- 33. DISCOUNTS
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  code TEXT DEFAULT '',
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'percentage',
  discount_type TEXT DEFAULT 'percentage',
  value NUMERIC DEFAULT 0,
  discount_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  start_date TEXT DEFAULT '',
  end_date TEXT DEFAULT '',
  min_purchase NUMERIC DEFAULT 0,
  max_discount NUMERIC DEFAULT 0,
  applicable_products JSONB DEFAULT '[]',
  applicable_categories JSONB DEFAULT '[]',
  usage_limit NUMERIC DEFAULT 0,
  used_count NUMERIC DEFAULT 0
);

-- 34. DISCOUNT USAGES
CREATE TABLE IF NOT EXISTS discount_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  discount_id TEXT DEFAULT '',
  transaction_id TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  customer_id TEXT DEFAULT ''
);

-- 35. LOYALTY REWARDS
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  name TEXT DEFAULT '',
  points_required NUMERIC DEFAULT 0,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  stock NUMERIC DEFAULT 0,
  image_url TEXT DEFAULT ''
);

-- 36. LOYALTY TIERS
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  name TEXT DEFAULT '',
  min_points NUMERIC DEFAULT 0,
  benefits JSONB DEFAULT '[]',
  color TEXT DEFAULT '',
  icon TEXT DEFAULT ''
);

-- 37. LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_date TEXT DEFAULT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD'),
  updated_date TEXT DEFAULT '',
  customer_id TEXT DEFAULT '',
  type TEXT DEFAULT '',
  points NUMERIC DEFAULT 0,
  description TEXT DEFAULT '',
  reference_id TEXT DEFAULT ''
);

-- ============================================================
-- INDEXES for performance (store_id is the most filtered column)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_suppliers_store ON suppliers(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store ON stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_product_locations_store ON product_locations(store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_store ON purchase_requisitions(store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_store ON purchase_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_store ON goods_receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_grns_store ON inventory_grns(store_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_store ON supplier_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_store ON customer_segments(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalties_customer ON customer_loyalties(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_store ON sales_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_coa_store ON coa(store_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_store ON journal_entries(store_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_store ON bank_accounts(store_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_store ON bank_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_payables_store ON payables(store_id);
CREATE INDEX IF NOT EXISTS idx_receivables_store ON receivables(store_id);
CREATE INDEX IF NOT EXISTS idx_agents_store ON agents(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_services_store ON agent_services(store_id);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_store ON agent_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_store ON employees(store_id);
CREATE INDEX IF NOT EXISTS idx_discounts_store ON discounts(store_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - SaaS Multi-Tenancy
-- Will be configured after Supabase Auth integration
-- ============================================================
-- NOTE: RLS policies akan ditambahkan di Fase 4
-- setelah client.js sudah terintegrasi dengan Supabase Auth.
-- Untuk saat ini, semua tabel terbuka untuk development.

-- ============================================================
-- DONE! 37 tables + indexes created successfully.
-- ============================================================
