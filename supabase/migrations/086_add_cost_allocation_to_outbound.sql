-- Add cost_allocation column to outbound_deliveries
-- Values: 'company' (ditanggung toko) or 'customer' (ditagihkan ke customer)
ALTER TABLE outbound_deliveries
ADD COLUMN IF NOT EXISTS cost_allocation TEXT DEFAULT 'company';

COMMENT ON COLUMN outbound_deliveries.cost_allocation IS 'Pembebanan ongkir: company = ditanggung toko, customer = ditagihkan ke customer';
