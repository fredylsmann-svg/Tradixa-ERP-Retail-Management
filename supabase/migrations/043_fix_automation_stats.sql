-- 043_fix_automation_stats.sql
-- Memperbaiki statistik dan tracking untuk kampanye otomatis (Welcome Email)
-- Fix Professional: Menangani perbedaan tipe data (UUID vs TEXT) pada setiap tabel secara presisi

CREATE OR REPLACE FUNCTION trigger_welcome_email_on_new_customer()
RETURNS TRIGGER AS $$
DECLARE
    store_record RECORD;
    campaign_id UUID;
BEGIN
    -- 1. Ambil data toko (stores.id adalah UUID)
    -- NEW.store_id dari tabel customers adalah TEXT, jadi harus di-cast ke UUID
    SELECT * INTO store_record FROM stores WHERE id = NEW.store_id::uuid;
    
    -- 2. Generate UUID untuk kampanye baru
    campaign_id := uuid_generate_v4();
    
    -- 3. Masukkan record pengiriman ke marketing_campaigns
    -- Berdasarkan audit schema: 
    -- - store_id di marketing_campaigns adalah TEXT
    -- - customer_id di marketing_campaigns adalah UUID (dari migration 010)
    INSERT INTO marketing_campaigns (
        id,
        store_id,
        campaign_name,
        campaign_type,
        trigger_type,
        customer_id,
        subject,
        message_content,
        status,
        is_automated,
        sent_count
    ) VALUES (
        campaign_id,
        NEW.store_id,        -- TEXT
        'Welcome Email - ' || NEW.name,
        'Email',
        'New Customer',
        NEW.id::uuid,        -- CAST KE UUID (Penting!)
        'Selamat Datang di ' || COALESCE(store_record.store_name, 'Tradixa Store'),
        'Halo ' || NEW.name || ', terima kasih telah bergabung dengan kami. Kami sangat senang Anda menjadi bagian dari pelanggan kami!',
        'Running',
        true,
        1
    );

    -- 4. UPDATE STATISTIK DI TABEL automation_rules (store_id adalah TEXT)
    UPDATE automation_rules
    SET 
        total_executions = COALESCE(total_executions, 0) + 1,
        last_run = NOW(),
        sent_count = COALESCE(sent_count, 0) + 1
    WHERE trigger = 'New Customer' 
    AND is_active = true 
    AND store_id = NEW.store_id; -- TEXT = TEXT

    -- 5. UPDATE STATISTIK DI TABEL marketing_automation_rules (store_id adalah UUID)
    UPDATE marketing_automation_rules
    SET 
        total_executions = COALESCE(total_executions, 0) + 1,
        last_run = NOW()
    WHERE trigger = 'New Customer' 
    AND is_active = true 
    AND store_id = NEW.store_id::uuid; -- CAST KE UUID

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback agar proses insert customer tidak gagal total jika terjadi error di automasi
    -- Log error bisa dilihat di PostgreSQL logs
    RAISE WARNING 'Gagal mengirim welcome email otomatis: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

