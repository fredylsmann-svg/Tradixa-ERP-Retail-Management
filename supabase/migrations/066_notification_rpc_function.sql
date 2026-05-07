-- ================================================================
-- SQL RPC: get_notification_summary
-- Menggabungkan 6 query notifikasi menjadi 1 panggilan database
-- Menghemat ~83% round-trips dan mengurangi egress secara drastis
-- ================================================================

CREATE OR REPLACE FUNCTION get_notification_summary(p_store_id UUID, p_today_date TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today TEXT;
  v_result JSON;
BEGIN
  -- Use provided date or default to today
  v_today := COALESCE(p_today_date, TO_CHAR(NOW(), 'YYYY-MM-DD'));

  SELECT json_build_object(
    -- 1. Low stock products
    'low_stock_products', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, name, stock, reorder_level, expired_date
        FROM products
        WHERE store_id = p_store_id
          AND stock <= reorder_level
        ORDER BY stock ASC
        LIMIT 50
      ) t
    ), '[]'::json),

    -- 2. Expiring products (within 30 days)
    'expiring_products', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, name, stock, expired_date
        FROM products
        WHERE store_id = p_store_id
          AND expired_date IS NOT NULL
          AND expired_date <= (CURRENT_DATE + INTERVAL '30 days')::TEXT
          AND expired_date >= CURRENT_DATE::TEXT
        ORDER BY expired_date ASC
        LIMIT 30
      ) t
    ), '[]'::json),

    -- 3. Unpaid receivables (Piutang)
    'unpaid_receivables', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, customer_name, amount, due_date, created_at
        FROM receivables
        WHERE store_id = p_store_id
          AND status = 'Belum Lunas'
        ORDER BY due_date ASC
        LIMIT 50
      ) t
    ), '[]'::json),

    -- 4. Unpaid payables (Utang)
    'unpaid_payables', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, supplier_name, amount, due_date, created_at
        FROM payables
        WHERE store_id = p_store_id
          AND status = 'Belum Lunas'
        ORDER BY due_date ASC
        LIMIT 50
      ) t
    ), '[]'::json),

    -- 5. Active Purchase Orders (Negotiation, Approved, Sent)
    'active_purchase_orders', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, status, po_number, supplier_name, supplier_signature,
               admin_signature, created_at, updated_date
        FROM purchase_orders
        WHERE store_id = p_store_id
          AND status IN ('Negotiation', 'Approved', 'Sent')
        ORDER BY created_at DESC
        LIMIT 50
      ) t
    ), '[]'::json),

    -- 6. Pending Purchase Requisitions
    'pending_requisitions', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, status, pr_number, timestamp_wib, created_at, updated_date
        FROM purchase_requisitions
        WHERE store_id = p_store_id
          AND status IN ('Diajukan', 'Menunggu Level 2', 'Pending', 'Approved', 'Disetujui')
        ORDER BY created_at DESC
        LIMIT 50
      ) t
    ), '[]'::json),

    -- 7. Today's sales (count + recent items)
    'today_sales', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT id, customer_name, total, timestamp_wib, created_at
        FROM sales_transactions
        WHERE store_id = p_store_id
          AND created_date = v_today
        ORDER BY created_at DESC
        LIMIT 50
      ) t
    ), '[]'::json)

  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_notification_summary(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_summary(UUID, TEXT) TO anon;
