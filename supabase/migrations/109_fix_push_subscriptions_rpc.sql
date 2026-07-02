-- Migration 109: Fix Push Token User ID mismatch
-- Date: 2026-07-02
-- Description: Updates the RPC to accept the actual users table UUID instead of relying on auth.uid() which causes a mismatch.

DROP FUNCTION IF EXISTS register_push_token(TEXT, UUID, VARCHAR);
DROP FUNCTION IF EXISTS register_push_token(UUID, TEXT, UUID, VARCHAR);

CREATE OR REPLACE FUNCTION register_push_token(
    p_user_id UUID,
    p_fcm_token TEXT,
    p_store_id UUID,
    p_device_name VARCHAR
) RETURNS void AS $$
BEGIN
    INSERT INTO public.user_push_subscriptions (user_id, store_id, device_name, fcm_token, updated_at)
    VALUES (p_user_id, p_store_id, p_device_name, p_fcm_token, now())
    ON CONFLICT (fcm_token) 
    DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        store_id = EXCLUDED.store_id,
        device_name = EXCLUDED.device_name,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
