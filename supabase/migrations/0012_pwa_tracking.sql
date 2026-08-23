-- Migration: Add PWA installation tracking to profiles_public
-- Run this in the Supabase SQL Editor

ALTER TABLE public.profiles_public
ADD COLUMN IF NOT EXISTS is_pwa_installed BOOLEAN DEFAULT FALSE;

-- Add a comment for clarity
COMMENT ON COLUMN public.profiles_public.is_pwa_installed IS 'True if the user has launched the app via the installed PWA (home screen shortcut).';
