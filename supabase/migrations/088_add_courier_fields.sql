-- Migration to add Courier Flow fields to outbound_deliveries
ALTER TABLE outbound_deliveries
ADD COLUMN IF NOT EXISTS driver_phone text,
ADD COLUMN IF NOT EXISTS proof_photo_url text,
ADD COLUMN IF NOT EXISTS transit_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS vehicle_type text,
ADD COLUMN IF NOT EXISTS license_plate text,
ADD COLUMN IF NOT EXISTS audit_logs jsonb DEFAULT '[]'::jsonb;
