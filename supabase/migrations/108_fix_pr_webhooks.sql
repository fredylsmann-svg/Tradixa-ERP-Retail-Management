-- Migration 108: Fix Purchase Requisition Webhook for Railway
-- Date: 2026-07-02
-- Description: Updates the trigger for purchase_requisitions to fire on both INSERT and UPDATE, so the Railway backend receives notifications for New PRs.

-- Drop the previous narrow trigger
DROP TRIGGER IF EXISTS trigger_pr_webhook ON purchase_requisitions;

-- Recreate the trigger to fire on INSERT and UPDATE
CREATE TRIGGER trigger_pr_webhook
AFTER INSERT OR UPDATE OF status ON purchase_requisitions
FOR EACH ROW
EXECUTE FUNCTION notify_backend_on_change();
