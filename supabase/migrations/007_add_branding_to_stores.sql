-- Migration: 007_add_branding_to_stores.sql
-- Menambahkan kolom untuk menyimpan pengaturan Design Studio

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_layout_style TEXT DEFAULT 'Modern',
ADD COLUMN IF NOT EXISTS po_layout_style TEXT DEFAULT 'Modern',
ADD COLUMN IF NOT EXISTS do_layout_style TEXT DEFAULT 'Modern';

-- Memberikan komentar pada kolom untuk dokumentasi
COMMENT ON COLUMN stores.brand_color IS 'Warna tema utama bisnis dari Design Studio';
COMMENT ON COLUMN stores.logo_url IS 'URL logo bisnis yang diunggah';
COMMENT ON COLUMN stores.invoice_layout_style IS 'Gaya desain invoice (Modern/Classic)';
