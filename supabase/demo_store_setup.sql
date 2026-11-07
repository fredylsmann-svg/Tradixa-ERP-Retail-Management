-- ============================================================
-- SETUP TOKO DEMO UNTUK SALES (jalankan manual, sekali saja)
-- ============================================================
-- PRASYARAT (lakukan dulu di aplikasi):
--   1. Daftar akun baru lewat halaman Sign Up, misalnya:
--        demo@tradixa.com   (JANGAN dimasukkan ke DEV_EMAILS)
--   2. Login, selesaikan Store Setup (nama toko mis. "Tradixa Demo").
--   3. Isi data contoh (produk, pelanggan, supplier) secukupnya.
--
-- Lalu jalankan script ini di Supabase SQL Editor.
-- Ganti email di bawah jika memakai email lain.
-- ============================================================

-- 1. Cek toko demo ditemukan (harus 1 baris)
SELECT id, store_name, owner_email, plan, has_used_trial, plan_expires_at
FROM stores
WHERE lower(owner_email) = 'demo@tradixa.com';

-- 2. Jadikan Enterprise tanpa masa berlaku (tidak kena auto-downgrade,
--    karena auto_downgrade_expired_plans hanya menyentuh plan_expires_at NOT NULL)
UPDATE stores
SET plan            = 'enterprise',
    has_used_trial  = false,
    plan_started_at = now(),
    plan_expires_at = NULL
WHERE lower(owner_email) = 'demo@tradixa.com';

-- 3. Reset otomatis data transaksi toko demo setiap hari 00:00 WIB (17:00 UTC).
--    Memakai fungsi reset_demo_store_data() (sudah diperbarui di migration 127):
--    - Menghapus semua transaksi harian & meng-nol-kan saldo bank.
--    - Mengembalikan stok semua produk contoh ke 100 pcs (siap demo POS esok pagi).
--    - Data master (produk, pelanggan, supplier, akun sales) tetap utuh.
--
--    Set stok produk contoh ke 100 pcs sekarang juga:
UPDATE products
SET stock = 100
WHERE store_id IN (
  SELECT id::text FROM stores WHERE lower(owner_email) = 'demo@tradixa.com'
);

SELECT cron.unschedule('reset-demo-sales-store')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-demo-sales-store');

SELECT cron.schedule(
  'reset-demo-sales-store',
  '0 17 * * *',
  $sql$ SELECT reset_demo_store_data('demo@tradixa.com'); $sql$
);

-- 4. Verifikasi
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'reset-demo%';

-- ============================================================
-- LANGKAH BERIKUTNYA (di aplikasi, login sebagai demo@tradixa.com):
--   User Management -> Undang User -> isi nama sales, jabatan, role,
--   nomor WA -> "Buat Link Pendaftaran" -> "Kirim via WhatsApp".
--   Ulangi untuk tiap sales (1 link = 1 orang).
--
-- MENONAKTIFKAN SALES YANG KELUAR:
--   User Management -> hapus user tersebut.
-- ============================================================

