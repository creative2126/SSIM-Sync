-- Migration: Advanced Chat Features
-- 1. Add last_seen to profiles_public for online status tracking
ALTER TABLE profiles_public ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Add advanced fields to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- 3. Update RLS policies for messages to permit updates (for reactions)
DROP POLICY IF EXISTS "Users can update their own message reactions" ON messages;
CREATE POLICY "Users can update message reactions" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = messages.match_id AND (m.user_1_id = auth.uid() OR m.user_2_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = messages.match_id AND (m.user_1_id = auth.uid() OR m.user_2_id = auth.uid())
        )
    );
