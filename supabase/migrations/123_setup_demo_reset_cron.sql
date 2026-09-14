-- ============================================================
-- 123: Setup pg_cron for automatic reset of Demo Account
-- Account target: ferdiarmond@gmail.com
-- Schedule: Every Sunday at 00:00
-- ============================================================

-- 1. Create the secure Stored Procedure
CREATE OR REPLACE FUNCTION reset_demo_store_data(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_store_uuid uuid;
    target_store_text text;
BEGIN
    -- Get the store id in both formats (UUID and TEXT)
    -- Old tables use TEXT, newer tables use UUID for store_id
    SELECT id INTO target_store_uuid FROM stores WHERE owner_email = target_email LIMIT 1;
    target_store_text := target_store_uuid::text;

    -- Exit safely if no store is found
    IF target_store_uuid IS NULL THEN
        RAISE NOTICE 'No store found for email: %', target_email;
        RETURN;
    END IF;

    -- ==========================================
    -- DELETE TRANSACTIONAL DATA
    -- Delete order respects foreign keys: children first, then parents
    -- Tables with UUID store_id use target_store_uuid
    -- Tables with TEXT store_id use target_store_text
    -- ==========================================
    
    -- CRM & Agency (TEXT store_id)
    DELETE FROM agent_transactions WHERE store_id = target_store_text;
    DELETE FROM loyalty_transactions WHERE customer_id IN (SELECT id::text FROM customers WHERE store_id = target_store_text);
    DELETE FROM communication_logs WHERE customer_id IN (SELECT id::text FROM customers WHERE store_id = target_store_text);
    DELETE FROM customer_interactions WHERE customer_id IN (SELECT id::text FROM customers WHERE store_id = target_store_text);

    -- Sales & Returns
    DELETE FROM discount_usages WHERE transaction_id IN (SELECT id::text FROM sales_transactions WHERE store_id = target_store_text);
    DELETE FROM sales_returns WHERE store_id = target_store_uuid;        -- UUID
    DELETE FROM sales_transactions WHERE store_id = target_store_text;   -- TEXT

    -- Procurement (TEXT store_id)
    DELETE FROM supplier_returns WHERE store_id = target_store_text;
    DELETE FROM inventory_grns WHERE store_id = target_store_text;
    DELETE FROM goods_receipts WHERE store_id = target_store_text;
    DELETE FROM purchase_orders WHERE store_id = target_store_text;
    DELETE FROM purchase_requisitions WHERE store_id = target_store_text;

    -- Inventory & WMS
    DELETE FROM stock_movements WHERE store_id = target_store_text;          -- TEXT
    DELETE FROM outbound_deliveries WHERE store_id = target_store_uuid;      -- UUID
    DELETE FROM stock_opname_items WHERE opname_id IN (SELECT id FROM stock_opnames WHERE store_id = target_store_uuid);  -- UUID
    DELETE FROM stock_opnames WHERE store_id = target_store_uuid;            -- UUID

    -- Finance & Accounting
    DELETE FROM journal_lines WHERE journal_id IN (SELECT id::text FROM journal_entries WHERE store_id = target_store_text);
    DELETE FROM journal_entries WHERE store_id = target_store_text;      -- TEXT
    DELETE FROM expenses WHERE store_id = target_store_text;             -- TEXT
    DELETE FROM bank_transactions WHERE store_id = target_store_text;    -- TEXT
    DELETE FROM payables WHERE store_id = target_store_text;             -- TEXT
    DELETE FROM receivables WHERE store_id = target_store_text;          -- TEXT
    DELETE FROM fund_transfers WHERE store_id = target_store_uuid;       -- UUID

    -- Reset Product Stocks to 0 (TEXT store_id)
    UPDATE products SET stock = 0 WHERE store_id = target_store_text;
    
    -- Reset Bank Balances to 0 (TEXT store_id)
    UPDATE bank_accounts SET balance = 0 WHERE store_id = target_store_text;

    RAISE NOTICE 'Successfully reset transactional data for store: % (%)', target_store_uuid, target_email;
END;
$$;

-- 2. Schedule the job to run every Sunday at 00:00 for ferdiarmond@gmail.com
-- Unschedule first to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p 
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace 
      WHERE n.nspname = 'cron' AND p.proname = 'unschedule'
  ) THEN
    PERFORM cron.unschedule('reset-demo-account');
    PERFORM cron.schedule(
        'reset-demo-account',
        '0 0 * * 0', -- Every Sunday at 00:00
        $sql$ SELECT reset_demo_store_data('ferdiarmond@gmail.com'); $sql$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not enabled or accessible. Please enable pg_cron in Supabase Dashboard and run the schedule command manually.';
END
$$;
