-- ============================================================
-- 082: SUBSCRIPTION LIFECYCLE — Auto-expiry & detail tanggal
-- ============================================================
-- Menambahkan kolom plan_started_at dan fungsi auto-downgrade
-- yang dijalankan oleh pg_cron setiap hari jam 00:00 UTC.
-- 
-- Jika plan_expires_at + 2 hari sudah lewat dan user belum
-- memperpanjang, akun otomatis di-downgrade ke Free Plan.
-- ============================================================

-- 1. Tambah kolom tanggal mulai plan (plan_expires_at sudah ada dari migrasi 035)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;

-- 2. Fungsi auto-downgrade expired plans
CREATE OR REPLACE FUNCTION auto_downgrade_expired_plans()
RETURNS void AS $$
DECLARE
  downgraded_count INTEGER;
BEGIN
  -- Downgrade semua store yang plan_expires_at + 2 hari sudah lewat
  WITH downgraded AS (
    UPDATE stores
    SET plan = 'free',
        plan_started_at = NULL,
        plan_expires_at = NULL
    WHERE plan != 'free'
      AND plan_expires_at IS NOT NULL
      AND plan_expires_at + INTERVAL '2 days' < NOW()
    RETURNING id, plan
  )
  SELECT COUNT(*) INTO downgraded_count FROM downgraded;

  -- Log hasil (bisa dilihat di Supabase Logs)
  IF downgraded_count > 0 THEN
    RAISE NOTICE '[Tradixa CRON] Auto-downgraded % store(s) to Free Plan', downgraded_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Schedule pg_cron job — setiap hari jam 00:00 UTC (07:00 WIB)
-- Hapus job lama jika sudah ada (idempotent)
SELECT cron.unschedule('tradixa-auto-downgrade') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tradixa-auto-downgrade'
);

-- Buat schedule baru
SELECT cron.schedule(
  'tradixa-auto-downgrade',           -- nama job
  '0 0 * * *',                         -- setiap hari jam 00:00 UTC
  'SELECT auto_downgrade_expired_plans()'  -- SQL yang dijalankan
);

-- ============================================================
-- CATATAN:
-- - Cron berjalan di timezone UTC (00:00 UTC = 07:00 WIB)
-- - Grace period: 2 hari setelah expired sebelum downgrade
-- - User bisa memperpanjang kapan saja sebelum downgrade
-- - Setelah downgrade, modul Pro/Enterprise akan terkunci
-- ============================================================
