-- ============================================================
-- TRADIXA: Stock Report RPC (v1 — Server Aggregation)
-- Optimasi Egress pada StockReport.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_stock_report(text);

CREATE OR REPLACE FUNCTION public.get_stock_report(
  p_store_id text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_stock_value numeric := 0;
  v_total_products int := 0;
  v_low_stock_count int := 0;
  v_out_of_stock_count int := 0;
  
  v_products json;
  v_batches json;
  v_serials json;
  v_sales_txs json;
  v_inventory_grns json;
BEGIN
  -- 1. Summary totals & Products list
  SELECT 
    coalesce(sum(stock * sell_price), 0),
    count(*),
    count(*) FILTER (WHERE stock <= reorder_level AND stock > 0),
    count(*) FILTER (WHERE stock = 0)
  INTO v_total_stock_value, v_total_products, v_low_stock_count, v_out_of_stock_count
  FROM products
  WHERE store_id = p_store_id;

  SELECT json_agg(p) INTO v_products
  FROM (
    SELECT 
      id, name, sku, category, stock, unit, tracking_type,
      coalesce(buy_price, sell_price, 0) AS buy_price,
      coalesce(sell_price, 0) AS sell_price,
      reorder_level, status
    FROM products
    WHERE store_id = p_store_id
    ORDER BY created_at DESC
  ) p;

  -- 2. Batches (Available)
  SELECT json_agg(b) INTO v_batches
  FROM (
    SELECT id, batch_number, product_id, product_name, grn_number, qty_on_hand, qty_received, expiry_date, manufacture_date, status
    FROM inventory_batches
    WHERE store_id::text = p_store_id AND status = 'Available'
    ORDER BY expiry_date ASC
  ) b;

  -- 3. Serials
  SELECT json_agg(s) INTO v_serials
  FROM (
    SELECT id, serial_number, product_id, status, sales_transaction_id, inventory_grn_id, created_date
    FROM inventory_serials
    WHERE store_id::text = p_store_id
    ORDER BY serial_number ASC
  ) s;

  -- 4. Sales Transactions (For Serial resolution)
  SELECT json_agg(st) INTO v_sales_txs
  FROM (
    SELECT id, invoice_number, created_date, created_at, timestamp_wib, customer_name, payment_method, total, items
    FROM sales_transactions
    WHERE store_id = p_store_id
  ) st;

  -- 5. Inventory GRNs (For Serial resolution)
  SELECT json_agg(grn) INTO v_inventory_grns
  FROM (
    SELECT id, igrn_number, created_date, supplier_name
    FROM inventory_grns
    WHERE store_id = p_store_id
  ) grn;

  RETURN json_build_object(
    'total_stock_value', v_total_stock_value,
    'total_products', v_total_products,
    'low_stock_count', v_low_stock_count,
    'out_of_stock_count', v_out_of_stock_count,
    'products', coalesce(v_products, '[]'::json),
    'batches', coalesce(v_batches, '[]'::json),
    'serials', coalesce(v_serials, '[]'::json),
    'sales_transactions', coalesce(v_sales_txs, '[]'::json),
    'inventory_grns', coalesce(v_inventory_grns, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_report(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stock_report(text) TO anon;

NOTIFY pgrst, 'reload schema';
