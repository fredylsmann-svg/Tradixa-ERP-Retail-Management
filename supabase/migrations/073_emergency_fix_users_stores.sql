-- ============================================================
-- 073: Emergency Fix — Restore Users & Stores Access
-- ============================================================
-- Masalah: Policy circular dependency di tabel users menyebabkan
-- SEMUA user tidak bisa login (redirect ke Store Setup).
--
-- Solusi: Gunakan open read untuk users & stores.
-- Data bisnis (produk, transaksi, dll) tetap dilindungi store_id.
-- ============================================================

-- =============================================
-- USERS TABLE
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "auth_users_select" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_users_insert" ON users
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "anon_users_insert" ON users
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "auth_users_update" ON users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

CREATE POLICY "auth_users_delete" ON users
  FOR DELETE TO authenticated
  USING (email = auth.jwt()->>'email');

CREATE POLICY "anon_users_select" ON users
  FOR SELECT TO anon USING (true);

-- =============================================
-- STORES TABLE
-- =============================================
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'stores' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON stores', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "auth_stores_select" ON stores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_stores_insert" ON stores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_stores_update" ON stores
  FOR UPDATE TO authenticated
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

CREATE POLICY "auth_stores_delete" ON stores
  FOR DELETE TO authenticated
  USING (
    owner_user_id IN (
      SELECT id::text FROM users WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "anon_stores_select" ON stores
  FOR SELECT TO anon USING (true);

-- =============================================
-- USER_PREFERENCES TABLE
-- =============================================
DO $$ 
DECLARE pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) THEN
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

    FOR pol IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'user_preferences' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON user_preferences', pol.policyname);
    END LOOP;

    CREATE POLICY "pref_select" ON user_preferences
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "pref_insert" ON user_preferences
      FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "pref_update" ON user_preferences
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "pref_delete" ON user_preferences
      FOR DELETE TO authenticated USING (true);

    RAISE NOTICE '[OK] user_preferences fixed.';
  END IF;
END $$;

-- ============================================================
-- SELESAI! Login kembali normal.
-- Data bisnis TETAP AMAN (store_id scoping dari migration 070).
-- ============================================================
