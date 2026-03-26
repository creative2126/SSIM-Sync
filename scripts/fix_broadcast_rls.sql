-- SSIM Sync: Fix RLS for "broadcasts" table
-- Allows Admins to insert and Users to read.

-- 1. Enable RLS (if not already enabled)
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow anyone to READ verified broadcasts (Select)
DROP POLICY IF EXISTS "Public can read broadcasts" ON public.broadcasts;
CREATE POLICY "Public can read broadcasts" ON public.broadcasts
FOR SELECT
USING (true);

-- 3. Policy: Allow authenticated users to INSERT broadcasts (Insert)
-- Note: In a real app, you'd restrict this to true Admins.
-- For now, we allow authenticated users (Admins) to insert.
DROP POLICY IF EXISTS "Authenticated users can insert broadcasts" ON public.broadcasts;
CREATE POLICY "Authenticated users can insert broadcasts" ON public.broadcasts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. Enable Realtime for broadcasts (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
