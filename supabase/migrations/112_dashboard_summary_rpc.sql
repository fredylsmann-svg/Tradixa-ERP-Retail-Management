-- ============================================================
-- TRADIXA: Dashboard Summary RPC (v3 — Dynamic Timezone)
-- Menghitung semua statistik Dashboard di sisi server
-- sehingga browser hanya menerima 1 objek JSON kecil (~500 byte)
-- ============================================================

-- Drop all old versions (different signatures) to be safe
DROP FUNCTION IF EXISTS public.get_dashboard_summary(uuid, text);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(text, text);
DROP FUNCTION IF EXISTS public.get_dashboard_summary(text, text, text);

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
  p_store_id text,
  p_range text DEFAULT 'daily',
  p_timezone text DEFAULT 'Asia/Jakarta'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_products int;
  v_low_stock int;
  v_new_products_this_month int;
  v_total_sales bigint;
  v_total_revenue numeric;
  v_total_profit numeric;
  v_total_payables numeric;
  v_total_receivables numeric;
  v_payable_count int;
  v_receivable_count int;
  v_current_sales_count bigint;
  v_prev_sales_count bigint;
  v_current_revenue numeric;
  v_prev_revenue numeric;
  v_current_profit numeric;
  v_prev_profit numeric;
  v_period_start timestamptz;
  v_prev_period_start timestamptz;
  v_today date;
  v_chart_data json;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;

  SELECT count(*), 
         count(*) FILTER (WHERE stock <= reorder_level AND stock > 0),
         count(*) FILTER (WHERE created_at >= date_trunc('month', now()))
  INTO v_total_products, v_low_stock, v_new_products_this_month
  FROM products WHERE store_id = p_store_id;

  SELECT count(*), coalesce(sum(total), 0), coalesce(sum(profit), 0)
  INTO v_total_sales, v_total_revenue, v_total_profit
  FROM sales_transactions WHERE store_id = p_store_id;

  IF p_range = 'daily' THEN
    v_period_start := (v_today::timestamp AT TIME ZONE p_timezone);
    v_prev_period_start := ((v_today - interval '1 day')::timestamp AT TIME ZONE p_timezone);
  ELSIF p_range = 'weekly' THEN
    v_period_start := ((v_today - interval '7 days')::timestamp AT TIME ZONE p_timezone);
    v_prev_period_start := ((v_today - interval '14 days')::timestamp AT TIME ZONE p_timezone);
  ELSE
    v_period_start := (date_trunc('month', v_today::timestamp) AT TIME ZONE p_timezone);
    v_prev_period_start := ((date_trunc('month', v_today::timestamp) - interval '1 month') AT TIME ZONE p_timezone);
  END IF;

  SELECT count(*), coalesce(sum(total), 0), coalesce(sum(profit), 0)
  INTO v_current_sales_count, v_current_revenue, v_current_profit
  FROM sales_transactions WHERE store_id = p_store_id AND created_at >= v_period_start;

  SELECT count(*), coalesce(sum(total), 0), coalesce(sum(profit), 0)
  INTO v_prev_sales_count, v_prev_revenue, v_prev_profit
  FROM sales_transactions WHERE store_id = p_store_id AND created_at >= v_prev_period_start AND created_at < v_period_start;

  SELECT coalesce(sum(coalesce(remaining_amount, amount, 0)), 0), count(*)
  INTO v_total_payables, v_payable_count
  FROM payables WHERE store_id = p_store_id AND status = 'Pending';

  SELECT coalesce(sum(coalesce(remaining_amount, amount, 0)), 0), count(*)
  INTO v_total_receivables, v_receivable_count
  FROM receivables WHERE store_id = p_store_id AND status = 'Pending';

  SELECT json_agg(row_to_json(d) ORDER BY d.day) INTO v_chart_data FROM (
    SELECT gs::date as day, to_char(gs::date, 'DD Mon') as name,
      coalesce(sum(st.total), 0) as revenue, count(st.id) as orders
    FROM generate_series((v_today - interval '6 days')::date, v_today, '1 day'::interval) gs
    LEFT JOIN sales_transactions st ON st.store_id = p_store_id AND (st.created_at AT TIME ZONE p_timezone)::date = gs::date
    GROUP BY gs::date
  ) d;

  RETURN json_build_object(
    'total_products', v_total_products,
    'low_stock', v_low_stock,
    'new_products_this_month', v_new_products_this_month,
    'total_sales', v_total_sales,
    'total_revenue', v_total_revenue,
    'total_profit', v_total_profit,
    'current_sales_count', v_current_sales_count,
    'prev_sales_count', v_prev_sales_count,
    'current_revenue', v_current_revenue,
    'prev_revenue', v_prev_revenue,
    'current_profit', v_current_profit,
    'prev_profit', v_prev_profit,
    'total_payables', v_total_payables,
    'payable_count', v_payable_count,
    'total_receivables', v_total_receivables,
    'receivable_count', v_receivable_count,
    'chart_data', coalesce(v_chart_data, '[]'::json)
  );
END;
$$;

-- Grant access to logged-in users
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(text, text, text) TO anon;

-- Force PostgREST to detect the new function
NOTIFY pgrst, 'reload schema';
