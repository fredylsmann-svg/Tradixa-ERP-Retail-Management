-- Hapus versi lama agar tidak terjadi duplikasi (Overload Ambiguity)
DROP FUNCTION IF EXISTS public.get_store_categories(uuid);
DROP FUNCTION IF EXISTS public.get_store_categories(text);
DROP FUNCTION IF EXISTS public.get_unique_categories(uuid);

CREATE OR REPLACE FUNCTION public.get_store_categories(p_store_id text)
RETURNS TABLE (category text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.category
  FROM public.products p
  WHERE p.store_id::text = p_store_id
    AND p.category IS NOT NULL
    AND p.category != ''
  ORDER BY p.category ASC;
END;
$$;

-- Berikan hak akses kepada Frontend agar fungsi tidak 404/403
GRANT EXECUTE ON FUNCTION public.get_store_categories(text) TO anon, authenticated;

-- Segarkan (Refresh) PostgREST cache secara paksa
NOTIFY pgrst, 'reload schema';
