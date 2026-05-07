-- Script to force open public bucket uploads for local development
-- Run this in your Supabase SQL Editor

-- Drop ALL existing insert policies on storage.objects to avoid conflicts
DROP POLICY IF EXISTS "Authenticated Users Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;

-- Create a fully open policy for uploads to the 'public' bucket
CREATE POLICY "Public Upload Access"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'public');

-- Ensure anyone can read
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public');

-- Ensure anyone can update
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Users Update Own Files" ON storage.objects;
CREATE POLICY "Public Update Access"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'public');

-- Ensure anyone can delete
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Users Delete Own Files" ON storage.objects;
CREATE POLICY "Public Delete Access"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'public');
