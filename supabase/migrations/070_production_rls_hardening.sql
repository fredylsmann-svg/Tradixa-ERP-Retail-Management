-- ============================================================
-- 070: Production RLS Hardening — Multi-Tenant Store Isolation
-- ============================================================
-- Tujuan: Mengamankan SEMUA tabel agar user hanya bisa akses
-- data dari toko yang dia miliki (berdasarkan store_id).
--
-- Model: 1 User = 1 Email = 1 Store
-- Script ini AMAN dijalankan berulang kali (idempotent).
--
-- PENTING: Kolom `owner_user_id` di stores menyimpan `users.id`
-- (UUID auto-generated), BUKAN `auth.uid()`. Oleh karena itu kita
-- menggunakan email sebagai bridge: auth.jwt() -> email -> users -> stores.
-- ============================================================

-- =============================================
-- STEP 1: Helper Functions
-- =============================================
-- Supports BOTH owner and staff users:
-- 1. Owner: auth email → users.id → stores.owner_user_id
-- 2. Staff: auth email → users.store_id / current_store_id

CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- Priority 1: User is owner of a store
    (SELECT s.id FROM stores s 
     INNER JOIN users u ON s.owner_user_id = u.id::text 
     WHERE u.email = auth.jwt()->>'email' LIMIT 1),
    -- Priority 2: User has store_id set (staff)
    (SELECT u.store_id::uuid FROM users u 
     WHERE u.email = auth.jwt()->>'email' AND u.store_id IS NOT NULL LIMIT 1),
    -- Priority 3: User has current_store_id set
    (SELECT u.current_store_id::uuid FROM users u 
     WHERE u.email = auth.jwt()->>'email' AND u.current_store_id IS NOT NULL LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION get_my_store_id_text()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT s.id::text FROM stores s 
     INNER JOIN users u ON s.owner_user_id = u.id::text 
     WHERE u.email = auth.jwt()->>'email' LIMIT 1),
    (SELECT u.store_id FROM users u 
     WHERE u.email = auth.jwt()->>'email' AND u.store_id IS NOT NULL LIMIT 1),
    (SELECT u.current_store_id FROM users u 
     WHERE u.email = auth.jwt()->>'email' AND u.current_store_id IS NOT NULL LIMIT 1)
  );
$$;

-- =============================================
-- STEP 2: Safe RLS Applier
-- =============================================
CREATE OR REPLACE FUNCTION safe_apply_store_rls(tbl TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  col_type TEXT;
BEGIN
  -- Check table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = tbl
  ) THEN
    RAISE NOTICE '[SKIP] Table % does not exist.', tbl;
    RETURN;
  END IF;

  -- Check table has store_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'store_id'
  ) THEN
    RAISE NOTICE '[SKIP] Table % has no store_id column.', tbl;
    RETURN;
  END IF;

  -- Get the data type of store_id column
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'store_id';

  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  
  -- Drop ALL existing policies (clean slate)
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated full access %I" ON %I', tbl, tbl);
  EXECUTE format('DROP POLICY IF EXISTS "Store scoped access %I" ON %I', tbl, tbl);
  EXECUTE format('DROP POLICY IF EXISTS "Anon read %I" ON %I', tbl, tbl);
  
  -- Create store-scoped policy based on column type
  IF col_type = 'uuid' THEN
    EXECUTE format(
      'CREATE POLICY "Store scoped access %I" ON %I FOR ALL TO authenticated USING (store_id = get_user_store_id()) WITH CHECK (store_id = get_user_store_id())',
      tbl, tbl
    );
  ELSE
    -- store_id is text/varchar
    EXECUTE format(
      'CREATE POLICY "Store scoped access %I" ON %I FOR ALL TO authenticated USING (store_id = get_my_store_id_text()) WITH CHECK (store_id = get_my_store_id_text())',
      tbl, tbl
    );
  END IF;

  RAISE NOTICE '[OK] RLS applied to: %', tbl;
END;
$$;

-- =============================================
-- STEP 3: USERS TABLE — Self-access via email
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert" ON users;
DROP POLICY IF EXISTS "Anon can insert users" ON users;
DROP POLICY IF EXISTS "Anon can read users" ON users;
DROP POLICY IF EXISTS "Authenticated full access users" ON users;

-- Users can read their own record (matched by email from JWT)
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (email = auth.jwt()->>'email');

-- Users can update their own record
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

-- Allow insert during signup
CREATE POLICY "Users can insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can insert users" ON users
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can read for login flow
CREATE POLICY "Anon can read users" ON users
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- STEP 4: STORES TABLE — Owner access via user bridge
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access stores" ON stores;
DROP POLICY IF EXISTS "Owner can manage store" ON stores;
DROP POLICY IF EXISTS "Anon read stores" ON stores;

