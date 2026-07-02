-- Migration 110: Fix Push Subscriptions Foreign Key
-- Date: 2026-07-02
-- Description: Drops the foreign key constraint to auth.users, clears old mismatched tokens, and points it to public.users.

-- 1. Clear all old tokens because their user_id is from auth.users (mismatched)
TRUNCATE TABLE public.user_push_subscriptions;

-- 2. Drop the foreign key constraint dynamically
DO $$ 
DECLARE 
    fk_name text; 
BEGIN 
    SELECT conname INTO fk_name 
    FROM pg_constraint 
    WHERE conrelid = 'public.user_push_subscriptions'::regclass 
      AND confrelid = 'auth.users'::regclass; 
      
    IF fk_name IS NOT NULL THEN 
        EXECUTE 'ALTER TABLE public.user_push_subscriptions DROP CONSTRAINT ' || fk_name; 
    END IF; 
END $$;

-- 3. Add the correct foreign key constraint to public.users
ALTER TABLE public.user_push_subscriptions
ADD CONSTRAINT user_push_subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Update RLS policies to match public.users instead of auth.users
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.user_push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.user_push_subscriptions;

CREATE POLICY "Users can view their own push subscriptions"
ON public.user_push_subscriptions
FOR SELECT
USING (
    user_id = (SELECT id FROM public.users WHERE email = auth.jwt() ->> 'email' LIMIT 1)
);
