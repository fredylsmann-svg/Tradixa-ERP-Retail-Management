-- ============================================================
-- 081 ROLLBACK: Kembalikan anon read policies yang dihapus oleh 081
-- ============================================================
-- Jalankan ini HANYA jika 081_tighten_anon_policies.sql 
-- menyebabkan error pada portal publik.
-- ============================================================

-- Kembalikan anon read untuk sales_transactions
CREATE POLICY "Anon read sales_transactions" ON sales_transactions
  FOR SELECT TO anon USING (true);

-- Kembalikan anon read untuk products
CREATE POLICY "Anon read products" ON products
  FOR SELECT TO anon USING (true);

-- ============================================================
-- SELESAI! Kedua policy anon sudah dikembalikan.
-- ============================================================
