-- ============================================================
-- TRADIXA: Revenue Reports RPC (v2 — Robust Type Casting & Null Safety)
-- Optimasi Egress & Perbaikan Perhitungan pada RevenueReports.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_revenue_reports(text, int, text);

CREATE OR REPLACE FUNCTION public.get_revenue_reports(
  p_store_id text,
  p_days int DEFAULT 7,
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
  v_start_date date;
  v_chart_data json;
  v_top_products json;
  v_payment_methods json;
  v_dead_stock json;
  v_slow_moving json;
  
  v_total_revenue numeric := 0;
  v_total_profit numeric := 0;
  v_total_cost numeric := 0;
  v_total_orders bigint := 0;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;
  v_start_date := v_today - (p_days - 1);

  -- 1. Daily Aggregation for Chart Data (Filtered to active days)
  WITH days AS (
    SELECT generate_series(
      v_start_date,
      v_today,
      interval '1 day'
    )::date AS d
  ),
  daily_sums AS (
    SELECT 
      days.d,
      to_char(days.d, 'DD Mon YY') AS name_str,
      to_char(days.d, 'DD Month YYYY') AS full_name_str,
      coalesce(sum(tx.total), 0) AS revenue,
      coalesce(sum(tx.profit), 0) AS profit,
      count(tx.id) AS orders
    FROM days
    LEFT JOIN sales_transactions tx ON tx.store_id = p_store_id
      AND tx.payment_status = 'Paid'
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date = days.d
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date = days.d
             ELSE FALSE END
      )
    GROUP BY days.d
    ORDER BY days.d ASC
  )
  SELECT json_agg(json_build_object(
    'name', name_str,
    'fullName', full_name_str,
    'revenue', revenue,
    'profit', profit,
    'orders', orders
  )) INTO v_chart_data
  FROM daily_sums
  WHERE revenue > 0 OR profit > 0 OR orders > 0;

  -- 2. Period Totals
  SELECT 
    coalesce(sum(revenue), 0),
    coalesce(sum(profit), 0),
    coalesce(sum(orders), 0)
  INTO v_total_revenue, v_total_profit, v_total_orders
  FROM (
    SELECT 
      coalesce(sum(tx.total), 0) AS revenue,
      coalesce(sum(tx.profit), 0) AS profit,
      count(tx.id) AS orders
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND tx.payment_status = 'Paid'
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= v_start_date
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= v_start_date
             ELSE FALSE END
      )
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= v_today
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= v_today
             ELSE FALSE END
      )
  ) t;

  -- 3. Top Products with Profit Margins
  SELECT json_agg(json_build_object(
    'name', item_name,
    'qty', total_qty,
    'revenue', total_rev,
    'cost', total_cost
  )) INTO v_top_products
  FROM (
    SELECT 
      coalesce(elem->>'product_name', 'Tanpa Nama') AS item_name,
      sum(coalesce(nullif(elem->>'quantity', '')::numeric, 0)) AS total_qty,
      sum(coalesce(nullif(elem->>'subtotal', '')::numeric, 0)) AS total_rev,
      sum(coalesce(nullif(elem->>'buy_price', '')::numeric, 0) * coalesce(nullif(elem->>'quantity', '')::numeric, 0)) AS total_cost
    FROM sales_transactions tx,
         jsonb_array_elements(CASE WHEN jsonb_typeof(tx.items) = 'array' THEN tx.items ELSE '[]'::jsonb END) elem
    WHERE tx.store_id = p_store_id
      AND tx.payment_status = 'Paid'
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= v_start_date
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= v_start_date
             ELSE FALSE END
      )
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= v_today
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= v_today
             ELSE FALSE END
      )
    GROUP BY coalesce(elem->>'product_name', 'Tanpa Nama')
    ORDER BY total_qty DESC
    LIMIT 10
  ) tp;

  -- Total Cost calculation for Summary Card
  SELECT coalesce(sum(coalesce(nullif(elem->>'buy_price', '')::numeric, 0) * coalesce(nullif(elem->>'quantity', '')::numeric, 0)), 0)
  INTO v_total_cost
  FROM sales_transactions tx,
       jsonb_array_elements(CASE WHEN jsonb_typeof(tx.items) = 'array' THEN tx.items ELSE '[]'::jsonb END) elem
  WHERE tx.store_id = p_store_id
    AND tx.payment_status = 'Paid'
    AND (
      CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= v_start_date
           WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= v_start_date
           ELSE FALSE END
    )
    AND (
      CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= v_today
           WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= v_today
           ELSE FALSE END
    );

  -- 4. Payment Methods Distribution
  SELECT json_agg(json_build_object(
    'name', coalesce(payment_method, 'Cash'),
    'value', cnt
  )) INTO v_payment_methods
  FROM (
    SELECT coalesce(payment_method, 'Cash') AS payment_method, count(*) AS cnt
    FROM sales_transactions tx
    WHERE tx.store_id = p_store_id
      AND tx.payment_status = 'Paid'
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= v_start_date
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= v_start_date
             ELSE FALSE END
      )
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= v_today
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= v_today
             ELSE FALSE END
      )
    GROUP BY coalesce(payment_method, 'Cash')
  ) pm;

  -- 5. Dead Stock & Slow Moving Analysis
  WITH prod_sales AS (
    SELECT 
      elem->>'product_id' AS prod_id,
      sum(coalesce(nullif(elem->>'quantity', '')::numeric, 0)) AS qty_sold
    FROM sales_transactions tx,
         jsonb_array_elements(CASE WHEN jsonb_typeof(tx.items) = 'array' THEN tx.items ELSE '[]'::jsonb END) elem
    WHERE tx.store_id = p_store_id
      AND tx.payment_status = 'Paid'
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date >= v_start_date
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date >= v_start_date
             ELSE FALSE END
      )
      AND (
        CASE WHEN tx.created_at IS NOT NULL THEN (tx.created_at AT TIME ZONE p_timezone)::date <= v_today
             WHEN tx.created_date IS NOT NULL AND tx.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN tx.created_date::date <= v_today
             ELSE FALSE END
      )
    GROUP BY elem->>'product_id'
  )
  SELECT 
    json_agg(p) FILTER (WHERE stock > 0 AND coalesce("qtySold", 0) = 0),
    json_agg(p) FILTER (WHERE stock > 0 AND coalesce("qtySold", 0) > 0 AND coalesce("qtySold", 0) <= 2)
  INTO v_dead_stock, v_slow_moving
  FROM (
    SELECT 
      p.id,
      p.name,
      coalesce(p.sku, '-') AS sku,
      coalesce(p.stock, 0) AS stock,
      coalesce(p.buy_price, p.sell_price, 0) AS buy_price,
      coalesce(ps.qty_sold, 0) AS "qtySold"
    FROM products p
    LEFT JOIN prod_sales ps ON ps.prod_id = p.id::text
    WHERE p.store_id = p_store_id
    ORDER BY (coalesce(p.stock, 0) * coalesce(p.buy_price, p.sell_price, 0)) DESC
  ) p;

  RETURN json_build_object(
    'chart_data', coalesce(v_chart_data, '[]'::json),
    'total_revenue', v_total_revenue,
    'total_profit', v_total_profit,
    'total_cost', v_total_cost,
    'total_orders', v_total_orders,
    'top_products', coalesce(v_top_products, '[]'::json),
    'payment_methods', coalesce(v_payment_methods, '[]'::json),
    'dead_stock', coalesce(v_dead_stock, '[]'::json),
    'slow_moving', coalesce(v_slow_moving, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_reports(text, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_reports(text, int, text) TO anon;

NOTIFY pgrst, 'reload schema';
