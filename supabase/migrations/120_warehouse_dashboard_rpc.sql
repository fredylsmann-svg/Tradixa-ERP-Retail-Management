-- ============================================================
-- TRADIXA: Warehouse Dashboard RPC (v1 — Server Aggregation)
-- Optimasi Egress pada WarehouseDashboard.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_warehouse_dashboard(text, text);

CREATE OR REPLACE FUNCTION public.get_warehouse_dashboard(
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
  v_today date;
  v_total_sku int := 0;
  v_total_units numeric := 0;
  v_total_value numeric := 0;
  v_low_stock_count int := 0;
  v_pending_transfers int := 0;
  
  v_today_grn int := 0;
  v_today_outbound int := 0;
  v_today_transfer int := 0;
  
  v_warehouse_stock json;
  v_category_data json;
  v_top_products json;
  v_products json;
  v_locations json;
  v_transfers json;
  v_outbounds json;
  v_grns json;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;

  -- 1. Product Totals
  SELECT 
    count(*),
    coalesce(sum(stock), 0),
    coalesce(sum(stock * coalesce(buy_price, sell_price, 0)), 0),
    count(*) FILTER (WHERE stock <= coalesce(reorder_level, 0))
  INTO v_total_sku, v_total_units, v_total_value, v_low_stock_count
  FROM products
  WHERE store_id = p_store_id;

  -- 2. Pending transfers & Today activities
  SELECT count(*) INTO v_pending_transfers
  FROM warehouse_transfers
  WHERE store_id = p_store_id::uuid AND status = 'In Transit';

  SELECT count(*) INTO v_today_grn
  FROM goods_receipts
  WHERE store_id = p_store_id
    AND (created_at AT TIME ZONE p_timezone)::date = v_today;

  SELECT count(*) INTO v_today_outbound
  FROM outbound_deliveries
  WHERE store_id = p_store_id::uuid
    AND (created_at AT TIME ZONE p_timezone)::date = v_today;

  SELECT count(*) INTO v_today_transfer
  FROM warehouse_transfers
  WHERE store_id = p_store_id::uuid
    AND (created_at AT TIME ZONE p_timezone)::date = v_today;

  -- 3. Stock per Warehouse
  SELECT json_agg(json_build_object(
    'name', CASE WHEN length(loc.name) > 15 THEN substring(loc.name from 1 for 15) || '...' ELSE loc.name END,
    'fullName', loc.name,
    'units', coalesce(ps.units, 0),
    'skus', coalesce(ps.skus, 0),
    'value', coalesce(ps.val, 0)
  )) INTO v_warehouse_stock
  FROM product_locations loc
  LEFT JOIN (
    SELECT 
      warehouse_name,
      sum(stock) AS units,
      count(*) AS skus,
      sum(stock * coalesce(buy_price, sell_price, 0)) AS val
    FROM products
    WHERE store_id = p_store_id AND warehouse_name IS NOT NULL
    GROUP BY warehouse_name
  ) ps ON ps.warehouse_name = loc.name
  WHERE loc.store_id = p_store_id AND loc.type = 'store';

  -- 4. Category distribution
  SELECT json_agg(json_build_object(
    'name', coalesce(category, 'Lainnya'),
    'value', total_units
  )) INTO v_category_data
  FROM (
    SELECT coalesce(category, 'Lainnya') AS category, sum(stock) AS total_units
    FROM products
    WHERE store_id = p_store_id
    GROUP BY coalesce(category, 'Lainnya')
    ORDER BY total_units DESC
    LIMIT 8
  ) cd;

  -- 5. Top Products
  SELECT json_agg(p) INTO v_top_products
  FROM (
    SELECT id, name, sku, category, stock, unit, coalesce(buy_price, sell_price, 0) AS buy_price
    FROM products
    WHERE store_id = p_store_id
    ORDER BY stock DESC
    LIMIT 10
  ) p;

  -- Raw lists
  SELECT json_agg(p) INTO v_products
  FROM (
    SELECT id, name, sku, category, stock, unit, reorder_level, warehouse_name, coalesce(buy_price, sell_price, 0) AS buy_price
    FROM products WHERE store_id = p_store_id ORDER BY created_at DESC
  ) p;

  SELECT json_agg(l) INTO v_locations
  FROM (
    SELECT id, name, type FROM product_locations WHERE store_id = p_store_id ORDER BY name ASC
  ) l;

  SELECT json_agg(t) INTO v_transfers
  FROM (
    SELECT id, transfer_number, status, created_at FROM warehouse_transfers WHERE store_id = p_store_id::uuid ORDER BY created_at DESC LIMIT 50
  ) t;

  SELECT json_agg(o) INTO v_outbounds
  FROM (
    SELECT id, tracking_number, status, created_at FROM outbound_deliveries WHERE store_id = p_store_id::uuid ORDER BY created_at DESC LIMIT 50
  ) o;

  SELECT json_agg(g) INTO v_grns
  FROM (
    SELECT id, gr_number, created_at FROM goods_receipts WHERE store_id = p_store_id ORDER BY created_at DESC LIMIT 50
  ) g;

  RETURN json_build_object(
    'total_sku', v_total_sku,
    'total_units', v_total_units,
    'total_value', v_total_value,
    'low_stock_count', v_low_stock_count,
    'pending_transfers', v_pending_transfers,
    'today_grn', v_today_grn,
    'today_outbound', v_today_outbound,
    'today_transfer', v_today_transfer,
    'warehouse_stock', coalesce(v_warehouse_stock, '[]'::json),
    'category_data', coalesce(v_category_data, '[]'::json),
    'top_products', coalesce(v_top_products, '[]'::json),
    'products', coalesce(v_products, '[]'::json),
    'locations', coalesce(v_locations, '[]'::json),
    'transfers', coalesce(v_transfers, '[]'::json),
    'outbounds', coalesce(v_outbounds, '[]'::json),
    'grns', coalesce(v_grns, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_warehouse_dashboard(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_warehouse_dashboard(text, text) TO anon;

NOTIFY pgrst, 'reload schema';
