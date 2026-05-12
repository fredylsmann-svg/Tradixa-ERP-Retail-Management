-- Add missing columns to follow_up_reminders table based on CustomerProfile requirements
ALTER TABLE follow_up_reminders 
ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS due_date TEXT DEFAULT '';
