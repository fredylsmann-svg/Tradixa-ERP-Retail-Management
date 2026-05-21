-- Migration 093: Enable Realtime for sales_transactions table
alter publication supabase_realtime add table sales_transactions;
