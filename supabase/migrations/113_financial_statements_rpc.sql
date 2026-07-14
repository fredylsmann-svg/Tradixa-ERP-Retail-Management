-- ============================================================
-- TRADIXA: Financial Statements RPC
-- Menghitung Laba Rugi, Neraca, dan Arus Kas di sisi server
-- sehingga browser hanya menerima 1 objek JSON kecil (~1 KB)
-- ============================================================

-- Drop old version if exists
DROP FUNCTION IF EXISTS public.get_financial_statements(text, date, date, text);

CREATE OR REPLACE FUNCTION public.get_financial_statements(
  p_store_id text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_timezone text DEFAULT 'Asia/Jakarta'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- P&L variables
  v_revenue numeric := 0;
  v_hpp numeric := 0;
  v_gross_profit numeric := 0;
  v_gross_margin numeric := 0;
  v_total_opex numeric := 0;
  v_net_profit numeric := 0;
  v_net_margin numeric := 0;
  v_total_discount numeric := 0;
  v_opex_detail json;

  -- Balance Sheet variables (ALWAYS cumulative from beginning to end_date)
  v_kas numeric := 0;
  v_piutang numeric := 0;
  v_persediaan numeric := 0;
  v_total_assets numeric := 0;
  v_hutang numeric := 0;
  v_equity numeric := 0;

  -- Cash Flow variables
  v_total_cash_in numeric := 0;
  v_total_cash_out numeric := 0;
  v_net_cash_flow numeric := 0;
  v_cash_in_detail json;
  v_cash_out_detail json;

  -- Counts
  v_tx_count bigint := 0;
  v_journal_count bigint := 0;

  -- Previous period for MoM comparison
  v_prev_revenue numeric := 0;
  v_prev_net_profit numeric := 0;

  -- Internal date boundaries
  v_filter_start date;
  v_filter_end date;
  v_bal_end date;          -- Balance sheet end date (always = v_filter_end)
  v_prev_start date;
  v_prev_end date;
BEGIN
  -- ========================================================
  -- 1. Determine date ranges
  -- ========================================================
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_filter_start := p_start_date;
    v_filter_end := p_end_date;
  ELSIF p_start_date IS NOT NULL THEN
    v_filter_start := p_start_date;
    v_filter_end := (now() AT TIME ZONE p_timezone)::date;
  ELSE
    -- "Semua Waktu" → from the beginning of time to now
    v_filter_start := '2000-01-01'::date;
    v_filter_end := (now() AT TIME ZONE p_timezone)::date;
  END IF;

  -- Balance sheet always accumulates from the very beginning to v_filter_end
  v_bal_end := v_filter_end;

  -- Previous period (same duration, shifted back) for MoM
  v_prev_end := v_filter_start - interval '1 day';
  v_prev_start := v_prev_end - (v_filter_end - v_filter_start);

  -- ========================================================
  -- 2. P&L — Revenue & HPP (from journal_lines within period)
  --    Only lines belonging to Posted journal_entries
  -- ========================================================
  -- Revenue = credit - debit for 'Pendapatan Penjualan'
  SELECT coalesce(sum(
    CASE WHEN jl.account_name = 'Pendapatan Penjualan' THEN
      coalesce(jl.credit, 0) - coalesce(jl.debit, 0)
    ELSE 0 END
  ), 0),
  -- HPP = debit - credit for 'Harga Pokok Penjualan (HPP)'
  coalesce(sum(
    CASE WHEN jl.account_name = 'Harga Pokok Penjualan (HPP)' THEN
      coalesce(jl.debit, 0) - coalesce(jl.credit, 0)
    ELSE 0 END
  ), 0),
  count(DISTINCT jl.id)
  INTO v_revenue, v_hpp, v_journal_count
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND je.date >= v_filter_start::text
    AND je.date <= v_filter_end::text;

  v_gross_profit := v_revenue - v_hpp;
  v_gross_margin := CASE WHEN v_revenue > 0 THEN round((v_gross_profit / v_revenue) * 100, 1) ELSE 0 END;

  -- ========================================================
  -- 3. P&L — Operating Expenses (Beban *)
  -- ========================================================
  SELECT coalesce(sum(coalesce(jl.debit, 0)), 0),
         coalesce(json_agg(json_build_object('category', replace(jl.account_name, 'Beban ', ''), 'amount', coalesce(jl.debit, 0)))
           FILTER (WHERE coalesce(jl.debit, 0) > 0), '[]'::json)
  INTO v_total_opex, v_opex_detail
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND jl.account_name LIKE 'Beban %'
    AND coalesce(jl.debit, 0) > 0
    AND je.date >= v_filter_start::text
    AND je.date <= v_filter_end::text;

  v_net_profit := v_gross_profit - v_total_opex;
  v_net_margin := CASE WHEN v_revenue > 0 THEN round((v_net_profit / v_revenue) * 100, 1) ELSE 0 END;

  -- ========================================================
  -- 4. Total Discount from sales_transactions (period)
  -- ========================================================
  SELECT count(*), coalesce(sum(coalesce(st.discount, 0)), 0)
  INTO v_tx_count, v_total_discount
  FROM sales_transactions st
  WHERE st.store_id = p_store_id
    AND st.created_date >= v_filter_start::text
    AND st.created_date <= v_filter_end::text;

  -- ========================================================
  -- 5. NERACA (Balance Sheet) — AKUMULATIF dari awal s/d end_date
  --    Ini sesuai standar akuntansi: Neraca = posisi pada titik waktu
  -- ========================================================
  -- Kas & Bank
  SELECT coalesce(sum(coalesce(jl.debit, 0) - coalesce(jl.credit, 0)), 0)
  INTO v_kas
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND (lower(jl.account_name) LIKE '%kas%' OR lower(jl.account_name) LIKE '%bank%')
    AND je.date <= v_bal_end::text;

  -- Piutang Usaha
  SELECT coalesce(sum(coalesce(jl.debit, 0) - coalesce(jl.credit, 0)), 0)
  INTO v_piutang
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND jl.account_name = 'Piutang Usaha'
    AND je.date <= v_bal_end::text;

  -- Persediaan Barang Dagang
  SELECT coalesce(sum(coalesce(jl.debit, 0) - coalesce(jl.credit, 0)), 0)
  INTO v_persediaan
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND jl.account_name = 'Persediaan Barang Dagang'
    AND je.date <= v_bal_end::text;

  v_total_assets := v_kas + v_piutang + v_persediaan;

  -- Hutang Usaha
  SELECT coalesce(sum(coalesce(jl.credit, 0) - coalesce(jl.debit, 0)), 0)
  INTO v_hutang
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND jl.account_name = 'Hutang Usaha'
    AND je.date <= v_bal_end::text;

  v_equity := v_total_assets - v_hutang;

  -- ========================================================
  -- 6. ARUS KAS (Cash Flow) — within period only
  -- ========================================================
  -- Cash Inflows (debit to Kas/Bank accounts)
  SELECT coalesce(sum(coalesce(jl.debit, 0)), 0),
         coalesce(json_agg(json_build_object(
           'category', CASE
             WHEN jl.description LIKE '%Penjualan%' THEN 'Penerimaan Penjualan'
             ELSE 'Penerimaan Lainnya'
           END,
           'amount', coalesce(jl.debit, 0)
         )) FILTER (WHERE coalesce(jl.debit, 0) > 0), '[]'::json)
  INTO v_total_cash_in, v_cash_in_detail
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND (lower(jl.account_name) LIKE '%kas%' OR lower(jl.account_name) LIKE '%bank%')
    AND coalesce(jl.debit, 0) > 0
    AND je.date >= v_filter_start::text
    AND je.date <= v_filter_end::text;

  -- Cash Outflows (credit from Kas/Bank accounts)
  SELECT coalesce(sum(coalesce(jl.credit, 0)), 0),
         coalesce(json_agg(json_build_object(
           'category', CASE
             WHEN jl.description LIKE '%Pembelian%' OR jl.description LIKE '%Stok%' THEN 'Pembelian Barang Dagang'
             WHEN jl.description LIKE '%Beban%' THEN 'Pembayaran Beban Operasional'
             ELSE 'Pengeluaran Lainnya'
           END,
           'amount', coalesce(jl.credit, 0)
         )) FILTER (WHERE coalesce(jl.credit, 0) > 0), '[]'::json)
  INTO v_total_cash_out, v_cash_out_detail
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND (lower(jl.account_name) LIKE '%kas%' OR lower(jl.account_name) LIKE '%bank%')
    AND coalesce(jl.credit, 0) > 0
    AND je.date >= v_filter_start::text
    AND je.date <= v_filter_end::text;

  v_net_cash_flow := v_total_cash_in - v_total_cash_out;

  -- ========================================================
  -- 7. Previous Period — for MoM comparison
  -- ========================================================
  SELECT
    coalesce(sum(CASE WHEN jl.account_name = 'Pendapatan Penjualan' THEN coalesce(jl.credit, 0) - coalesce(jl.debit, 0) ELSE 0 END), 0),
    coalesce(sum(CASE WHEN jl.account_name = 'Pendapatan Penjualan' THEN coalesce(jl.credit, 0) - coalesce(jl.debit, 0) ELSE 0 END), 0)
      - coalesce(sum(CASE WHEN jl.account_name = 'Harga Pokok Penjualan (HPP)' THEN coalesce(jl.debit, 0) - coalesce(jl.credit, 0) ELSE 0 END), 0)
      - coalesce(sum(CASE WHEN jl.account_name LIKE 'Beban %' AND coalesce(jl.debit, 0) > 0 THEN coalesce(jl.debit, 0) ELSE 0 END), 0)
  INTO v_prev_revenue, v_prev_net_profit
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id::text = jl.journal_id
  WHERE je.store_id = p_store_id
    AND je.status = 'Posted'
    AND je.date >= v_prev_start::text
    AND je.date <= v_prev_end::text;

  -- ========================================================
  -- 8. Return everything as a single JSON object
  -- ========================================================
  RETURN json_build_object(
    -- P&L
    'revenue', v_revenue,
    'hpp', v_hpp,
    'gross_profit', v_gross_profit,
    'gross_margin', v_gross_margin,
    'total_opex', v_total_opex,
    'opex_detail', v_opex_detail,
    'net_profit', v_net_profit,
    'net_margin', v_net_margin,
    'total_discount', v_total_discount,
    -- Balance Sheet (cumulative)
    'kas', v_kas,
    'piutang', v_piutang,
    'persediaan', v_persediaan,
    'total_assets', v_total_assets,
    'hutang', v_hutang,
    'equity', v_equity,
    'retained_earnings', v_net_profit,
    -- Cash Flow (period)
    'total_cash_in', v_total_cash_in,
    'cash_in_detail', v_cash_in_detail,
    'total_cash_out', v_total_cash_out,
    'cash_out_detail', v_cash_out_detail,
    'net_cash_flow', v_net_cash_flow,
    -- Counts
    'tx_count', v_tx_count,
    'journal_count', v_journal_count,
    -- Previous period for MoM
    'prev_revenue', v_prev_revenue,
    'prev_net_profit', v_prev_net_profit
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_financial_statements(text, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_statements(text, date, date, text) TO anon;

-- Force PostgREST to detect the new function
NOTIFY pgrst, 'reload schema';
