-- Migration: Add Vibe Likes and Ensure Vibe Relationships
-- This migration ensures the vibes table exists and adds the vibe_likes table with proper relationships.

-- 1. Ensure vibes table (just in case it's missing or needs checking)
CREATE TABLE IF NOT EXISTS vibes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    vibe_category TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create vibe_likes table
CREATE TABLE IF NOT EXISTS vibe_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vibe_id UUID REFERENCES vibes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(vibe_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE vibes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_likes ENABLE ROW LEVEL SECURITY;

-- 4. Vibes Policies
DROP POLICY IF EXISTS "Vibes are viewable by authenticated users" ON vibes;
CREATE POLICY "Vibes are viewable by authenticated users" ON vibes
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert their own vibes" ON vibes;
CREATE POLICY "Users can insert their own vibes" ON vibes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Vibe Likes Policies
DROP POLICY IF EXISTS "Vibe likes are viewable by authenticated users" ON vibe_likes;
CREATE POLICY "Vibe likes are viewable by authenticated users" ON vibe_likes
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage their own vibe likes" ON vibe_likes;
CREATE POLICY "Users can manage their own vibe likes" ON vibe_likes
    FOR ALL USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
