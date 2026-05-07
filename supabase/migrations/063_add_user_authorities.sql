-- Migration: Add User Authorities (Advanced DoA)
-- This migration adds fine-grained Role-Based Access Control and limits for the enterprise version.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS authorities JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS approval_limit NUMERIC DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS max_discount_limit NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.users.authorities IS 'Array of specific authority tags (e.g. APPROVE_PR, SIGN_GRN)';
COMMENT ON COLUMN public.users.approval_limit IS 'Maximum nominal limit (in Rp) this user can approve. 0 = no authority or unlimited depending on role setup.';
COMMENT ON COLUMN public.users.max_discount_limit IS 'Maximum percentage (%) discount this user can create in promotions.';
