-- ============================================================
-- PRODUCTION CLEANUP: Bersihkan seluruh data dummy
-- ============================================================
-- Jalankan di Supabase SQL Editor
-- Schema, tabel, RLS, triggers, functions TETAP UTUH
-- Hanya data (baris) yang dihapus
-- ============================================================

-- Matikan trigger sementara agar tidak ada side-effect
SET session_replication_role = 'replica';

-- Hapus SEMUA data di SEMUA tabel public
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl.tablename);
    RAISE NOTICE 'Truncated: %', tbl.tablename;
  END LOOP;
END $$;

-- Nyalakan kembali trigger
SET session_replication_role = 'origin';

-- ============================================================
-- SELESAI! Database bersih, schema utuh, sistem siap produksi.
-- User baru tinggal Sign Up → Store Setup → mulai pakai.
-- ============================================================
