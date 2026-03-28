-- Phase 38 FIX: Replace recursive RLS policy with a dedicated admin_users table
-- The previous policy caused infinite recursion by checking profiles_private within profiles_private.

-- 1. Create a separate admin table (no RLS recursion possible)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- No RLS on admin_users — only reachable by service role or policies that reference it
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Allow admins to see the admin list (self-reference is okay since it's a simple id check)
DROP POLICY IF EXISTS "Admin users can view admin list" ON admin_users;
CREATE POLICY "Admin users can view admin list" ON admin_users
    FOR SELECT USING (auth.uid() = id);

-- 2. Fix profiles_private RLS — use admin_users table (no recursion)
DROP POLICY IF EXISTS "Admins can view all private profiles" ON profiles_private;
CREATE POLICY "Admins can view all private profiles" ON profiles_private
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- 3. Fix god mode policies for matches and messages — use admin_users (no recursion)
DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
CREATE POLICY "Admins can view all matches" ON matches
    FOR SELECT USING (
        auth.uid() = user_1_id 
        OR auth.uid() = user_2_id
        OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
CREATE POLICY "Admins can view all messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = messages.match_id AND (m.user_1_id = auth.uid() OR m.user_2_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

-- 4. INSERT YOUR USER HERE — replace with your actual Supabase user ID or email match
-- Find your user ID from: Supabase Dashboard → Authentication → Users
-- Then run: INSERT INTO admin_users (id) VALUES ('your-uuid-here') ON CONFLICT DO NOTHING;
