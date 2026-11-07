-- ============================================================
-- 129: TUTUP AKSES ANONIM KE TABEL USERS
-- ============================================================
-- ⚠️ JALANKAN SETELAH frontend versi baru (undangan token) sudah
--    di-deploy dan diuji. Frontend lama memakai akses anon ini.
--
-- Sebelumnya (migration 077):
--   "Users: anon select" -> siapa pun tanpa login bisa membaca
--                           SELURUH tabel users (email, nama, HP,
--                           role, toko) memakai anon key publik.
--   "Users: anon insert" -> siapa pun tanpa login bisa membuat
--                           baris users dengan store_id & role bebas
--                           (dipakai halaman /register versi lama).
--
-- Pengganti di frontend baru:
--   - Cek email terdaftar  -> RPC is_email_registered()
--   - Daftar via undangan  -> RPC get_store_invitation() + accept_store_invitation()
--   - Sign Up owner        -> insert dilakukan setelah login (authenticated)
--
-- Rollback: supabase/rollbacks/129_rollback_users_anon_policies.sql
-- ============================================================

DROP POLICY IF EXISTS "Users: anon select" ON public.users;
DROP POLICY IF EXISTS "Users: anon insert" ON public.users;

-- ============================================================
-- VERIFIKASI (jalankan terpisah):
--   SELECT policyname, roles, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'users';
--   -> tidak boleh ada policy untuk role {anon}
-- ============================================================

