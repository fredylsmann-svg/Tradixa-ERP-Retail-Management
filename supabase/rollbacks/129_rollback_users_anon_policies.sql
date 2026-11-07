-- ============================================================
-- 129 ROLLBACK: Kembalikan akses anon ke tabel users
-- ============================================================
-- Jalankan HANYA jika setelah 129 ada fitur yang error
-- (misalnya masih ada pengguna dengan frontend lama ter-cache).
-- ============================================================

DROP POLICY IF EXISTS "Users: anon select" ON public.users;
DROP POLICY IF EXISTS "Users: anon insert" ON public.users;

CREATE POLICY "Users: anon insert" ON public.users
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Users: anon select" ON public.users
  FOR SELECT TO anon USING (true);

