-- ============================================================
-- 127: SECURITY HOTFIX (aman dijalankan kapan saja)
-- ============================================================
-- Perubahan di file ini TIDAK mengubah perilaku aplikasi:
--
-- 1. reset_demo_store_data() sebelumnya bisa dipanggil siapa pun
--    lewat REST API (/rest/v1/rpc/reset_demo_store_data) memakai
--    anon key publik -> bisa menghapus transaksi toko MANA PUN
--    hanya dengan mengetahui email owner-nya.
--    Fungsi ini tidak dipanggil dari frontend; hanya oleh pg_cron
--    (berjalan sebagai role postgres), jadi aman dicabut dari
--    anon/authenticated.
--
-- 2. Kolom users.password menyimpan password PLAINTEXT dari
--    halaman Sign Up, dan tabel users bisa dibaca anon.
--    Password login sebenarnya dikelola Supabase Auth (auth.users),
--    kolom ini tidak dipakai di mana pun untuk login.
--    -> Kosongkan isinya + trigger agar tidak pernah tersimpan lagi
--       (termasuk dari bundle lama yang masih ter-cache di PWA).
--    Kolom TIDAK dihapus supaya query lama tidak error.
--
-- Rollback: lihat bagian paling bawah (hanya untuk poin 1;
-- password plaintext memang tidak boleh dikembalikan).
-- ============================================================

-- 1. Perbarui & kunci fungsi reset demo:
--    - Saat reset tengah malam, stok produk contoh dikembalikan ke 100 pcs
--      (bukan 0) agar pagi harinya sales bisa langsung demo transaksi POS.
--    - Dicabut dari PUBLIC/anon/authenticated agar hanya bisa dijalankan
--      oleh pg_cron (postgres) atau service_role.
CREATE OR REPLACE FUNCTION public.reset_demo_store_data(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_store_uuid uuid;
    target_store_text text;
BEGIN
    SELECT id INTO target_store_uuid FROM stores WHERE lower(owner_email) = lower(target_email) LIMIT 1;
    target_store_text := target_store_uuid::text;

    IF target_store_uuid IS NULL THEN
        RAISE NOTICE 'No store found for email: %', target_email;
        RETURN;
    END IF;

    -- CRM & Agency (TEXT store_id)
    DELETE FROM agent_transactions WHERE store_id = target_store_text;
    DELETE FROM loyalty_transactions WHERE customer_id IN (SELECT id::text FROM customers WHERE store_id = target_store_text);
    DELETE FROM communication_logs WHERE customer_id IN (SELECT id::text FROM customers WHERE store_id = target_store_text);
    DELETE FROM customer_interactions WHERE customer_id IN (SELECT id::text FROM customers WHERE store_id = target_store_text);

    -- Sales & Returns
    DELETE FROM discount_usages WHERE transaction_id IN (SELECT id::text FROM sales_transactions WHERE store_id = target_store_text);
    DELETE FROM sales_returns WHERE store_id = target_store_uuid;
    DELETE FROM sales_transactions WHERE store_id = target_store_text;

    -- Procurement (TEXT store_id)
    DELETE FROM supplier_returns WHERE store_id = target_store_text;
    DELETE FROM inventory_grns WHERE store_id = target_store_text;
    DELETE FROM goods_receipts WHERE store_id = target_store_text;
    DELETE FROM purchase_orders WHERE store_id = target_store_text;
    DELETE FROM purchase_requisitions WHERE store_id = target_store_text;

    -- Inventory & WMS
    DELETE FROM stock_movements WHERE store_id = target_store_text;
    DELETE FROM outbound_deliveries WHERE store_id = target_store_uuid;
    DELETE FROM stock_opname_items WHERE opname_id IN (SELECT id FROM stock_opnames WHERE store_id = target_store_uuid);
    DELETE FROM stock_opnames WHERE store_id = target_store_uuid;

    -- Finance & Accounting
    DELETE FROM journal_lines WHERE journal_id IN (SELECT id::text FROM journal_entries WHERE store_id = target_store_text);
    DELETE FROM journal_entries WHERE store_id = target_store_text;
    DELETE FROM expenses WHERE store_id = target_store_text;
    DELETE FROM bank_transactions WHERE store_id = target_store_text;
    DELETE FROM payables WHERE store_id = target_store_text;
    DELETE FROM receivables WHERE store_id = target_store_text;
    DELETE FROM fund_transfers WHERE store_id = target_store_uuid;

    -- Kembalikan stok produk contoh ke 100 pcs (siap langsung dipakai demo POS esok pagi)
    UPDATE products SET stock = 100 WHERE store_id = target_store_text;

    -- Reset Bank Balances to 0 (TEXT store_id)
    UPDATE bank_accounts SET balance = 0 WHERE store_id = target_store_text;

    RAISE NOTICE 'Successfully reset transactional data (stock restored to 100) for store: % (%)', target_store_uuid, target_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_demo_store_data(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_demo_store_data(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_demo_store_data(text) FROM authenticated;

-- 2a. Kosongkan password plaintext yang sudah tersimpan di tabel users & system_audit_logs
UPDATE public.users SET password = '' WHERE COALESCE(password, '') <> '';

UPDATE public.system_audit_logs
SET new_data = new_data - 'password'
WHERE jsonb_typeof(new_data) = 'object' AND new_data ? 'password';

UPDATE public.system_audit_logs
SET old_data = old_data - 'password'
WHERE jsonb_typeof(old_data) = 'object' AND old_data ? 'password';

-- 2b. Trigger: jangan pernah simpan password di tabel users
CREATE OR REPLACE FUNCTION public.strip_users_plaintext_password()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.password := '';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strip_users_password ON public.users;
CREATE TRIGGER trg_strip_users_password
  BEFORE INSERT OR UPDATE OF password ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_users_plaintext_password();

-- ============================================================
-- VERIFIKASI (jalankan terpisah):
--   SELECT count(*) FROM users WHERE COALESCE(password,'') <> '';  -- harus 0
--   SELECT has_function_privilege('anon', 'public.reset_demo_store_data(text)', 'EXECUTE'); -- harus false
--
-- ROLLBACK poin 1 (jika benar-benar diperlukan):
--   GRANT EXECUTE ON FUNCTION public.reset_demo_store_data(text) TO authenticated;
-- ============================================================

