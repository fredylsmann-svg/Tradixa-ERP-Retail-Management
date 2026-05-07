-- Migration: 008_add_title_color_to_stores.sql
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS title_color TEXT DEFAULT '#0f172a';

COMMENT ON COLUMN stores.title_color IS 'Warna teks judul utama pada dokumen (Invoice, PO, DO)';
