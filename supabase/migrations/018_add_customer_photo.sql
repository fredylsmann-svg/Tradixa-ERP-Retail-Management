-- 018_add_customer_photo.sql
-- Menambahkan kolom photo_url ke tabel customers

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
