-- Migration: Multi-College Support
-- Adds a `colleges` table, maps email domains to colleges,
-- attaches college_id to all user-owned data tables, and locks down
-- RLS so users from different colleges never see each other.

-- ================================================
-- 1. COLLEGES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS colleges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    domain      TEXT NOT NULL UNIQUE,   -- e.g. 'ssim.ac.in'
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (public can SELECT active colleges for domain validation at signup)
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active colleges" ON colleges;
CREATE POLICY "Anyone can read active colleges" ON colleges
    FOR SELECT USING (true);

-- ================================================
-- 2. SEED DEFAULT ACTIVE COLLEGES
-- ================================================
INSERT INTO colleges (name, domain, is_active) VALUES
    ('SSIM - Siva Sivani Institute of Management', 'ssim.ac.in', true)
ON CONFLICT (domain) DO NOTHING;

-- ================================================
-- 3. ADD college_id TO profiles_private
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles_private' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE profiles_private
            ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ================================================
-- 4. ADD college_id TO profiles_public
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles_public' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE profiles_public
            ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ================================================
-- 5. ADD college_id TO vibes
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vibes' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE vibes
            ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ================================================
-- 6. ADD college_id TO stories
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stories' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE stories
            ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ================================================
-- 7. ADD college_id TO matches
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'matches' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE matches
            ADD COLUMN college_id UUID REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ================================================
-- 8. HELPER FUNCTION — get the logged-in user's college_id
-- ================================================
CREATE OR REPLACE FUNCTION get_my_college_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT college_id FROM profiles_public WHERE id = auth.uid() LIMIT 1;
$$;

-- ================================================
-- 9. BACKFILL existing profiles from auth.users email
-- ================================================
-- Assign college_id to existing users based on their email domain.
UPDATE profiles_public pp
SET college_id = c.id
FROM auth.users u
JOIN colleges c ON c.is_active = true
    AND u.email ILIKE ('%@' || c.domain)
WHERE u.id = pp.id
  AND pp.college_id IS NULL;

UPDATE profiles_private pr
SET college_id = pp.college_id
FROM profiles_public pp
WHERE pp.id = pr.id
  AND pr.college_id IS NULL
  AND pp.college_id IS NOT NULL;

-- Backfill vibes from the author's profile
UPDATE vibes v
SET college_id = pp.college_id
FROM profiles_public pp
WHERE pp.id = v.user_id
  AND v.college_id IS NULL
  AND pp.college_id IS NOT NULL;

-- Backfill stories from the author's profile
UPDATE stories s
SET college_id = pp.college_id
FROM profiles_public pp
WHERE pp.id = s.user_id
  AND s.college_id IS NULL
  AND pp.college_id IS NOT NULL;

-- Backfill matches from user_1's profile
UPDATE matches m
SET college_id = pp.college_id
FROM profiles_public pp
WHERE pp.id = m.user_1_id
  AND m.college_id IS NULL
  AND pp.college_id IS NOT NULL;

-- ================================================
-- 10. TRIGGER — auto-stamp college_id on new vibes
-- ================================================
CREATE OR REPLACE FUNCTION stamp_vibe_college_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.college_id IS NULL THEN
        NEW.college_id := (
            SELECT college_id FROM profiles_public WHERE id = NEW.user_id LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_vibe_college ON vibes;
CREATE TRIGGER trg_stamp_vibe_college
    BEFORE INSERT ON vibes
    FOR EACH ROW EXECUTE FUNCTION stamp_vibe_college_id();

-- ================================================
-- 11. TRIGGER — auto-stamp college_id on new stories
-- ================================================
CREATE OR REPLACE FUNCTION stamp_story_college_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.college_id IS NULL THEN
        NEW.college_id := (
            SELECT college_id FROM profiles_public WHERE id = NEW.user_id LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_story_college ON stories;
CREATE TRIGGER trg_stamp_story_college
    BEFORE INSERT ON stories
    FOR EACH ROW EXECUTE FUNCTION stamp_story_college_id();

-- ================================================
-- 12. TRIGGER — auto-stamp + enforce college_id on new matches
--    (both users must belong to the same college)
-- ================================================
CREATE OR REPLACE FUNCTION stamp_and_validate_match_college()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    c1 UUID;
    c2 UUID;
BEGIN
    SELECT college_id INTO c1 FROM profiles_public WHERE id = NEW.user_1_id;
    SELECT college_id INTO c2 FROM profiles_public WHERE id = NEW.user_2_id;

    IF c1 IS DISTINCT FROM c2 THEN
        RAISE EXCEPTION 'Cross-college matches are not allowed.';
    END IF;

    IF NEW.college_id IS NULL THEN
        NEW.college_id := c1;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_match_college ON matches;
CREATE TRIGGER trg_stamp_match_college
    BEFORE INSERT ON matches
    FOR EACH ROW EXECUTE FUNCTION stamp_and_validate_match_college();

-- ================================================
-- 13. UPDATE RLS POLICIES — profiles_public (scope by college)
-- ================================================

-- Drop old broad policy
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles_public;

-- New scoped policy: only see profiles in your college
CREATE POLICY "College members can view profiles in same college" ON profiles_public
    FOR SELECT USING (
        -- Allow during onboarding (own row always visible)
        auth.uid() = id
        OR
        college_id = get_my_college_id()
    );

-- ================================================
-- 14. UPDATE RLS POLICIES — vibes (scope by college)
-- ================================================

DROP POLICY IF EXISTS "Vibes are viewable by authenticated users" ON vibes;
CREATE POLICY "College members can view vibes in same college" ON vibes
    FOR SELECT USING (
        college_id = get_my_college_id()
    );

DROP POLICY IF EXISTS "Users can insert their own vibes" ON vibes;
CREATE POLICY "Users can insert their own vibes (college scoped)" ON vibes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND college_id = get_my_college_id()
    );

-- ================================================
-- 15. UPDATE RLS POLICIES — vibe_comments (scope via parent vibe)
-- ================================================

DROP POLICY IF EXISTS "Vibe comments are viewable by authenticated users" ON vibe_comments;
CREATE POLICY "College members can view vibe comments in same college" ON vibe_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vibes v
            WHERE v.id = vibe_comments.vibe_id
              AND v.college_id = get_my_college_id()
        )
    );

-- ================================================
-- 16. UPDATE RLS POLICIES — vibe_likes (scope via parent vibe)
-- ================================================

DROP POLICY IF EXISTS "Vibe likes are viewable by authenticated users" ON vibe_likes;
CREATE POLICY "College members can view vibe likes in same college" ON vibe_likes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vibes v
            WHERE v.id = vibe_likes.vibe_id
              AND v.college_id = get_my_college_id()
        )
    );

-- ================================================
-- 17. UPDATE RLS POLICIES — stories (scope by college)
-- ================================================
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
CREATE POLICY "College members can view stories in same college" ON stories
    FOR SELECT USING (
        college_id = get_my_college_id()
    );

-- ================================================
-- 18. CREATE INDEX for performance
-- ================================================
CREATE INDEX IF NOT EXISTS idx_profiles_public_college_id ON profiles_public(college_id);
CREATE INDEX IF NOT EXISTS idx_vibes_college_id ON vibes(college_id);
CREATE INDEX IF NOT EXISTS idx_stories_college_id ON stories(college_id);
CREATE INDEX IF NOT EXISTS idx_matches_college_id ON matches(college_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
