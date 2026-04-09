-- Migration: Reconcile Missing Schema and Components
-- This migration adds missing columns and tables identified during debugging.

-- 1. Add 'read_at' to messages (Missing in initial schema)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='read_at') THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Create 'broadcasts' table (Referenced in UI but missing)
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create 'blocks' table (Referenced in UI but missing)
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(blocker_id, blocked_id)
);

-- 4. Create 'feed_passes' table (Referenced in UI but missing)
CREATE TABLE IF NOT EXISTS feed_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- 5. Enable RLS and Policies for new tables
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broadcasts are viewable by authenticated users" ON broadcasts;
CREATE POLICY "Broadcasts are viewable by authenticated users" ON broadcasts
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage their own blocks" ON blocks;
CREATE POLICY "Users can manage their own blocks" ON blocks
    FOR ALL USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can manage their own feed passes" ON feed_passes;
CREATE POLICY "Users can manage their own feed passes" ON feed_passes
    FOR ALL USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
