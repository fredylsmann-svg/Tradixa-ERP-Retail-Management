-- Create user_preferences table for store-specific settings
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, store_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own preferences
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Stores can see their users' preferences (optional, but useful for admins)
CREATE POLICY "Store admins can see store preferences"
  ON user_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores 
      WHERE stores.id = user_preferences.store_id 
      AND stores.owner_user_id = auth.uid()::text
    )
  );
