-- Migration 111: Harden Push Subscription Security
-- Date: 2026-07-02
-- Description: Secures the RPC to automatically determine the correct user_id from the authenticated JWT, preventing ID spoofing.

-- Drop the old vulnerable signature
DROP FUNCTION IF EXISTS register_push_token(UUID, TEXT, UUID, VARCHAR);

CREATE OR REPLACE FUNCTION register_push_token(
    p_fcm_token TEXT,
    p_store_id UUID,
    p_device_name VARCHAR
) RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Securely resolve the public.users ID using the authenticated JWT email
    SELECT id INTO v_user_id FROM public.users WHERE email = auth.jwt() ->> 'email' LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not found in public.users';
    END IF;

    -- Upsert the token with the securely resolved user_id
    INSERT INTO public.user_push_subscriptions (user_id, store_id, device_name, fcm_token, updated_at)
    VALUES (v_user_id, p_store_id, p_device_name, p_fcm_token, now())
    ON CONFLICT (fcm_token) 
    DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        store_id = EXCLUDED.store_id,
        device_name = EXCLUDED.device_name,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
