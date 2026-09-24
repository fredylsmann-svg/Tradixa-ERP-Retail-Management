-- ROLLBACK: Hapus semua trigger limit
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','customers','suppliers','payables','receivables',
    'bank_transactions','expenses','employees','stock_movements',
    'bank_statement_history','sales_transactions','outbound_deliveries',
    'purchase_requisitions','purchase_orders','goods_receipts',
    'inventory_grns','supplier_returns'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_check_limit_%I ON %I', t, t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS check_entity_limit();
DROP FUNCTION IF EXISTS get_store_limit(text, text);
