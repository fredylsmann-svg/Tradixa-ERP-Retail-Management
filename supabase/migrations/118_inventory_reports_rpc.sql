-- ============================================================
-- TRADIXA: Inventory Reports RPC (v1 — Server Aggregation)
-- Optimasi Egress pada InventoryReports.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_inventory_reports(text, text);

CREATE OR REPLACE FUNCTION public.get_inventory_reports(
  p_store_id text,
  p_timezone text DEFAULT 'Asia/Jakarta'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock_value numeric := 0;
  v_total_items numeric := 0;
  v_total_in numeric := 0;
  v_total_out numeric := 0;
  
  v_products json;
  v_category_data json;
  v_stock_by_category json;
  v_movements json;
BEGIN
  -- 1. Totals
  SELECT 
    coalesce(sum(stock * coalesce(buy_price, sell_price, 0)), 0),
    coalesce(sum(stock), 0)
  INTO v_total_stock_value, v_total_items
  FROM products
  WHERE store_id = p_store_id;

  SELECT 
    coalesce(sum(quantity) FILTER (WHERE movement_type = 'in'), 0),
    coalesce(sum(quantity) FILTER (WHERE movement_type = 'out'), 0)
  INTO v_total_in, v_total_out
  FROM stock_movements
  WHERE store_id = p_store_id;

  -- 2. Category Aggregations
  SELECT json_agg(json_build_object(
    'name', category,
    'value', stock_qty
  )) INTO v_category_data
  FROM (
    SELECT coalesce(category, 'Lainnya') AS category, sum(stock) AS stock_qty
    FROM products
    WHERE store_id = p_store_id
    GROUP BY coalesce(category, 'Lainnya')
  ) c;

  SELECT json_agg(json_build_object(
    'name', category,
    'stock', stock_qty,
    'value', stock_val
  )) INTO v_stock_by_category
  FROM (
    SELECT 
      coalesce(category, 'Lainnya') AS category,
      sum(stock) AS stock_qty,
      sum(stock * coalesce(buy_price, sell_price, 0)) AS stock_val
    FROM products
    WHERE store_id = p_store_id
    GROUP BY coalesce(category, 'Lainnya')
  ) sc;

  -- 3. Products List (For Excel/PDF export and table)
  SELECT json_agg(p) INTO v_products
  FROM (
    SELECT 
      id, name, sku, category, stock, unit, status, expired_date,
      coalesce(buy_price, sell_price, 0) AS buy_price,
      coalesce(sell_price, 0) AS sell_price
    FROM products
    WHERE store_id = p_store_id
    ORDER BY created_at DESC
  ) p;

  -- 4. Stock Movements list (for per-product movement table)
  SELECT json_agg(m) INTO v_movements
  FROM (
    SELECT id, product_id, product_name, movement_type, quantity, created_date, timestamp_wib
    FROM stock_movements
    WHERE store_id = p_store_id
    ORDER BY created_at DESC
  ) m;

  RETURN json_build_object(
    'total_stock_value', v_total_stock_value,
    'total_items', v_total_items,
    'total_in', v_total_in,
    'total_out', v_total_out,
    'category_data', coalesce(v_category_data, '[]'::json),
    'stock_by_category', coalesce(v_stock_by_category, '[]'::json),
    'products', coalesce(v_products, '[]'::json),
    'movements', coalesce(v_movements, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_reports(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inventory_reports(text, text) TO anon;

NOTIFY pgrst, 'reload schema';
