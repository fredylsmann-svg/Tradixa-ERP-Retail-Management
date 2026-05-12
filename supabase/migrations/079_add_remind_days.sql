-- Add remind_days_before for auto-trigger
ALTER TABLE follow_up_reminders 
ADD COLUMN IF NOT EXISTS remind_days_before INTEGER DEFAULT 0;
