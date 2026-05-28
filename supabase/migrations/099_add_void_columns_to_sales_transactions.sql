-- Add void/cancel columns to sales_transactions for Cancel/Void Transaction feature
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT NULL;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS voided_by TEXT DEFAULT NULL;

-- Documentation
COMMENT ON COLUMN sales_transactions.void_reason IS 'Alasan pembatalan transaksi';
COMMENT ON COLUMN sales_transactions.voided_at IS 'Waktu transaksi di-void';
COMMENT ON COLUMN sales_transactions.voided_by IS 'User yang melakukan void';
