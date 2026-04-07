-- Migration: Email Notification Support
ALTER TABLE profiles_public ADD COLUMN IF NOT EXISTS last_email_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles_public ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;
