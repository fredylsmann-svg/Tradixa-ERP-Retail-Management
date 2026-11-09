-- ============================================================
-- 130 ROLLBACK: Kembalikan perubahan dari migration 130
-- ============================================================

DROP TRIGGER IF EXISTS on_internal_message_push ON public.internal_messages;
DROP TRIGGER IF EXISTS trg_protect_users_sensitive_columns ON public.users;
DROP FUNCTION IF EXISTS public.protect_users_sensitive_columns();

GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_financial_statements(text, date, date, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sales_report(text, date, date, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_revenue_reports(text, int, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_sales_performance(text, date, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_stock_report(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_inventory_reports(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_general_reports(text, text, date, date, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_warehouse_dashboard(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_cash_register(text, int, int, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_categories(text) TO anon;

