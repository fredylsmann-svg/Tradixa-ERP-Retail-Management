-- ============================================================
-- TRADIXA: Sales Report RPC (v1 — Dynamic Timezone & Server Aggregation)
-- Optimasi Egress & Perbaikan Bug Timezone pada SalesReport.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_sales_report(text, date, date, text, text);

CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_store_id text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_product_id text DEFAULT 'All',
  p_timezone text DEFAULT 'Asia/Jakarta'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_daily_revenue numeric := 0;
  v_daily_count bigint := 0;
  
  v_total_revenue numeric := 0;
  v_total_profit numeric := 0;
  v_total_transactions bigint := 0;
  
  -- Compare period
  v_days_diff int := 0;
  v_prev_start date;
  v_prev_end date;
  v_prev_revenue numeric := 0;
  v_prev_profit numeric := 0;
  v_prev_count bigint := 0;
  
  v_chart_data json;
  v_payment_chart_data json;
  v_best_sellers json;
  v_transactions json;
  v_products json;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;

  -- 1. Daily Sales (Today in local timezone)
  SELECT 
    coalesce(sum(total), 0),
    count(*)
  INTO v_daily_revenue, v_daily_count
  FROM sales_transactions
  WHERE store_id = p_store_id
    AND (
      (created_at IS NOT NULL AND (created_at AT TIME ZONE p_timezone)::date = v_today)
      OR (created_at IS NULL AND created_date = to_char(v_today, 'YYYY-MM-DD'))
    );

  -- 2. Filtered Transactions Aggregation
  SELECT
    coalesce(sum(total), 0),
    coalesce(sum(profit), 0),
    count(*)
  INTO v_total_revenue, v_total_profit, v_total_transactions
  FROM sales_transactions tx
  WHERE tx.store_id = p_store_id
    AND (p_start_date IS NULL OR (
      CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_start_date
           ELSE tx.created_date::date >= p_start_date END
    ))
    AND (p_end_date IS NULL OR (
      CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_end_date
           ELSE tx.created_date::date <= p_end_date END
    ))
    AND (p_product_id = 'All' OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(tx.items) elem 
      WHERE elem->>'product_id' = p_product_id
    ));

  -- 3. Previous Period Aggregation (For Compare Mode)
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_days_diff := (p_end_date - p_start_date) + 1;
    v_prev_start := p_start_date - v_days_diff;
    v_prev_end := p_start_date - 1;

    SELECT
      coalesce(sum(total), 0),
      coalesce(sum(profit), 0),
      count(*)
    INTO v_prev_revenue, v_prev_profit, v_prev_count
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= v_prev_start
             ELSE tx.created_date::date >= v_prev_start END
      )
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= v_prev_end
             ELSE tx.created_date::date <= v_prev_end END
      )
      AND (p_product_id = 'All' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(tx.items) elem 
        WHERE elem->>'product_id' = p_product_id
      ));
  END IF;

  -- 4. Chart Data (Last 7 days in local timezone)
  WITH days AS (
    SELECT generate_series(
      v_today - 6,
      v_today,
      interval '1 day'
    )::date AS d
  ),
  daily_sums AS (
    SELECT 
      days.d,
      coalesce(sum(tx.total), 0) AS revenue
    FROM days
    LEFT JOIN sales_transactions tx ON tx.store_id = p_store_id
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date = days.d
             ELSE tx.created_date = to_char(days.d, 'YYYY-MM-DD') END
      )
      AND (p_product_id = 'All' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(tx.items) elem 
        WHERE elem->>'product_id' = p_product_id
      ))
    GROUP BY days.d
    ORDER BY days.d ASC
  )
  SELECT json_agg(json_build_object(
    'name', to_char(d, 'DD Mon'),
    'value', revenue
  )) INTO v_chart_data FROM daily_sums;

  -- 5. Payment Chart Data
  SELECT json_agg(json_build_object(
    'name', coalesce(payment_method, 'Cash'),
    'value', cnt
  )) INTO v_payment_chart_data
  FROM (
    SELECT coalesce(tx.payment_method, 'Cash') as payment_method, count(*) as cnt
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND (p_start_date IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_start_date
             ELSE tx.created_date::date >= p_start_date END
      ))
      AND (p_end_date IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_end_date
             ELSE tx.created_date::date <= p_end_date END
      ))
      AND (p_product_id = 'All' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(tx.items) elem 
        WHERE elem->>'product_id' = p_product_id
      ))
    GROUP BY coalesce(tx.payment_method, 'Cash')
  ) p;

  -- 6. Best Sellers (Top 10 products by quantity sold in filtered period)
  SELECT json_agg(json_build_object(
    'name', item_name,
    'quantity', total_qty,
    'revenue', total_rev
  )) INTO v_best_sellers
  FROM (
    SELECT 
      elem->>'product_name' AS item_name,
      sum(coalesce((elem->>'quantity')::numeric, 0)) AS total_qty,
      sum(coalesce((elem->>'subtotal')::numeric, 0)) AS total_rev
    FROM sales_transactions tx,
         jsonb_array_elements(tx.items) elem
    WHERE tx.store_id = p_store_id
      AND (p_start_date IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_start_date
             ELSE tx.created_date::date >= p_start_date END
      ))
      AND (p_end_date IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_end_date
             ELSE tx.created_date::date <= p_end_date END
      ))
      AND (p_product_id = 'All' OR elem->>'product_id' = p_product_id)
    GROUP BY elem->>'product_name'
    ORDER BY total_qty DESC
    LIMIT 10
  ) bs;

  -- 7. Filtered Transactions list (for table, CSV & PDF export)
  SELECT json_agg(t) INTO v_transactions
  FROM (
    SELECT 
      tx.id,
      tx.invoice_number,
      tx.customer_name,
      tx.total,
      tx.profit,
      tx.payment_method,
      tx.payment_status,
      tx.created_date,
      tx.timestamp_wib,
      tx.items
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND (p_start_date IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= p_start_date
             ELSE tx.created_date::date >= p_start_date END
      ))
      AND (p_end_date IS NULL OR (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= p_end_date
             ELSE tx.created_date::date <= p_end_date END
      ))
      AND (p_product_id = 'All' OR EXISTS (
        SELECT 1 FROM jsonb_array_elements(tx.items) elem 
        WHERE elem->>'product_id' = p_product_id
      ))
    ORDER BY tx.created_at DESC
  ) t;

  -- 8. Products List (For filter dropdown)
  SELECT json_agg(p) INTO v_products
  FROM (
    SELECT id, name FROM products WHERE store_id = p_store_id ORDER BY name ASC
  ) p;

  RETURN json_build_object(
    'daily_revenue', v_daily_revenue,
    'daily_count', v_daily_count,
    'total_revenue', v_total_revenue,
    'total_profit', v_total_profit,
    'total_transactions', v_total_transactions,
    'prev_period', json_build_object(
      'revenue', v_prev_revenue,
      'profit', v_prev_profit,
      'count', v_prev_count
    ),
    'chart_data', coalesce(v_chart_data, '[]'::json),
    'payment_chart_data', coalesce(v_payment_chart_data, '[]'::json),
    'best_sellers', coalesce(v_best_sellers, '[]'::json),
    'transactions', coalesce(v_transactions, '[]'::json),
    'products', coalesce(v_products, '[]'::json)
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_sales_report(text, date, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_report(text, date, date, text, text) TO anon;

NOTIFY pgrst, 'reload schema';
