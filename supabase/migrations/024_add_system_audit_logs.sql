-- Create system_audit_logs table
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL,
    user_id TEXT, -- Can be UUID or 'admin'
    user_name TEXT,
    user_email TEXT,
    entity_name TEXT, -- e.g., 'Product', 'Customer'
    entity_id TEXT, -- ID of the record being acted upon
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change', 'email_sent', 'payment'
    description TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    timestamp_wib TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'Asia/Jakarta'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON system_audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON system_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_name ON system_audit_logs(entity_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON system_audit_logs(timestamp_wib);
