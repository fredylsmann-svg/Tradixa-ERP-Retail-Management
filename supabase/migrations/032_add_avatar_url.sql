-- 032: Add avatar_url columns for profile photo sync
-- ProfileAccount uploads photo → saves URL → Header reads URL

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_avatar_url TEXT;
