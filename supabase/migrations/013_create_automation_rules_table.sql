-- ============================================================
-- 013_create_automation_rules_table.sql
-- Membuat tabel untuk aturan automasi marketing
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id),
    rule_name TEXT NOT NULL,
    trigger TEXT NOT NULL, -- 'New Customer', 'Birthday', dsb
    message_template TEXT,
    is_active BOOLEAN DEFAULT true,
    total_executions INTEGER DEFAULT 0,
    last_run TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Masukkan aturan default jika belum ada
INSERT INTO marketing_automation_rules (rule_name, trigger, message_template, is_active)
VALUES ('Welcome Message', 'New Customer', 'Halo {{name}}, terima kasih telah bergabung!', true);
