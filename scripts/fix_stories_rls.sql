-- Fix RLS for Stories Moderation
-- This allows anyone to view stories (already likely true)
-- AND allows deletion by the owner OR anyone with an admin check (optional)

-- 1. Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone to SELECT stories (needed for the Feed)
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
CREATE POLICY "Stories are viewable by everyone" 
ON public.stories FOR SELECT 
USING (true);

-- 3. Allow deletion by owner
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories" 
ON public.stories FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Allow deletion by Admin (Manual Override)
-- If you want a specific user to be admin, replace 'USER_ID_HERE' with their actual UUID
-- DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;
-- CREATE POLICY "Admins can delete any story" 
-- ON public.stories FOR DELETE 
-- USING (auth.uid() = 'YOUR_ADMIN_UUID_HERE');

-- NOTE: For development, you can disable RLS temporarily on the stories table 
-- if you are the only one testing, but it's better to keep it on.
-- ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
