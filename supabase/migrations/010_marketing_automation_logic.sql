-- ============================================================
-- 010_marketing_automation_logic.sql
-- Menambahkan target pelanggan dan logika pengiriman otomatis
-- ============================================================

-- 1. Tambah kolom target ke marketing_campaigns
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS is_all_customers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_id UUID;

-- 2. Fungsi untuk memproses kampanye yang terjadwal hari ini
CREATE OR REPLACE FUNCTION process_scheduled_marketing_campaigns()
RETURNS void AS $$
DECLARE
    today_date TEXT;
    campaign_record RECORD;
BEGIN
    -- Ambil tanggal hari ini format YYYY-MM-DD
    today_date := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');

    -- Cari kampanye yang statusnya 'Scheduled' atau 'Draft' (tergantung alur) 
    -- dan tanggalnya adalah hari ini
    FOR campaign_record IN 
        SELECT * FROM marketing_campaigns 
        WHERE schedule_date = today_date 
        AND status IN ('Scheduled', 'Draft')
        AND trigger_type = 'Scheduled'
    LOOP
        -- Di sini kita hanya menandai status menjadi 'Processing' atau 'Running'
        -- Untuk pengiriman email riil, biasanya dipicu via Edge Function / Webhook
        UPDATE marketing_campaigns 
        SET status = 'Running',
            last_run = today_date
        WHERE id = campaign_record.id;
        
        -- Catatan: Logika pengiriman email sebenarnya biasanya dilakukan 
        -- melalui integrasi Supabase Edge Function yang memantau perubahan status ini.
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Instruksi Cron (Opsional jika pg_cron aktif)
-- SELECT cron.schedule('0 9 * * *', 'SELECT process_scheduled_marketing_campaigns()');
