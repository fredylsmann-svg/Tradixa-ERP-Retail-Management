-- ============================================================
-- 076: ROLLBACK TOTAL — Kembalikan semua RLS ke kondisi semula
-- ============================================================
-- Script ini menghapus SEMUA policy yang dibuat oleh migration
-- 070-075 dan mengembalikan ke policy open `USING (true)`.
-- 
-- RLS tetap AKTIF (required by Supabase) tapi policy-nya open.
-- Keamanan build (hash filenames, security headers) TETAP aktif.
-- ============================================================

-- =============================================
-- STEP 1: Drop helper functions
-- =============================================
DROP FUNCTION IF EXISTS get_user_store_id();
DROP FUNCTION IF EXISTS get_my_store_id_text();
DROP FUNCTION IF EXISTS safe_apply_store_rls(TEXT);

-- =============================================
-- STEP 2: Reset ALL tables to open policies
-- =============================================
DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
BEGIN
  -- Loop through ALL public tables
  FOR tbl IN 
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- Enable RLS (keep it on for Supabase)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    
    -- Drop ALL existing policies on this table
    FOR pol IN 
      SELECT policyname FROM pg_policies 
      WHERE tablename = tbl.tablename AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.tablename);
    END LOOP;
    
    -- Create simple open policies (same as original)
    EXECUTE format(
      'CREATE POLICY "Authenticated full access %I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl.tablename, tbl.tablename
    );
    
    -- Anon read access (for public pages)
    EXECUTE format(
      'CREATE POLICY "Anon read %I" ON %I FOR SELECT TO anon USING (true)',
      tbl.tablename, tbl.tablename
    );
    
    RAISE NOTICE '[OK] Reset: %', tbl.tablename;
  END LOOP;
END $$;

-- =============================================
-- STEP 3: Special handling for users table
-- =============================================
-- Users juga perlu anon INSERT (untuk signup & staff invite)
DROP POLICY IF EXISTS "Anon insert users" ON users;
CREATE POLICY "Anon insert users" ON users
  FOR INSERT TO anon WITH CHECK (true);

-- =============================================
-- STEP 4: Verify
-- =============================================
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ============================================================
-- SELESAI! Semua tabel kembali ke kondisi semula.
-- Sistem berjalan normal seperti sebelum migration 070-075.
--
-- Keamanan yang TETAP aktif:
-- ✅ Vite build: hash filenames, no console.log
-- ✅ Vercel: security headers (HSTS, XSS, etc.)
-- ✅ Supabase Auth: login/signup tetap aman
-- ✅ HTTPS/TLS: semua traffic terenkripsi
--
-- Yang di-rollback:
-- ↩️ RLS policies → kembali ke USING (true)
-- ============================================================
