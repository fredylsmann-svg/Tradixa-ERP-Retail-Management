-- Migration 101: Enable RLS for Sales Returns
-- Langkah 1: Enable RLS via tombol "Enable RLS for this table" di Table Editor Supabase (SUDAH)
-- Langkah 2: Jalankan SQL ini di SQL Editor

CREATE POLICY "Store scope sales_returns" ON sales_returns
  FOR ALL TO authenticated
  USING (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  )
  WITH CHECK (
    store_id::TEXT IN (
      SELECT current_store_id::TEXT FROM users 
      WHERE email = auth.jwt()->>'email'
    )
  );
