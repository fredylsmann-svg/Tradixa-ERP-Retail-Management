-- Migration 100: Create Sales Returns Table
-- Deskripsi: Membuat tabel untuk mencatat retur penjualan (Sales Return) dari pelanggan.

CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    sales_transaction_id UUID REFERENCES sales_transactions(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    return_number TEXT NOT NULL UNIQUE,
    returned_items JSONB NOT NULL,
    total_refund NUMERIC NOT NULL,
    refund_method TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Completed',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk mempercepat pencarian berdasarkan store dan invoice
CREATE INDEX IF NOT EXISTS idx_sales_returns_store_id ON sales_returns(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(invoice_number);

-- Tambahkan kolom return_status di sales_transactions jika belum ada
ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT 'None';
