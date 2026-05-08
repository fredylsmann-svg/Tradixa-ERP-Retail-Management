-- RPC Function: get_notification_summary
-- Menggabungkan 6 query notifikasi menjadi 1 panggilan, menghemat ~83% round-trip

CREATE OR REPLACE FUNCTION get_notification_summary(p_store_id UUID, p_today_date TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'low_stock_products', (
      SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
      FROM (
        SELECT id, name, stock, reorder_level, expired_date
        FROM products
        WHERE store_id = p_store_id
          AND stock <= COALESCE(reorder_level, 5)
        LIMIT 200
      ) p
    ),
    'expiring_products', (
      SELECT COALESCE(json_agg(row_to_json(ep)), '[]'::json)
      FROM (
        SELECT id, name, stock, reorder_level, expired_date
        FROM products
        WHERE store_id = p_store_id
          AND expired_date IS NOT NULL
          AND expired_date <= (CURRENT_DATE + INTERVAL '30 days')
        LIMIT 100
      ) ep
    ),
    'unpaid_receivables', (
      SELECT COALESCE(json_agg(row_to_json(ar)), '[]'::json)
      FROM (
        SELECT id, status, customer_name, amount, due_date, created_at
        FROM receivables
        WHERE store_id = p_store_id
          AND status = 'Belum Lunas'
        LIMIT 100
      ) ar
    ),
    'unpaid_payables', (
      SELECT COALESCE(json_agg(row_to_json(ap)), '[]'::json)
      FROM (
        SELECT id, status, supplier_name, amount, due_date, created_at
        FROM payables
        WHERE store_id = p_store_id
          AND status = 'Belum Lunas'
        LIMIT 100
      ) ap
    ),
    'active_purchase_orders', (
      SELECT COALESCE(json_agg(row_to_json(po)), '[]'::json)
      FROM (
        SELECT id, status, po_number, supplier_name, supplier_signature, admin_signature, created_at, updated_date
        FROM purchase_orders
        WHERE store_id = p_store_id
          AND status IN ('Negotiation', 'Approved', 'Sent')
        LIMIT 50
      ) po
    ),
    'pending_requisitions', (
      SELECT COALESCE(json_agg(row_to_json(pr)), '[]'::json)
      FROM (
        SELECT id, status, pr_number, timestamp_wib, created_at, updated_date
        FROM purchase_requisitions
        WHERE store_id = p_store_id
          AND status IN ('Diajukan', 'Menunggu Level 2', 'Pending', 'Approved', 'Disetujui')
        LIMIT 50
      ) pr
    ),
    'today_sales', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT id, customer_name, total, timestamp_wib, created_at, payment_status, payment_method
        FROM sales_transactions
        WHERE store_id = p_store_id
          AND created_date = p_today_date
        LIMIT 50
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;
