-- Fix user_preferences table: create if not exists + proper RLS policies
-- Run this in Supabase SQL Editor

-- 1. Create table (skip if exists)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

-- 2. Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Store admins can see store preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

-- 4. Create proper policies using auth.uid() 
-- SELECT
CREATE POLICY "Users can read own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT  
CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE (optional cleanup)
CREATE POLICY "Users can delete own preferences"
  ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);
