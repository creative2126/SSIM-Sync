-- SSIM Sync: User Demo Status Fix
-- Adds the is_demo flag and updates existing seeded users

-- 1. Add is_demo column to profiles_public
ALTER TABLE public.profiles_public ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- 2. Mark existing demo users as is_demo = true
-- Identify by their @ssim-sync.com email suffix in the private table
UPDATE public.profiles_public
SET is_demo = true
WHERE id IN (
    SELECT id FROM public.profiles_private 
    WHERE email LIKE '%@ssim-sync.com'
);
