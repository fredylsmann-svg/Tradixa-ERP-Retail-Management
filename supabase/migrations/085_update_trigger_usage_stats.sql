-- ============================================================
-- 085: UPDATE TRIGGER — Automasi juga increment usage_stats
-- ============================================================
-- Memperbarui fungsi trigger_welcome_email_on_new_customer 
-- agar setiap email otomatis juga tercatat di usage_stats
-- ============================================================

-- Pastikan kolom usage_stats sudah ada dengan default baru untuk monthly reset
ALTER TABLE stores ADD COLUMN IF NOT EXISTS usage_stats JSONB DEFAULT '{"email_sent_count": 0, "wa_sent_count": 0, "monthly_email_count": 0, "email_reset_date": null}'::jsonb;
UPDATE stores SET usage_stats = usage_stats || '{"monthly_email_count": 0, "email_reset_date": null}'::jsonb WHERE NOT usage_stats ? 'monthly_email_count';

-- Update trigger agar juga increment usage_stats
CREATE OR REPLACE FUNCTION trigger_welcome_email_on_new_customer()
RETURNS TRIGGER AS $$
DECLARE
    store_record RECORD;
    campaign_id UUID;
    current_usage JSONB;
    current_email_count INTEGER;
    is_trial BOOLEAN;
BEGIN
    -- 1. Ambil data toko
    SELECT * INTO store_record FROM stores WHERE id = NEW.store_id::uuid;
    
    -- 2. CEK LIMIT EMAIL SEBELUM KIRIM
    current_usage := COALESCE(store_record.usage_stats, '{"email_sent_count": 0, "wa_sent_count": 0, "monthly_email_count": 0, "email_reset_date": null}'::jsonb);
    current_email_count := COALESCE((current_usage->>'email_sent_count')::integer, 0);
    is_trial := COALESCE(store_record.plan, 'free') = 'pro' AND COALESCE(store_record.has_used_trial, false);

    -- Free plan: tidak bisa kirim email
    IF COALESCE(store_record.plan, 'free') = 'free' THEN
        RETURN NEW;
    END IF;

    -- Trial: limit 5 email total
    IF is_trial AND current_email_count >= 5 THEN
        RAISE WARNING 'Email limit tercapai (trial: 5). Welcome email tidak dikirim.';
        RETURN NEW;
    END IF;

    -- Pro & Premium paid: limit 50 & 300 per bulan (cek monthly_email_count)
    IF COALESCE(store_record.plan, 'free') IN ('pro', 'premium') AND NOT is_trial THEN
        DECLARE
            monthly_count INTEGER;
            reset_date TIMESTAMPTZ;
            email_limit INTEGER;
        BEGIN
            IF store_record.plan = 'premium' THEN
                email_limit := 300;
            ELSE
                email_limit := 50;
            END IF;

            monthly_count := COALESCE((current_usage->>'monthly_email_count')::integer, 0);
            IF current_usage->>'email_reset_date' IS NOT NULL THEN
                reset_date := (current_usage->>'email_reset_date')::timestamptz;
                -- Reset jika bulan berbeda
                IF EXTRACT(MONTH FROM reset_date) != EXTRACT(MONTH FROM NOW()) 
                   OR EXTRACT(YEAR FROM reset_date) != EXTRACT(YEAR FROM NOW()) THEN
                    monthly_count := 0;
                END IF;
            END IF;
            IF monthly_count >= email_limit THEN
                RAISE WARNING 'Email limit bulanan tercapai. Welcome email tidak dikirim.';
                RETURN NEW;
            END IF;
        END;
    END IF;

    -- 3. Generate UUID untuk kampanye baru
    campaign_id := uuid_generate_v4();
    
    -- 4. Masukkan record pengiriman ke marketing_campaigns
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
        NEW.store_id,
        'Welcome Email - ' || NEW.name,
        'Email',
        'New Customer',
        NEW.id::uuid,
        'Selamat Datang di ' || COALESCE(store_record.store_name, 'Tradixa Store'),
        'Halo ' || NEW.name || ', terima kasih telah bergabung dengan kami. Kami sangat senang Anda menjadi bagian dari pelanggan kami!',
        'Running',
        true,
        1
    );

    -- 5. UPDATE STATISTIK DI TABEL automation_rules (store_id adalah TEXT)
    UPDATE automation_rules
    SET 
        total_executions = COALESCE(total_executions, 0) + 1,
        last_run = NOW(),
        sent_count = COALESCE(sent_count, 0) + 1
    WHERE trigger = 'New Customer' 
    AND is_active = true 
    AND store_id = NEW.store_id;

    -- 6. UPDATE STATISTIK DI TABEL marketing_automation_rules (store_id adalah UUID)
    UPDATE marketing_automation_rules
    SET 
        total_executions = COALESCE(total_executions, 0) + 1,
        last_run = NOW()
    WHERE trigger = 'New Customer' 
    AND is_active = true 
    AND store_id = NEW.store_id::uuid;

    -- 7. INCREMENT USAGE STATS
    UPDATE stores 
    SET usage_stats = jsonb_set(
        jsonb_set(
            current_usage, 
            '{email_sent_count}', 
            to_jsonb(current_email_count + 1)
        ),
        '{monthly_email_count}',
        to_jsonb(COALESCE((current_usage->>'monthly_email_count')::integer, 0) + 1)
    )
    WHERE id = NEW.store_id::uuid;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Gagal mengirim welcome email otomatis: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
