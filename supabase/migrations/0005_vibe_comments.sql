-- Migration: Add Comments to Vibes
-- This migration adds a table for comments on vibes and sets up RLS.

CREATE TABLE IF NOT EXISTS vibe_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vibe_id UUID REFERENCES vibes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE vibe_comments ENABLE ROW LEVEL SECURITY;

-- Select policy: Authenticated users can view comments
DROP POLICY IF EXISTS "Vibe comments are viewable by authenticated users" ON vibe_comments;
CREATE POLICY "Vibe comments are viewable by authenticated users" ON vibe_comments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert policy: Users can insert their own comments
DROP POLICY IF EXISTS "Users can insert their own vibe comments" ON vibe_comments;
CREATE POLICY "Users can insert their own vibe comments" ON vibe_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Delete policy: Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own vibe comments" ON vibe_comments;
CREATE POLICY "Users can delete their own vibe comments" ON vibe_comments
    FOR DELETE USING (auth.uid() = user_id);
