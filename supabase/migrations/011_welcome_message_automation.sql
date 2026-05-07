-- ============================================================
-- 011_welcome_message_automation.sql
-- Mengirim email selamat datang otomatis ke customer baru
-- ============================================================

-- 1. Fungsi untuk membuat kampanye welcome otomatis
CREATE OR REPLACE FUNCTION trigger_welcome_email_on_new_customer()
RETURNS TRIGGER AS $$
BEGIN
    -- Masukkan record pengiriman ke marketing_campaigns
    -- Kita buat sebagai kampanye tipe 'Manual' dengan status 'Running' agar segera diproses
    INSERT INTO marketing_campaigns (
        store_id,
        campaign_name,
        campaign_type,
        trigger_type,
        customer_id,
        subject,
        message_content,
        status,
        is_automated
    ) VALUES (
        NEW.store_id,
        'Welcome Email - ' || NEW.name,
        'Email',
        'New Customer',
        NEW.id,
        'Selamat Datang di ' || (SELECT store_name FROM stores WHERE id = NEW.store_id::uuid),
        'Halo ' || NEW.name || ', terima kasih telah bergabung dengan kami. Kami sangat senang Anda menjadi bagian dari pelanggan kami!',
        'Running',
        true
    );

    -- UPDATE STATISTIK DI TABEL AUTOMASI
    UPDATE marketing_automation_rules
    SET 
        total_executions = total_executions + 1,
        last_run = NOW()
    WHERE trigger = 'New Customer' AND is_active = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Pasang Trigger di tabel customers
DROP TRIGGER IF EXISTS on_customer_created ON customers;
CREATE TRIGGER on_customer_created
AFTER INSERT ON customers
FOR EACH ROW
EXECUTE FUNCTION trigger_welcome_email_on_new_customer();
