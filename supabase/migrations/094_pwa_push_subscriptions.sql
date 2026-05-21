-- Migration 094: Create user_push_subscriptions table for PWA FCM tokens
CREATE TABLE public.user_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    fcm_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for select: Users can view their own subscriptions
CREATE POLICY "Users can view their own push subscriptions"
ON public.user_push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for insert: Users can insert their own subscriptions
CREATE POLICY "Users can insert their own push subscriptions"
ON public.user_push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for update: Users can update their own subscriptions
CREATE POLICY "Users can update their own push subscriptions"
ON public.user_push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for delete: Users can delete their own subscriptions
CREATE POLICY "Users can delete their own push subscriptions"
ON public.user_push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);
