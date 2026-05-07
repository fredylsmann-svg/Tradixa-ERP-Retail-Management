-- Menambahkan kolom customer_name yang hilang untuk sinkronisasi data yang lebih baik
-- Sesuai dengan error PGRST204 yang dilaporkan user

-- 1. Tambah ke tabel customer_loyalties
ALTER TABLE customer_loyalties ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 2. Tambah ke tabel discount_usages
ALTER TABLE discount_usages ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 3. Tambah ke tabel loyalty_tiers (memastikan kolom diskon ada)
ALTER TABLE loyalty_tiers ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0;
ALTER TABLE loyalty_tiers ADD COLUMN IF NOT EXISTS points_multiplier NUMERIC DEFAULT 1;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
