-- 1. Tambah kolom statistik jika belum ada
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS opened_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicked_count INTEGER DEFAULT 0;

-- 2. Fungsi untuk menambah hitungan dibuka (RPC)
CREATE OR REPLACE FUNCTION increment_campaign_opens(campaign_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE marketing_campaigns
    SET opened_count = opened_count + 1
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql;
