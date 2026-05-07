-- Add subscription plan fields to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Create subscriptions table for billing history
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_method TEXT,
  amount INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
