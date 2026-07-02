-- Migration 107: Fix RLS 403 on FCM Token Upsert
-- Date: 2026-07-02
-- Description: Creates a SECURITY DEFINER function to allow reassigning FCM tokens when a user switches accounts on the same device.

CREATE OR REPLACE FUNCTION register_push_token(
    p_fcm_token TEXT,
    p_store_id UUID,
    p_device_name VARCHAR
) RETURNS void AS $$
BEGIN
    INSERT INTO public.user_push_subscriptions (user_id, store_id, device_name, fcm_token, updated_at)
    VALUES (auth.uid(), p_store_id, p_device_name, p_fcm_token, now())
    ON CONFLICT (fcm_token) 
    DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        store_id = EXCLUDED.store_id,
        device_name = EXCLUDED.device_name,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
