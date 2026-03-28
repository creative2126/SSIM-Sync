-- Phase 36: Enable God Mode RLS Bypass
-- 1. Add is_admin flag to profiles_private
ALTER TABLE profiles_private ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Update MATCHES RLS to allow admins to see everything
DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
CREATE POLICY "Admins can view all matches" ON matches
    FOR SELECT USING (
        (SELECT is_admin FROM profiles_private WHERE id = auth.uid()) = true
        OR auth.uid() = user_1_id 
        OR auth.uid() = user_2_id
    );

-- 3. Update MESSAGES RLS to allow admins to see everything
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
    FOR SELECT USING (
        (SELECT is_admin FROM profiles_private WHERE id = auth.uid()) = true
        OR EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = messages.match_id AND (m.user_1_id = auth.uid() OR m.user_2_id = auth.uid())
        )
    );

-- 4. Set the current user as admin (Optional: User should run this with their UID)
-- UPDATE profiles_private SET is_admin = true WHERE email = 'your-admin-email@example.com';

-- 5. Fix stories 400 error by ensuring created_at exists and RLS is open
ALTER TABLE stories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
CREATE POLICY "Stories are viewable by everyone" ON stories FOR SELECT USING (true);
