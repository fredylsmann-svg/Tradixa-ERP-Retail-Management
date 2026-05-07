-- Migration: 061_add_timestamp_wib_to_journal_entries.sql
-- Description: Add timestamp_wib and total_amount to journal_entries for consistency

ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS timestamp_wib TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';

COMMENT ON COLUMN journal_entries.timestamp_wib IS 'Timestamp format WIB untuk pelaporan';
COMMENT ON COLUMN journal_entries.total_amount IS 'Total nilai transaksi jurnal';
COMMENT ON COLUMN journal_entries.reference IS 'Nomor referensi dokumen (PO, Sales, Return, dll)';
