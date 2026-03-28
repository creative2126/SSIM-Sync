-- Phase 36: Persistent Discovery Rejections
CREATE TABLE IF NOT EXISTS feed_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    target_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- Phase 37: Mobile Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles_public(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- RLS for feed_passes
ALTER TABLE feed_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own passes" ON feed_passes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own passes" ON feed_passes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS for push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Admin God Mode Helper: Ensure Admin (Service Role) can see all messages
-- No changes needed as Service Role bypasses RLS, but for the local client
-- we can add a specific policy if we identify the admin by ID.
-- However, for now, we'll rely on the Admin Dashboard using the Supabase client
-- with the correct role or service key if available, or just standard RLS bypass if possible.
