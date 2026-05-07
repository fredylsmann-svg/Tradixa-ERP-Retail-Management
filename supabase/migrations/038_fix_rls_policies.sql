-- Migration 038: Fix RLS policies for authenticated users
-- This allows authenticated Supabase Auth users to perform CRUD on all app tables

-- ============================================================
-- USERS TABLE
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert" ON users;
CREATE POLICY "Users can insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Also allow anon for signup flow
DROP POLICY IF EXISTS "Anon can insert users" ON users;
CREATE POLICY "Anon can insert users" ON users
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can read users" ON users;
CREATE POLICY "Anon can read users" ON users
  FOR SELECT TO anon
  USING (true);

-- ============================================================
-- STORES TABLE
-- ============================================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access stores" ON stores;
CREATE POLICY "Authenticated full access stores" ON stores
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access products" ON products;
    CREATE POLICY "Authenticated full access products" ON products
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categories') THEN
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access categories" ON categories;
    CREATE POLICY "Authenticated full access categories" ON categories
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- SUPPLIERS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access suppliers" ON suppliers;
    CREATE POLICY "Authenticated full access suppliers" ON suppliers
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access customers" ON customers;
    CREATE POLICY "Authenticated full access customers" ON customers
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access transactions" ON transactions;
    CREATE POLICY "Authenticated full access transactions" ON transactions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- TRANSACTION_ITEMS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_items') THEN
    ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access transaction_items" ON transaction_items;
    CREATE POLICY "Authenticated full access transaction_items" ON transaction_items
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access expenses" ON expenses;
    CREATE POLICY "Authenticated full access expenses" ON expenses
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- BANK_TRANSACTIONS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_transactions') THEN
    ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access bank_transactions" ON bank_transactions;
    CREATE POLICY "Authenticated full access bank_transactions" ON bank_transactions
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- JOURNAL_ENTRIES TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
    ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access journal_entries" ON journal_entries;
    CREATE POLICY "Authenticated full access journal_entries" ON journal_entries
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- JOURNAL_LINES TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_lines') THEN
    ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access journal_lines" ON journal_lines;
    CREATE POLICY "Authenticated full access journal_lines" ON journal_lines
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- COA (CHART OF ACCOUNTS) TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
    ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access coa" ON chart_of_accounts;
    CREATE POLICY "Authenticated full access coa" ON chart_of_accounts
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- PURCHASE ORDERS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders') THEN
    ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access purchase_orders" ON purchase_orders;
    CREATE POLICY "Authenticated full access purchase_orders" ON purchase_orders
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- GOODS_RECEIPTS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goods_receipts') THEN
    ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access goods_receipts" ON goods_receipts;
    CREATE POLICY "Authenticated full access goods_receipts" ON goods_receipts
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- STOCK_MOVEMENTS TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
    ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access stock_movements" ON stock_movements;
    CREATE POLICY "Authenticated full access stock_movements" ON stock_movements
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- INVOICES TABLE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Authenticated full access invoices" ON invoices;
    CREATE POLICY "Authenticated full access invoices" ON invoices
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- ALL OTHER REMAINING TABLES — blanket policy
-- ============================================================
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN (
      'users', 'stores', 'products', 'categories', 'suppliers', 
      'customers', 'transactions', 'transaction_items', 'expenses',
      'bank_transactions', 'journal_entries', 'journal_lines',
      'chart_of_accounts', 'purchase_orders', 'goods_receipts',
      'stock_movements', 'invoices'
    )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access %I" ON %I', tbl.tablename, tbl.tablename);
    EXECUTE format(
      'CREATE POLICY "Authenticated full access %I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl.tablename, tbl.tablename
    );
  END LOOP;
END $$;
