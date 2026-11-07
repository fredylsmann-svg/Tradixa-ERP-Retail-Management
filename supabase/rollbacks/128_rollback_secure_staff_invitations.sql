-- ============================================================
-- 128 ROLLBACK: Hapus fitur undangan berbasis token
-- ============================================================
-- Jalankan HANYA jika 128 menimbulkan masalah.
-- PERHATIAN: frontend versi baru membutuhkan fungsi-fungsi ini.
-- Jika di-rollback, deploy ulang frontend versi sebelumnya.
-- ============================================================

DROP FUNCTION IF EXISTS public.create_store_invitation(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.get_store_invitation(TEXT);
DROP FUNCTION IF EXISTS public.accept_store_invitation(TEXT);
DROP FUNCTION IF EXISTS public.is_email_registered(TEXT);
DROP TABLE IF EXISTS public.store_invitations;
