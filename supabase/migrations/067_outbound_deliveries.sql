-- Tambahkan kolom lokasi ke tabel Customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Buat tabel Outbound Deliveries
CREATE TABLE IF NOT EXISTS public.outbound_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sales_transaction_id UUID REFERENCES public.sales_transactions(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    
    tracking_number TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    
    shipping_address TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    distance_km NUMERIC(10, 2) DEFAULT 0,
    shipping_fee NUMERIC(15, 2) DEFAULT 0,
    
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, In Transit, Delivered, Cancelled
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_date DATE DEFAULT CURRENT_DATE,
    updated_date DATE DEFAULT CURRENT_DATE
);

-- Indexing untuk mempercepat pencarian
CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_store ON public.outbound_deliveries(store_id);
CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_status ON public.outbound_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_sales ON public.outbound_deliveries(sales_transaction_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_outbound_deliveries_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    NEW.updated_date = CURRENT_DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_outbound_deliveries_modtime ON public.outbound_deliveries;
CREATE TRIGGER update_outbound_deliveries_modtime
    BEFORE UPDATE ON public.outbound_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_outbound_deliveries_modtime();
