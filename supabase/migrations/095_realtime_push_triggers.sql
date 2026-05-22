-- Migration 095: Add database triggers to send real-time PWA push notifications via pg_net

-- 1. Ensure the pg_net extension is enabled for asynchronous HTTP requests
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Create the unified trigger function for push notifications
CREATE OR REPLACE FUNCTION public.trigger_push_on_db_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  store_id_val UUID;
  title_val TEXT;
  body_val TEXT;
  store_plan TEXT;
BEGIN
  -- Resolve store_id based on which table triggered the event
  IF TG_TABLE_NAME = 'products' THEN
    -- For newly created products or changes, check if store_id exists
    IF NEW.store_id IS NULL OR NEW.store_id = '' THEN
      RETURN NEW;
    END IF;
    store_id_val := NEW.store_id::UUID;
  ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
    IF NEW.store_id IS NULL OR NEW.store_id = '' THEN
      RETURN NEW;
    END IF;
    store_id_val := NEW.store_id::UUID;
  ELSIF TG_TABLE_NAME = 'purchase_requisitions' THEN
    IF NEW.store_id IS NULL OR NEW.store_id = '' THEN
      RETURN NEW;
    END IF;
    store_id_val := NEW.store_id::UUID;
  ELSE
    RETURN NEW;
  END IF;

  -- Verify Premium Plan gating at the database level to optimize resources
  SELECT plan INTO store_plan FROM public.stores WHERE id = store_id_val;
  IF store_plan IS DISTINCT FROM 'premium' THEN
    RETURN NEW; -- Skip non-premium stores
  END IF;

  -- =========================================================================
  -- CASE A: Products Table (Low Stock Alert)
  -- =========================================================================
  IF TG_TABLE_NAME = 'products' THEN
    -- Trigger only when:
    -- 1. Stock decreases to or below the reorder level.
    -- 2. Prevent repeated alerts by checking if OLD stock was above the reorder level,
    --    or if this is a newly set reorder level / initial stock update.
    IF (OLD.stock > NEW.reorder_level OR OLD.stock IS NULL) AND NEW.stock <= NEW.reorder_level AND NEW.stock >= 0 THEN
      title_val := '⚠️ Peringatan Stok Menipis!';
      body_val := 'Produk "' || NEW.name || '" tersisa ' || NEW.stock || ' ' || COALESCE(NEW.unit, 'pcs') || ' (Batas minimal: ' || NEW.reorder_level || ').';
      
      payload := jsonb_build_object(
        'title', title_val,
        'body', body_val,
        'store_id', store_id_val
      );
      
      -- Perform Async HTTP POST using pg_net extension
      PERFORM net.http_post(
        url := 'https://yurickvpwbomqwjvffle.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := payload
      );
    END IF;

  -- =========================================================================
  -- CASE B: Purchase Orders Table (Supplier Status Update)
  -- =========================================================================
  ELSIF TG_TABLE_NAME = 'purchase_orders' THEN
    -- Trigger only when status changes and transitions to Approved, Cancelled, or Negotiation
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('Approved', 'Cancelled', 'Negotiation') THEN
      
      IF NEW.status = 'Approved' THEN
        title_val := '✅ Purchase Order Disetujui';
        body_val := 'PO #' || NEW.po_number || ' telah disetujui dan ditandatangani oleh supplier (' || NEW.supplier_name || ').';
      ELSIF NEW.status = 'Cancelled' THEN
        title_val := '❌ Purchase Order Dibatalkan';
        body_val := 'PO #' || NEW.po_number || ' telah dibatalkan/ditolak. Alasan: ' || COALESCE(NEW.cancellation_reason, 'Tidak ada alasan.') || '.';
      ELSIF NEW.status = 'Negotiation' THEN
        title_val := '💬 Negosiasi Purchase Order';
        body_val := 'Supplier (' || NEW.supplier_name || ') mengajukan negosiasi harga untuk PO #' || NEW.po_number || '.';
      END IF;

      payload := jsonb_build_object(
        'title', title_val,
        'body', body_val,
        'store_id', store_id_val
      );

      -- Perform Async HTTP POST using pg_net extension
      PERFORM net.http_post(
        url := 'https://yurickvpwbomqwjvffle.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := payload
      );
    END IF;

  -- =========================================================================
  -- CASE C: Purchase Requisitions Table (PR Submitted / Status Change)
  -- =========================================================================
  ELSIF TG_TABLE_NAME = 'purchase_requisitions' THEN
    IF (TG_OP = 'INSERT' AND NEW.status IN ('Diajukan', 'Menunggu Level 2')) OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('Diajukan', 'Menunggu Level 2', 'Approved', 'Rejected')) THEN
      
      IF NEW.status = 'Diajukan' THEN
        title_val := '📝 Pengajuan PR Baru';
        body_val := 'PR #' || NEW.pr_number || ' telah diajukan oleh ' || COALESCE(NEW.requester, 'Staff') || ' dan memerlukan persetujuan.';
      ELSIF NEW.status = 'Menunggu Level 2' THEN
        title_val := '⏳ PR Menunggu Level 2';
        body_val := 'PR #' || NEW.pr_number || ' membutuhkan persetujuan Level 2.';
      ELSIF NEW.status = 'Approved' THEN
        title_val := '✅ PR Disetujui';
        body_val := 'PR #' || NEW.pr_number || ' telah disetujui oleh ' || COALESCE(NEW.approved_by, 'Manager') || '.';
      ELSIF NEW.status = 'Rejected' THEN
        title_val := '❌ PR Ditolak';
        body_val := 'PR #' || NEW.pr_number || ' telah ditolak.';
      END IF;

      payload := jsonb_build_object(
        'title', title_val,
        'body', body_val,
        'store_id', store_id_val
      );

      -- Perform Async HTTP POST using pg_net extension
      PERFORM net.http_post(
        url := 'https://yurickvpwbomqwjvffle.supabase.co/functions/v1/send-push-notification',
        headers := '{"Content-Type": "application/json"}'::JSONB,
        body := payload
      );
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Prevent database trigger failure from blocking the primary transaction
  RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Trigger for products (after updates to stock)
DROP TRIGGER IF EXISTS trg_low_stock_notification ON public.products;
CREATE TRIGGER trg_low_stock_notification
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_db_change();

-- 4. Create the Trigger for purchase_orders (after updates to status)
DROP TRIGGER IF EXISTS trg_po_status_notification ON public.purchase_orders;
CREATE TRIGGER trg_po_status_notification
  AFTER UPDATE OF status ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_db_change();

-- 5. Create the Trigger for purchase_requisitions (after insert or update)
DROP TRIGGER IF EXISTS trg_pr_status_notification ON public.purchase_requisitions;
CREATE TRIGGER trg_pr_status_notification
  AFTER INSERT OR UPDATE ON public.purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_db_change();
