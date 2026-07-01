-- Migration: Update Webhooks for "Diajukan" status (New PR/PO)
-- Date: 2026-07-01

-- 1. PURCHASE ORDERS
DROP TRIGGER IF EXISTS trigger_po_webhook ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_po_webhook_insert ON purchase_orders;
DROP TRIGGER IF EXISTS trigger_po_webhook_update ON purchase_orders;

CREATE TRIGGER trigger_po_webhook_insert
AFTER INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION notify_backend_on_change();

CREATE TRIGGER trigger_po_webhook_update
AFTER UPDATE OF status ON purchase_orders
FOR EACH ROW
WHEN (NEW.status IN ('Approved', 'Disetujui', 'Diajukan', 'Menunggu Level 2'))
EXECUTE FUNCTION notify_backend_on_change();

-- 2. PURCHASE REQUISITIONS
DROP TRIGGER IF EXISTS trigger_pr_webhook ON purchase_requisitions;
DROP TRIGGER IF EXISTS trigger_pr_webhook_insert ON purchase_requisitions;
DROP TRIGGER IF EXISTS trigger_pr_webhook_update ON purchase_requisitions;

CREATE TRIGGER trigger_pr_webhook_insert
AFTER INSERT ON purchase_requisitions
FOR EACH ROW
EXECUTE FUNCTION notify_backend_on_change();

CREATE TRIGGER trigger_pr_webhook_update
AFTER UPDATE OF status ON purchase_requisitions
FOR EACH ROW
WHEN (NEW.status IN ('Approved', 'Disetujui', 'Diajukan', 'Menunggu Level 2'))
EXECUTE FUNCTION notify_backend_on_change();
