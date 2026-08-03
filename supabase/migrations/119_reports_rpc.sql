-- ============================================================
-- TRADIXA: General Reports RPC (v2 — Robust Parsing & Safety)
-- Optimasi Egress pada Reports.jsx (Sales, Inventory, Financial tabs)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_general_reports(text, text, date, date, text);

CREATE OR REPLACE FUNCTION public.get_general_reports(
  p_store_id text,
  p_report_type text DEFAULT 'sales',
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_timezone text DEFAULT 'Asia/Jakarta'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  
  -- Sales vars
  v_total_revenue numeric := 0;
  v_total_profit numeric := 0;
  v_total_orders bigint := 0;
  v_avg_order numeric := 0;
  v_transactions json;
  v_top_products json;

  -- Inventory vars
  v_total_products int := 0;
  v_total_val numeric := 0;
  v_low_stock_cnt int := 0;
  v_stock_in numeric := 0;
  v_stock_out numeric := 0;
  v_products json;
  v_movements json;

  -- Financial vars
  v_total_receivables numeric := 0;
  v_total_payables numeric := 0;
  v_cash_in numeric := 0;
  v_cash_out numeric := 0;
  v_bank_transactions json;
BEGIN
  IF p_report_type = 'sales' THEN
    -- Sales Summary & Transactions
    SELECT 
      coalesce(sum(total), 0),
      coalesce(sum(profit), 0),
      count(*)
    INTO v_total_revenue, v_total_profit, v_total_orders
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND (p_date_from IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_date_from
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= p_date_from
             ELSE FALSE END
      ))
      AND (p_date_to IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_date_to
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= p_date_to
             ELSE FALSE END
      ));

    IF v_total_orders > 0 THEN
      v_avg_order := v_total_revenue / v_total_orders;
    END IF;

    SELECT json_agg(t) INTO v_transactions
    FROM (
      SELECT id, invoice_number, customer_name, total, profit, payment_status, created_date, timestamp_wib
      FROM sales_transactions tx
      WHERE tx.store_id = p_store_id
        AND (p_date_from IS NULL OR (
          CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_date_from
               WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= p_date_from
               ELSE FALSE END
        ))
        AND (p_date_to IS NULL OR (
          CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_date_to
               WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= p_date_to
               ELSE FALSE END
        ))
      ORDER BY tx.created_at DESC
    ) t;

    SELECT json_agg(tp) INTO v_top_products
    FROM (
      SELECT 
        coalesce(elem->>'product_name', 'Tanpa Nama') AS name,
        sum(coalesce(nullif(elem->>'quantity', '')::numeric, 0)) AS qty,
        sum(coalesce(nullif(elem->>'subtotal', '')::numeric, 0)) AS revenue
      FROM sales_transactions tx,
           jsonb_array_elements(CASE WHEN jsonb_typeof(tx.items) = 'array' THEN tx.items ELSE '[]'::jsonb END) elem
      WHERE tx.store_id = p_store_id
        AND (p_date_from IS NULL OR (
          CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_date_from
               WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= p_date_from
               ELSE FALSE END
        ))
        AND (p_date_to IS NULL OR (
          CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_date_to
               WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= p_date_to
               ELSE FALSE END
        ))
      GROUP BY coalesce(elem->>'product_name', 'Tanpa Nama')
      ORDER BY revenue DESC
      LIMIT 10
    ) tp;

    RETURN json_build_object(
      'summary', json_build_object(
        'totalRevenue', v_total_revenue,
        'totalProfit', v_total_profit,
        'totalOrders', v_total_orders,
        'avgOrderValue', v_avg_order
      ),
      'transactions', coalesce(v_transactions, '[]'::json),
      'topProducts', coalesce(v_top_products, '[]'::json)
    );

  ELSIF p_report_type = 'inventory' THEN
    SELECT 
      count(*), coalesce(sum(stock * coalesce(buy_price, sell_price, 0)), 0), count(*) FILTER (WHERE status = 'Low Stock' OR status = 'Out of Stock' OR stock <= reorder_level)
    INTO v_total_products, v_total_val, v_low_stock_cnt
    FROM products
    WHERE store_id = p_store_id;

    SELECT 
      coalesce(sum(quantity) FILTER (WHERE movement_type = 'in'), 0),
      coalesce(sum(quantity) FILTER (WHERE movement_type = 'out'), 0)
    INTO v_stock_in, v_stock_out
    FROM stock_movements m
    WHERE m.store_id = p_store_id
      AND (p_date_from IS NULL OR (
        CASE WHEN m.created_at IS NOT NULL THEN (m.created_at AT TIME ZONE p_timezone)::date >= p_date_from
             WHEN m.created_date IS NOT NULL AND m.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN m.created_date::date >= p_date_from
             ELSE FALSE END
      ))
      AND (p_date_to IS NULL OR (
        CASE WHEN m.created_at IS NOT NULL THEN (m.created_at AT TIME ZONE p_timezone)::date <= p_date_to
             WHEN m.created_date IS NOT NULL AND m.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN m.created_date::date <= p_date_to
             ELSE FALSE END
      ));

    SELECT json_agg(p) INTO v_products
    FROM (
      SELECT id, name, sku, category, stock, unit, buy_price, sell_price, status
      FROM products WHERE store_id = p_store_id ORDER BY created_at DESC
    ) p;

    SELECT json_agg(m) INTO v_movements
    FROM (
      SELECT id, product_name, movement_type, quantity, created_date, timestamp_wib
      FROM stock_movements m
      WHERE m.store_id = p_store_id
        AND (p_date_from IS NULL OR (
          CASE WHEN m.created_at IS NOT NULL THEN (m.created_at AT TIME ZONE p_timezone)::date >= p_date_from
               WHEN m.created_date IS NOT NULL AND m.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN m.created_date::date >= p_date_from
               ELSE FALSE END
        ))
        AND (p_date_to IS NULL OR (
          CASE WHEN m.created_at IS NOT NULL THEN (m.created_at AT TIME ZONE p_timezone)::date <= p_date_to
               WHEN m.created_date IS NOT NULL AND m.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN m.created_date::date <= p_date_to
               ELSE FALSE END
        ))
      ORDER BY m.created_at DESC
    ) m;

    RETURN json_build_object(
      'summary', json_build_object(
        'totalProducts', v_total_products,
        'totalValue', v_total_val,
        'lowStock', v_low_stock_cnt,
        'totalStockIn', v_stock_in,
        'totalStockOut', v_stock_out
      ),
      'products', coalesce(v_products, '[]'::json),
      'movements', coalesce(v_movements, '[]'::json)
    );

  ELSIF p_report_type = 'financial' THEN
    SELECT coalesce(sum(total), 0) INTO v_total_revenue
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND (p_date_from IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_date_from
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= p_date_from
             ELSE FALSE END
      ))
      AND (p_date_to IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_date_to
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= p_date_to
             ELSE FALSE END
      ));

    SELECT coalesce(sum(remaining_amount), 0) INTO v_total_receivables
    FROM receivables WHERE store_id = p_store_id AND status != 'Lunas';

    SELECT coalesce(sum(remaining_amount), 0) INTO v_total_payables
    FROM payables WHERE store_id = p_store_id AND status != 'Lunas';

    SELECT 
      coalesce(sum(amount) FILTER (WHERE transaction_type = 'Credit'), 0),
      coalesce(sum(amount) FILTER (WHERE transaction_type = 'Debit'), 0)
    INTO v_cash_in, v_cash_out
    FROM bank_transactions bt
    WHERE bt.store_id = p_store_id
      AND (p_date_from IS NULL OR (
        CASE WHEN bt.created_at IS NOT NULL THEN (bt.created_at AT TIME ZONE p_timezone)::date >= p_date_from
             WHEN bt.created_date IS NOT NULL AND bt.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN bt.created_date::date >= p_date_from
             ELSE FALSE END
      ))
      AND (p_date_to IS NULL OR (
        CASE WHEN bt.created_at IS NOT NULL THEN (bt.created_at AT TIME ZONE p_timezone)::date <= p_date_to
             WHEN bt.created_date IS NOT NULL AND bt.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN bt.created_date::date <= p_date_to
             ELSE FALSE END
      ));

    SELECT json_agg(t) INTO v_transactions
    FROM (
      SELECT id, invoice_number, customer_name, total, profit, payment_status, created_date, timestamp_wib
      FROM sales_transactions tx
      WHERE tx.store_id = p_store_id
        AND (p_date_from IS NULL OR (
          CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_date_from
               WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= p_date_from
               ELSE FALSE END
        ))
        AND (p_date_to IS NULL OR (
          CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_date_to
               WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= p_date_to
               ELSE FALSE END
        ))
      ORDER BY tx.created_at DESC
    ) t;

    SELECT json_agg(b) INTO v_bank_transactions
    FROM (
      SELECT id, transaction_type, amount, balance_after, description, created_date, timestamp_wib
      FROM bank_transactions bt
      WHERE bt.store_id = p_store_id
        AND (p_date_from IS NULL OR (
          CASE WHEN bt.created_at IS NOT NULL THEN (bt.created_at AT TIME ZONE p_timezone)::date >= p_date_from
               WHEN bt.created_date IS NOT NULL AND bt.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN bt.created_date::date >= p_date_from
               ELSE FALSE END
        ))
        AND (p_date_to IS NULL OR (
          CASE WHEN bt.created_at IS NOT NULL THEN (bt.created_at AT TIME ZONE p_timezone)::date <= p_date_to
               WHEN bt.created_date IS NOT NULL AND bt.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN bt.created_date::date <= p_date_to
               ELSE FALSE END
        ))
      ORDER BY bt.created_at DESC
    ) b;

    RETURN json_build_object(
      'summary', json_build_object(
        'totalRevenue', v_total_revenue,
        'totalReceivable', v_total_receivables,
        'totalPayable', v_total_payables,
        'cashIn', v_cash_in,
        'cashOut', v_cash_out
      ),
      'transactions', coalesce(v_transactions, '[]'::json),
      'bankTransactions', coalesce(v_bank_transactions, '[]'::json)
    );
  END IF;

  RETURN '{}'::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_general_reports(text, text, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_general_reports(text, text, date, date, text) TO anon;

NOTIFY pgrst, 'reload schema';
