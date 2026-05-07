-- Script to create public bucket if not exists and set up RLS policies
-- Run this in your Supabase SQL Editor

-- 1. Create the public bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Note: storage.objects already has RLS enabled by default in Supabase.
-- We only need to add the policies.

-- 2. Allow public read access to the 'public' bucket
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public');

-- 3. Allow anyone to upload files to the 'public' bucket
DROP POLICY IF EXISTS "Authenticated Users Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
CREATE POLICY "Public Upload Access"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'public');

-- 4. Allow anyone to update files in the 'public' bucket
DROP POLICY IF EXISTS "Users Update Own Files" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
CREATE POLICY "Public Update Access"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'public');

-- 5. Allow anyone to delete files in the 'public' bucket
DROP POLICY IF EXISTS "Users Delete Own Files" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
CREATE POLICY "Public Delete Access"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'public');
