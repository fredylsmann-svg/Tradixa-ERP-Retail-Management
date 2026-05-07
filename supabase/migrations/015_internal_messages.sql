-- TRADIXA - Internal Messaging Migration (REVISED)
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old table if exists to ensure correct schema
DROP TABLE IF EXISTS internal_messages;

CREATE TABLE internal_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL, -- Penting untuk multi-tenant
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_date TEXT NOT NULL DEFAULT (CURRENT_DATE)::text,
    updated_date TEXT NOT NULL DEFAULT (CURRENT_DATE)::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster message retrieval
CREATE INDEX idx_internal_messages_conversation ON internal_messages(sender_id, receiver_id);
CREATE INDEX idx_internal_messages_store ON internal_messages(store_id);

-- Enable Realtime
alter publication supabase_realtime add table internal_messages;
