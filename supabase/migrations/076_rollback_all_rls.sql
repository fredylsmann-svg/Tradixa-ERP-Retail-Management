-- ============================================================
-- 076: ROLLBACK TOTAL — Kembalikan semua RLS ke kondisi semula
-- ============================================================

-- STEP 1: Hapus SEMUA policy dulu (baru function bisa di-drop)
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
    RAISE NOTICE 'Dropped all policies on: %', tbl.tablename;
  END LOOP;
END $$;

-- STEP 2: Sekarang drop functions (sudah tidak ada yang depend)
DROP FUNCTION IF EXISTS get_user_store_id();
DROP FUNCTION IF EXISTS get_my_store_id_text();
DROP FUNCTION IF EXISTS safe_apply_store_rls(TEXT);

-- STEP 3: Buat ulang policy open untuk SEMUA tabel
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    
    EXECUTE format(
      'CREATE POLICY "Authenticated full access %I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl.tablename, tbl.tablename
    );
    
    EXECUTE format(
      'CREATE POLICY "Anon read %I" ON %I FOR SELECT TO anon USING (true)',
      tbl.tablename, tbl.tablename
    );
    
    RAISE NOTICE '[OK] Reset: %', tbl.tablename;
  END LOOP;
END $$;

-- STEP 4: Anon INSERT untuk users (signup & staff invite)
DROP POLICY IF EXISTS "Anon insert users" ON users;
CREATE POLICY "Anon insert users" ON users
  FOR INSERT TO anon WITH CHECK (true);

-- SELESAI! Jalankan lalu logout → login ulang.
