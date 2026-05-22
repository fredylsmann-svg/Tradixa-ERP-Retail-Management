-- Migration 096: Create fund_transfers table with multi-role approval workflow
CREATE TABLE IF NOT EXISTS public.fund_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    from_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    fee NUMERIC(15, 2) DEFAULT 0 CHECK (fee >= 0),
    notes TEXT,
    document_url TEXT,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    requested_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    signature_data TEXT, -- Base64 digital signature
    reference VARCHAR(50) UNIQUE
);

-- RLS policies
ALTER TABLE public.fund_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for authenticated users" 
ON public.fund_transfers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Enable real-time for fund_transfers
alter publication supabase_realtime add table fund_transfers;
