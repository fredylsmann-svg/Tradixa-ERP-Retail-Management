-- Migration: Setup Notification Webhooks and FCM Token
-- Date: 2026-07-01
-- Description: Adds fcm_token to users, enables pg_net, and creates triggers for webhooks to GCP Cloud Run.

-- 1. Add FCM Token to Users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 2. Enable pg_net extension for HTTP requests (Requires Supabase Pro or manual enablement)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Create Webhook Function
CREATE OR REPLACE FUNCTION notify_backend_on_change()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    backend_url TEXT := 'https://your-cloud-run-url.a.run.app/webhook/notifications'; -- Ganti dengan URL Cloud Run Anda nanti
BEGIN
    payload := json_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'record', row_to_json(NEW)
    );

    -- Send HTTP POST to Golang Backend
    -- Note: pg_net sends async requests
    PERFORM net.http_post(
        url := backend_url,
        body := payload,
        headers := '{"Content-Type": "application/json"}'::jsonb
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Triggers
-- For Purchase Orders
DROP TRIGGER IF EXISTS trigger_po_webhook ON purchase_orders;
CREATE TRIGGER trigger_po_webhook
AFTER UPDATE OF status ON purchase_orders
FOR EACH ROW
WHEN (NEW.status = 'Approved')
EXECUTE FUNCTION notify_backend_on_change();

-- For Purchase Requisitions
DROP TRIGGER IF EXISTS trigger_pr_webhook ON purchase_requisitions;
CREATE TRIGGER trigger_pr_webhook
AFTER UPDATE OF status ON purchase_requisitions
FOR EACH ROW
WHEN (NEW.status = 'Approved')
EXECUTE FUNCTION notify_backend_on_change();