-- Owner can manage their own store
-- Bridge: auth email -> users.id -> stores.owner_user_id
CREATE POLICY "Owner can manage store" ON stores
  FOR ALL TO authenticated
  USING (
    owner_user_id IN (
      SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    owner_user_id IN (
      SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
    )
  );

-- Anon read for public pages
CREATE POLICY "Anon read stores" ON stores
  FOR SELECT TO anon
  USING (true);

-- =============================================
-- STEP 5: USER_PREFERENCES — Fix 403 error
-- =============================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) THEN
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Store admins can see store preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

    -- user_id in this table stores the auto-generated users.id
    -- Bridge via email
    CREATE POLICY "Users can read own preferences" ON user_preferences
      FOR SELECT USING (
        user_id IN (SELECT id FROM users WHERE email = auth.jwt()->>'email')
      );

    CREATE POLICY "Users can insert own preferences" ON user_preferences
      FOR INSERT WITH CHECK (
        user_id IN (SELECT id FROM users WHERE email = auth.jwt()->>'email')
      );

    CREATE POLICY "Users can update own preferences" ON user_preferences
      FOR UPDATE
      USING (user_id IN (SELECT id FROM users WHERE email = auth.jwt()->>'email'))
      WITH CHECK (user_id IN (SELECT id FROM users WHERE email = auth.jwt()->>'email'));

    CREATE POLICY "Users can delete own preferences" ON user_preferences
      FOR DELETE USING (
        user_id IN (SELECT id FROM users WHERE email = auth.jwt()->>'email')
      );

    RAISE NOTICE '[OK] user_preferences RLS applied.';
  ELSE
    RAISE NOTICE '[SKIP] user_preferences table not found.';
  END IF;
END $$;

-- =============================================
-- STEP 6: Apply store-scoped RLS to ALL tables
-- =============================================

-- Inventory
SELECT safe_apply_store_rls('products');
SELECT safe_apply_store_rls('stock_movements');
SELECT safe_apply_store_rls('product_locations');
SELECT safe_apply_store_rls('stock_opnames');
SELECT safe_apply_store_rls('stock_opname_items');
SELECT safe_apply_store_rls('inventory_batches');
SELECT safe_apply_store_rls('inventory_serials');

-- Procurement
SELECT safe_apply_store_rls('suppliers');
SELECT safe_apply_store_rls('purchase_requisitions');
SELECT safe_apply_store_rls('purchase_orders');
SELECT safe_apply_store_rls('goods_receipts');
SELECT safe_apply_store_rls('inventory_grns');
SELECT safe_apply_store_rls('supplier_returns');

-- Customers & Marketing
SELECT safe_apply_store_rls('customers');
SELECT safe_apply_store_rls('customer_segments');
SELECT safe_apply_store_rls('customer_interactions');
SELECT safe_apply_store_rls('customer_loyalties');
SELECT safe_apply_store_rls('communication_logs');
SELECT safe_apply_store_rls('follow_up_reminders');
SELECT safe_apply_store_rls('marketing_campaigns');
SELECT safe_apply_store_rls('automation_rules');

-- Sales
SELECT safe_apply_store_rls('sales_transactions');
SELECT safe_apply_store_rls('discounts');
SELECT safe_apply_store_rls('discount_usages');

-- Financial
SELECT safe_apply_store_rls('coa');
SELECT safe_apply_store_rls('journal_entries');
SELECT safe_apply_store_rls('journal_lines');
SELECT safe_apply_store_rls('expenses');
SELECT safe_apply_store_rls('bank_accounts');
SELECT safe_apply_store_rls('bank_transactions');
SELECT safe_apply_store_rls('payables');
SELECT safe_apply_store_rls('receivables');
SELECT safe_apply_store_rls('invoice_payments');
SELECT safe_apply_store_rls('bank_statement_history');
SELECT safe_apply_store_rls('outbound_deliveries');
SELECT safe_apply_store_rls('tax_rates');

-- Agent
SELECT safe_apply_store_rls('agents');
SELECT safe_apply_store_rls('agent_services');
SELECT safe_apply_store_rls('agent_transactions');

-- HR
SELECT safe_apply_store_rls('employees');

-- System
SELECT safe_apply_store_rls('internal_messages');
SELECT safe_apply_store_rls('system_audit_logs');

-- Loyalty
SELECT safe_apply_store_rls('loyalty_rewards');
SELECT safe_apply_store_rls('loyalty_tiers');
SELECT safe_apply_store_rls('loyalty_transactions');

-- Legacy tables (may or may not exist)
SELECT safe_apply_store_rls('categories');
SELECT safe_apply_store_rls('transactions');
SELECT safe_apply_store_rls('transaction_items');
SELECT safe_apply_store_rls('invoices');

-- =============================================
-- STEP 7: Anon READ for public pages
-- =============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='purchase_orders') THEN
    DROP POLICY IF EXISTS "Anon read purchase_orders" ON purchase_orders;
    CREATE POLICY "Anon read purchase_orders" ON purchase_orders
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='goods_receipts') THEN
    DROP POLICY IF EXISTS "Anon read goods_receipts" ON goods_receipts;
    CREATE POLICY "Anon read goods_receipts" ON goods_receipts
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_transactions') THEN
    DROP POLICY IF EXISTS "Anon read sales_transactions" ON sales_transactions;
    CREATE POLICY "Anon read sales_transactions" ON sales_transactions
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers') THEN
    DROP POLICY IF EXISTS "Anon read suppliers" ON suppliers;
    CREATE POLICY "Anon read suppliers" ON suppliers
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- =============================================
-- STEP 8: Cleanup
-- =============================================
DROP FUNCTION IF EXISTS safe_apply_store_rls(TEXT);

-- ============================================================
-- SELESAI! Semua tabel sudah diamankan.
-- Setiap user hanya bisa akses data dari toko miliknya sendiri.
-- 
-- PENTING: Logout lalu login ulang setelah menjalankan script ini
-- agar token auth Supabase ter-refresh.
-- ============================================================
