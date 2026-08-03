-- ============================================================
-- TRADIXA: Sales Performance RPC (v2 — Robust Date Parsing & Null Safety)
-- Optimasi Egress pada SalesPerformance.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_sales_performance(text, date, text);

CREATE OR REPLACE FUNCTION public.get_sales_performance(
  p_store_id text,
  p_selected_date date DEFAULT NULL,
  p_timezone text DEFAULT 'Asia/Jakarta'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_perf_data json;
  v_pie_data json;
  v_grand_total numeric := 0;
  v_total_txs bigint := 0;
BEGIN
  -- 1. Performance grouped by Active Employees (PIC)
  SELECT json_agg(json_build_object(
    'id', id,
    'name', name,
    'photo_url', photo_url,
    'totalSales', total_sales,
    'totalTransactions', total_transactions,
    'avgTransaction', avg_transaction,
    'lastCoordinates', last_coords,
    'lastLocationName', last_loc_name
  )) INTO v_perf_data
  FROM (
    SELECT 
      e.id,
      e.name,
      e.photo_url,
      coalesce(sum(ft.total), 0) AS total_sales,
      count(ft.id) AS total_transactions,
      CASE WHEN count(ft.id) > 0 THEN coalesce(sum(ft.total), 0) / count(ft.id) ELSE 0 END AS avg_transaction,
      (
        SELECT ft_loc.sale_coordinates 
        FROM sales_transactions ft_loc 
        WHERE ft_loc.store_id = p_store_id AND ft_loc.sales_pic = e.name AND ft_loc.sale_coordinates IS NOT NULL AND ft_loc.sale_coordinates != ''
          AND (p_selected_date IS NULL OR (
            CASE WHEN ft_loc.created_at IS NOT NULL THEN (ft_loc.created_at AT TIME ZONE p_timezone)::date = p_selected_date
                 WHEN ft_loc.created_date IS NOT NULL AND ft_loc.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN ft_loc.created_date::date = p_selected_date
                 ELSE FALSE END
          ))
        ORDER BY ft_loc.created_at DESC LIMIT 1
      ) AS last_coords,
      (
        SELECT coalesce(ft_loc.sale_location, '-')
        FROM sales_transactions ft_loc 
        WHERE ft_loc.store_id = p_store_id AND ft_loc.sales_pic = e.name AND ft_loc.sale_coordinates IS NOT NULL AND ft_loc.sale_coordinates != ''
          AND (p_selected_date IS NULL OR (
            CASE WHEN ft_loc.created_at IS NOT NULL THEN (ft_loc.created_at AT TIME ZONE p_timezone)::date = p_selected_date
                 WHEN ft_loc.created_date IS NOT NULL AND ft_loc.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN ft_loc.created_date::date = p_selected_date
                 ELSE FALSE END
          ))
        ORDER BY ft_loc.created_at DESC LIMIT 1
      ) AS last_loc_name
    FROM employees e
    LEFT JOIN sales_transactions ft ON ft.sales_pic = e.name 
      AND ft.store_id = p_store_id
      AND (p_selected_date IS NULL OR (
        CASE WHEN ft.created_at IS NOT NULL THEN (ft.created_at AT TIME ZONE p_timezone)::date = p_selected_date
             WHEN ft.created_date IS NOT NULL AND ft.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN ft.created_date::date = p_selected_date
             ELSE FALSE END
      ))
    WHERE e.store_id = p_store_id AND (e.status IS NULL OR e.status = 'Active')
    GROUP BY e.id, e.name, e.photo_url
    ORDER BY total_sales DESC
  ) emp_stats;

  -- 2. Grand Totals
  SELECT 
    coalesce(sum(total), 0),
    count(*)
  INTO v_grand_total, v_total_txs
  FROM sales_transactions ft
  WHERE ft.store_id = p_store_id
    AND (p_selected_date IS NULL OR (
      CASE WHEN ft.created_at IS NOT NULL THEN (ft.created_at AT TIME ZONE p_timezone)::date = p_selected_date
           WHEN ft.created_date IS NOT NULL AND ft.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN ft.created_date::date = p_selected_date
           ELSE FALSE END
    ));

  -- 3. Location Distribution (Pie Data)
  SELECT json_agg(json_build_object(
    'name', loc_name,
    'value', total_sales
  )) INTO v_pie_data
  FROM (
    SELECT 
      coalesce(nullif(sale_location, ''), 'Unspecified') AS loc_name,
      sum(total) AS total_sales
    FROM sales_transactions ft
    WHERE ft.store_id = p_store_id
      AND (p_selected_date IS NULL OR (
        CASE WHEN ft.created_at IS NOT NULL THEN (ft.created_at AT TIME ZONE p_timezone)::date = p_selected_date
             WHEN ft.created_date IS NOT NULL AND ft.created_date ~ '^\d{4}-\d{2}-\d{2}' THEN ft.created_date::date = p_selected_date
             ELSE FALSE END
      ))
    GROUP BY coalesce(nullif(sale_location, ''), 'Unspecified')
    ORDER BY total_sales DESC
  ) locs;

  RETURN json_build_object(
    'performance_data', coalesce(v_perf_data, '[]'::json),
    'pie_data', coalesce(v_pie_data, '[]'::json),
    'grand_total', v_grand_total,
    'total_txs', v_total_txs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_performance(text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_performance(text, date, text) TO anon;

NOTIFY pgrst, 'reload schema';
