-- ============================================================
-- TRADIXA: Cash Register RPC (v1 — Server Aggregation + Pagination)
-- Optimasi Egress pada CashRegister.jsx
-- ============================================================

DROP FUNCTION IF EXISTS public.get_cash_register(text, int, int, text, text, text);

CREATE OR REPLACE FUNCTION public.get_cash_register(
  p_store_id text,
  p_page int DEFAULT 1,
  p_per_page int DEFAULT 20,
  p_type_filter text DEFAULT 'all',
  p_search text DEFAULT '',
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
  v_balance numeric := 0;
  v_in_today numeric := 0;
  v_out_today numeric := 0;
  v_total_count bigint := 0;
  v_transactions json;
  v_offset int;
BEGIN
  v_today := (now() AT TIME ZONE p_timezone)::date;
  v_offset := (p_page - 1) * p_per_page;

  -- 1. Summary: ALWAYS calculated from ALL matching cash lines (no pagination)
  SELECT
    coalesce(sum(jl.debit) - sum(jl.credit), 0),
    coalesce(sum(jl.debit) FILTER (WHERE je.date = to_char(v_today, 'YYYY-MM-DD')), 0),
    coalesce(sum(jl.credit) FILTER (WHERE je.date = to_char(v_today, 'YYYY-MM-DD')), 0)
  INTO v_balance, v_in_today, v_out_today
  FROM journal_lines jl
  INNER JOIN journal_entries je ON jl.journal_id = je.id::text
  WHERE je.store_id = p_store_id
    AND jl.account_name IN ('Kas Kantor', 'Kas Tangan');

  -- 2. Total count for pagination (with filters applied)
  SELECT count(*) INTO v_total_count
  FROM journal_lines jl
  INNER JOIN journal_entries je ON jl.journal_id = je.id::text
  WHERE je.store_id = p_store_id
    AND jl.account_name IN ('Kas Kantor', 'Kas Tangan')
    AND (
      p_type_filter = 'all'
      OR (p_type_filter = 'pemasukan' AND jl.debit > 0)
      OR (p_type_filter = 'pengeluaran' AND jl.credit > 0)
    )
    AND (
      p_search = '' OR p_search IS NULL
      OR lower(coalesce(jl.description, '')) LIKE '%' || lower(p_search) || '%'
      OR lower(coalesce(je.transaction_id, '')) LIKE '%' || lower(p_search) || '%'
      OR lower(coalesce(je.description, '')) LIKE '%' || lower(p_search) || '%'
    );

  -- 3. Paginated transactions (newest first)
  SELECT json_agg(row_data) INTO v_transactions
  FROM (
    SELECT
      jl.id,
      je.date AS date,
      je.transaction_id AS reference,
      coalesce(nullif(jl.description, ''), je.description, '-') AS description,
      CASE WHEN jl.debit > 0 THEN 'Pemasukan' ELSE 'Pengeluaran' END AS type,
      CASE WHEN jl.debit > 0 THEN jl.debit ELSE jl.credit END AS amount,
      coalesce(je.status, 'Posted') AS status,
      coalesce(jl.created_at, je.created_at) AS created_at
    FROM journal_lines jl
    INNER JOIN journal_entries je ON jl.journal_id = je.id::text
    WHERE je.store_id = p_store_id
      AND jl.account_name IN ('Kas Kantor', 'Kas Tangan')
      AND (
        p_type_filter = 'all'
        OR (p_type_filter = 'pemasukan' AND jl.debit > 0)
        OR (p_type_filter = 'pengeluaran' AND jl.credit > 0)
      )
      AND (
        p_search = '' OR p_search IS NULL
        OR lower(coalesce(jl.description, '')) LIKE '%' || lower(p_search) || '%'
        OR lower(coalesce(je.transaction_id, '')) LIKE '%' || lower(p_search) || '%'
        OR lower(coalesce(je.description, '')) LIKE '%' || lower(p_search) || '%'
      )
    ORDER BY coalesce(jl.created_at, je.created_at) DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) row_data;

  RETURN json_build_object(
    'balance', v_balance,
    'in_today', v_in_today,
    'out_today', v_out_today,
    'total_count', v_total_count,
    'transactions', coalesce(v_transactions, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cash_register(text, int, int, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_register(text, int, int, text, text, text) TO anon;

NOTIFY pgrst, 'reload schema';
