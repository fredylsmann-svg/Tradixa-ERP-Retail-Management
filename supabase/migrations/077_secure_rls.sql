-- ============================================================
-- 077: SECURE RLS — Multi-Tenant Store Isolation (v3 - Simplified)
-- ============================================================
-- Pendekatan: Inline subquery, tanpa SECURITY DEFINER function
-- Rollback: Jalankan 076_rollback_all_rls.sql jika ada masalah
-- ============================================================

-- ============================================================
-- STEP 1: BERSIHKAN SEMUA POLICY & FUNCTION LAMA
-- ============================================================
DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    FOR pol IN 
      SELECT policyname FROM pg_policies 
      WHERE tablename = tbl.tablename AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.tablename);
    END LOOP;
  END LOOP;
  RAISE NOTICE '[STEP 1] All existing policies dropped.';
END $$;

DROP FUNCTION IF EXISTS get_user_store_id();
DROP FUNCTION IF EXISTS get_my_store_id_text();
DROP FUNCTION IF EXISTS get_my_store_id();
DROP FUNCTION IF EXISTS get_my_email();
DROP FUNCTION IF EXISTS safe_apply_store_rls(TEXT);

-- ============================================================
-- STEP 2: ENABLE RLS DI SEMUA TABEL
-- ============================================================
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
  END LOOP;
  RAISE NOTICE '[STEP 2] RLS enabled on all tables.';
END $$;

-- ============================================================
-- STEP 3: TABEL USERS — Open SELECT untuk authenticated
-- ============================================================
-- Ini KUNCI: users SELECT harus open agar subquery dari tabel lain bisa jalan
-- Tanpa ini, semua policy di tabel lain akan gagal (403)

CREATE POLICY "Users: select all" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users: update same store" ON users
  FOR UPDATE TO authenticated
  USING (
    email = auth.jwt()->>'email'
    OR current_store_id IN (
      SELECT current_store_id FROM users WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    email = auth.jwt()->>'email'
    OR current_store_id IN (
      SELECT current_store_id FROM users WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "Users: auth insert" ON users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users: anon insert" ON users
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Users: anon select" ON users
  FOR SELECT TO anon USING (true);

-- ============================================================
-- STEP 4: TABEL STORES — Open SELECT, scoped modify
-- ============================================================
CREATE POLICY "Stores: auth read" ON stores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Stores: auth insert" ON stores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Stores: auth update own" ON stores
  FOR UPDATE TO authenticated
  USING (
    id::TEXT IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>'email')
  )
  WITH CHECK (
    id::TEXT IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Stores: auth delete own" ON stores
  FOR DELETE TO authenticated
  USING (
    id::TEXT IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>'email')
  );

CREATE POLICY "Stores: anon read" ON stores
  FOR SELECT TO anon USING (true);

-- ============================================================
-- STEP 5: TABEL BISNIS — Store-scoped (store_id TEXT)
-- ============================================================
-- Menggunakan inline subquery: store_id IN (SELECT current_store_id FROM users WHERE email = jwt)

DO $$
DECLARE
  tbl TEXT;
  tables_text TEXT[] := ARRAY[
    'agent_services', 'agent_transactions', 'agents',
    'bank_accounts', 'bank_transactions',
    'coa', 'communication_logs', 'customer_interactions',
    'customer_segments', 'customers', 'discounts',
    'employees', 'expenses', 'follow_up_reminders',
    'goods_receipts', 'inventory_grns', 'invoice_payments',
    'journal_entries', 'marketing_campaigns', 'payables',
    'product_locations', 'products', 'purchase_orders',
    'purchase_requisitions', 'receivables', 'sales_transactions',
    'stock_movements', 'supplier_returns', 'suppliers',
    'system_audit_logs', 'tax_rates'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_text LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "Store scope %I" ON %I FOR ALL TO authenticated USING (store_id IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>''email'')) WITH CHECK (store_id IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>''email''))',
        tbl, tbl
      );
      RAISE NOTICE '[STEP 5] Store-scoped (TEXT): %', tbl;
    ELSE
      RAISE NOTICE '[STEP 5] SKIPPED (not found): %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 6: TABEL BISNIS — Store-scoped (store_id UUID)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables_uuid TEXT[] := ARRAY[
    'bank_statement_history', 'customer_loyalties', 'discount_usages',
    'internal_messages', 'inventory_batches', 'inventory_serials',
    'loyalty_rewards', 'loyalty_tiers', 'marketing_automation_rules',
    'outbound_deliveries', 'stock_opnames', 'user_preferences'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_uuid LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "Store scope %I" ON %I FOR ALL TO authenticated USING (store_id::TEXT IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>''email'')) WITH CHECK (store_id::TEXT IN (SELECT current_store_id::TEXT FROM users WHERE email = auth.jwt()->>''email''))',
        tbl, tbl
      );
      RAISE NOTICE '[STEP 6] Store-scoped (UUID): %', tbl;
    ELSE
      RAISE NOTICE '[STEP 6] SKIPPED (not found): %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 7: TABEL TANPA STORE_ID — Open policies
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables_no_store TEXT[] := ARRAY[
    'journal_lines', 'stock_opname_items', 'loyalty_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_no_store LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format(
        'CREATE POLICY "Auth full access %I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        tbl, tbl
      );
      RAISE NOTICE '[STEP 7] Open policy: %', tbl;
    ELSE
      RAISE NOTICE '[STEP 7] SKIPPED (not found): %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 8: ANON ACCESS — Portal Publik
-- ============================================================

-- Public PO Sign
CREATE POLICY "Anon read purchase_orders" ON purchase_orders
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon update purchase_orders" ON purchase_orders
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Public GRN Sign
CREATE POLICY "Anon read goods_receipts" ON goods_receipts
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon update goods_receipts" ON goods_receipts
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Public Return Review
CREATE POLICY "Anon read supplier_returns" ON supplier_returns
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon update supplier_returns" ON supplier_returns
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Portal data pendukung (hanya tabel yang benar-benar dipakai portal publik)
CREATE POLICY "Anon read suppliers" ON suppliers
  FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read bank_accounts" ON bank_accounts
  FOR SELECT TO anon USING (true);
-- CATATAN: products & sales_transactions TIDAK perlu anon read
-- products: portal menggunakan embedded JSONB items, bukan query terpisah
-- sales_transactions: webhook Mayar menggunakan SERVICE_ROLE_KEY

-- ============================================================
-- STEP 9: CATCH-ALL — Safety net
-- ============================================================
DO $$
DECLARE
  tbl RECORD;
  policy_count INTEGER;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = tbl.tablename AND schemaname = 'public';
    
    IF policy_count = 0 THEN
      EXECUTE format(
        'CREATE POLICY "Fallback auth %I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        tbl.tablename, tbl.tablename
      );
      EXECUTE format(
        'CREATE POLICY "Fallback anon %I" ON %I FOR SELECT TO anon USING (true)',
        tbl.tablename, tbl.tablename
      );
      RAISE NOTICE '[STEP 9] Fallback policy added: %', tbl.tablename;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- SELESAI!
-- ============================================================
-- Rollback: Jalankan 076_rollback_all_rls.sql jika ada masalah
-- ============================================================
