-- ============================================================
-- 089: RLS HARDENING — WMS Tables & Subscriptions
-- ============================================================
-- Tabel yang di-cover:
--   1. pick_lists         (UNRESTRICTED → store-scoped)
--   2. warehouse_transfers (UNRESTRICTED → store-scoped)
--   3. subscriptions       (fallback open → store-scoped)
--
-- Pola: Sama persis dengan Step 6 di 077_secure_rls.sql
-- Rollback: DROP POLICY lalu disable RLS jika ada masalah
-- ============================================================

-- ============================================================
-- STEP 1: Enable RLS pada tabel yang belum aktif
-- ============================================================
ALTER TABLE pick_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;
-- subscriptions sudah RLS enabled dari catch-all 077, tapi policy-nya open

-- ============================================================
-- STEP 2: Hapus fallback policy lama di subscriptions (jika ada)
-- ============================================================
DROP POLICY IF EXISTS "Fallback auth subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Fallback anon subscriptions" ON subscriptions;

-- ============================================================
-- STEP 3: Buat store-scoped policy untuk ketiga tabel
-- ============================================================

-- 3a. pick_lists (store_id UUID)
CREATE POLICY "Store scope pick_lists" ON pick_lists
  FOR ALL TO authenticated
  USING (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  );

-- 3b. warehouse_transfers (store_id UUID)
CREATE POLICY "Store scope warehouse_transfers" ON warehouse_transfers
  FOR ALL TO authenticated
  USING (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  );

-- 3c. subscriptions (store_id UUID)
CREATE POLICY "Store scope subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  );

-- ============================================================
-- CATATAN PENTING:
-- ============================================================
-- • Mayar Webhook menggunakan SERVICE_ROLE_KEY yang bypass RLS
--   → insert ke subscriptions TIDAK akan terganggu
-- • Frontend selalu filter dengan store_id → query tetap jalan
-- • Pola policy identik dengan 30+ tabel lain di 077
-- ============================================================
