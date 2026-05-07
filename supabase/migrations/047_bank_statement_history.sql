CREATE TABLE IF NOT EXISTS public.bank_statement_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    parsed_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.bank_statement_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access bank_statement_history" ON public.bank_statement_history;
CREATE POLICY "Authenticated full access bank_statement_history" ON public.bank_statement_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
