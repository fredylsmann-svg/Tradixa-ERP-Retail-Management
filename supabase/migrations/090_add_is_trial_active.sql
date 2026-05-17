-- ============================================================
-- 090: EXPLICIT TRIAL TRACKING
-- ============================================================
-- Menambahkan kolom `is_trial_active` pada tabel stores untuk
-- membedakan secara tegas antara "Paket Trial Pro" dan 
-- "Paket Pro Berbayar".
-- ============================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT FALSE;
