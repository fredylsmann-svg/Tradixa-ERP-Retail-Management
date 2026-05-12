-- ============================================================
-- 083: ADD TRIAL TRACKING
-- ============================================================
-- Menambahkan kolom has_used_trial pada tabel stores untuk
-- melacak apakah toko tersebut sudah pernah menggunakan jatah
-- free trial 14 hari atau belum.
-- ============================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT FALSE;
