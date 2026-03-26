-- Full Schema for SSIM Sync (With Row Level Security)

-- Enums
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE gender_type AS ENUM ('Male', 'Female');

-- Profiles (Private)
CREATE TABLE profiles_private (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    real_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    student_id_url TEXT,
    selfie_url TEXT,
    verification_status verification_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles (Public/Anonymous)
CREATE TABLE profiles_public (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    alias TEXT UNIQUE NOT NULL,
    bio TEXT,
    vibe_scores JSONB DEFAULT '{}'::jsonb,
    interests TEXT[] DEFAULT '{}',
    prompt_answers JSONB DEFAULT '[]'::jsonb,
    gender gender_type NOT NULL,
    age_visible BOOLEAN DEFAULT false,
    limited_initiations_count INT DEFAULT 0,
    last_initiation_reset TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Matches / Chats
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    user_2_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    is_revealed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_1_id, user_2_id)
);

-- Messages Table (Added for Phase 7 Chat)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 1. profiles_public (Everyone Authenticated can view public aliases, but only owners can edit)
CREATE POLICY "Public profiles are viewable by authenticated users" ON profiles_public
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Users can update their own public profile" ON profiles_public
    FOR UPDATE USING (auth.uid() = id);
    
CREATE POLICY "Users can insert their own public profile" ON profiles_public
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. profiles_private (Strictly locked. Only owner or admin can read/write)
-- Note: Supabase Service Role (Admin Dashboard backend) bypasses RLS automatically.
CREATE POLICY "Users can view their own private profile" ON profiles_private
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update their own private profile" ON profiles_private
    FOR UPDATE USING (auth.uid() = id);
    
CREATE POLICY "Users can insert their own private profile" ON profiles_private
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. matches (Users can only see matches they are a part of)
CREATE POLICY "Users can view their own matches" ON matches
    FOR SELECT USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE POLICY "Users can insert matches" ON matches
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own match reveals" ON matches
    FOR UPDATE USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- 4. messages (Users can only read/write messages in their own matches)
CREATE POLICY "Users can read their match messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = messages.match_id AND (m.user_1_id = auth.uid() OR m.user_2_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM matches m 
            WHERE m.id = messages.match_id AND (m.user_1_id = auth.uid() OR m.user_2_id = auth.uid())
        ) AND auth.uid() = sender_id
    );
