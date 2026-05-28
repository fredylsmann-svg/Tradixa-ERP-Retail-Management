-- Add internal_note column to sales_transactions for cashier staff notes
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS internal_note TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sales_transactions.internal_note IS 'Catatan internal kasir (tidak tercetak di struk)';
