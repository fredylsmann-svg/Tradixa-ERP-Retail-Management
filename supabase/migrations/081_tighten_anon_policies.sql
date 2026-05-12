-- ============================================================
-- 081: TIGHTEN ANON POLICIES — Hapus anon read yang tidak diperlukan
-- ============================================================
-- Alasan: Tabel products dan sales_transactions tidak digunakan
-- oleh portal publik manapun (PO Sign, GRN Sign, Return Review).
-- Menghapus anon read mencegah data bisa di-dump via Postman
-- tanpa login.
--
-- Rollback: Jalankan 081_rollback_tighten_anon.sql
-- ============================================================

-- 1. Hapus anon read dari sales_transactions
-- (Webhook Mayar menggunakan SERVICE_ROLE_KEY, tidak terpengaruh RLS)
DROP POLICY IF EXISTS "Anon read sales_transactions" ON sales_transactions;

-- 2. Hapus anon read dari products
-- (Portal publik tidak query tabel products secara langsung,
--  data produk sudah embedded di JSONB items pada PO/GRN/Return)
DROP POLICY IF EXISTS "Anon read products" ON products;

-- ============================================================
-- CATATAN: bank_accounts TETAP anon read karena digunakan oleh
-- PublicReturnReview.jsx untuk menampilkan info rekening toko.
-- ============================================================

-- Verifikasi: Tampilkan policy anon yang tersisa
-- Jalankan query ini secara terpisah untuk cek:
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public' AND policyname LIKE 'Anon%' ORDER BY tablename;
