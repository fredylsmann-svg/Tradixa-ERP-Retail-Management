-- ============================================================
-- PRODUCTION CLEANUP: Hapus Semua Kecuali Akun Dev
-- ============================================================
-- Script ini akan:
-- 1. Menghapus SEMUA data transaksi & operasional (jadi 0)
-- 2. Menghapus SEMUA akun 'users' SELAIN dev@tradixa.com
-- 3. Menghapus SEMUA 'stores' (toko) SELAIN milik dev@tradixa.com
-- ============================================================

-- Matikan trigger sementara agar foreign key tidak error saat proses
SET session_replication_role = 'replica';

-- 1. Hapus SEMUA data transaksi, log, dan master data
TRUNCATE TABLE 
  communication_logs,
  customer_interactions,
  invoice_payments,
  journal_lines,
  journal_entries,
  bank_transactions,
  bank_statement_history,
  sales_transactions,
  stock_movements,
  stock_opname_items,
  stock_opnames,
  inventory_grns,
  inventory_batches,
  inventory_serials,
  product_locations,
  outbound_deliveries,
  pick_lists,
  warehouse_transfers,
  supplier_returns,
  goods_receipts,
  purchase_orders,
  purchase_requisitions,
  marketing_campaigns,
  marketing_automation_rules,
  internal_messages,
  system_audit_logs,
  payables,
  receivables,
  expenses,
  products,
  customers,
  customer_segments,
  suppliers,
  bank_accounts,
  chart_of_accounts,
  employees,
  tax_rates,
  subscriptions
CASCADE;

-- 2. Hapus User Preferences (pengaturan akun) selain milik dev
DELETE FROM user_preferences 
WHERE user_id IN (
  SELECT id FROM users WHERE email != 'dev@tradixa.com'
);

-- 3. Hapus data Toko (stores) selain toko milik dev
DELETE FROM stores 
WHERE id NOT IN (
  SELECT current_store_id FROM users WHERE email = 'dev@tradixa.com' AND current_store_id IS NOT NULL
);

-- 4. Hapus data Profil Akun (users) selain dev
DELETE FROM users 
WHERE email != 'dev@tradixa.com';

-- Nyalakan trigger kembali
SET session_replication_role = 'origin';

-- ============================================================
-- SELESAI!
-- Akun dev@tradixa.com dan tokonya tetap aman.
-- Semua transaksi di toko dev juga sudah direset jadi 0.
-- Semua toko/akun lain telah terhapus.
-- ============================================================
