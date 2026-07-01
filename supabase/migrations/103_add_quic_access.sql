ALTER TABLE users
ADD COLUMN IF NOT EXISTS quick_access_modules jsonb DEFAULT '[]'::jsonb;
