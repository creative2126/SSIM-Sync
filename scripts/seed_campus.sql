-- SSIM Sync: Campus Seeding SQL Script (Supabase Editor)
-- This script creates 15 diverse student profiles (8 Girls, 7 Boys) 
-- It populates auth.users, profiles_private, and profiles_public.

-- ⚠️ RUN THIS IN THE SUPABASE SQL EDITOR

DO $$
DECLARE
    dummy_email TEXT;
    dummy_id UUID;
    vibe_cat TEXT;
BEGIN
    -- --- 8 GIRL PROFILES ---
    FOR i IN 1..8 LOOP
        dummy_email := 'girl' || i || '@ssim-sync.com';
        dummy_id := gen_random_uuid();
        
        -- 1. Create User in auth.users (Internal Supabase Table)
        -- We set email_confirmed_at so they are immediately active
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
        VALUES (
            dummy_id, 
            '00000000-0000-0000-0000-000000000000', 
            dummy_email, 
            crypt('demo1234', gen_salt('bf')), 
            now(), 
            '{"provider":"email","providers":["email"]}', 
            '{}', 
            false, 
            'authenticated'
        );

        -- 2. Create Private Profile
        INSERT INTO public.profiles_private (id, real_name, email, verification_status)
        VALUES (dummy_id, 'Demo Student F' || i, dummy_email, 'verified');

        -- 3. Create Public Profile with Diverse Aliases
        INSERT INTO public.profiles_public (id, alias, gender, bio, vibe_scores, is_demo)
        VALUES (
            dummy_id,
            CASE 
                WHEN i = 1 THEN 'MoonFlower'
                WHEN i = 2 THEN 'TechQueen'
                WHEN i = 3 THEN 'VibeCatcher'
                WHEN i = 4 THEN 'DeepThinker'
                WHEN i = 5 THEN 'GymRat_G'
                WHEN i = 6 THEN 'AnimeSolo'
                WHEN i = 7 THEN 'PoetrySoul'
                ELSE 'CoffeeMunch'
            END,
            'Female',
            CASE 
                WHEN i = 1 THEN 'Finding beauty in the small things. ✨'
                WHEN i = 2 THEN 'I speak Fluent JavaScript and Sarcasm. 💻'
                WHEN i = 3 THEN 'Here for a good time and shared vibes! 🍹'
                WHEN i = 4 THEN 'Let’s talk about life, the universe, and tea. 🧘'
                WHEN i = 5 THEN 'Weights before dates, but vibes before both. 💪'
                WHEN i = 6 THEN 'Waiting for my isekai adventure. 🦊'
                WHEN i = 7 THEN 'Words are better than people sometimes. 🖋️'
                ELSE 'Canteen regular. Always down for coffee. ☕'
            END,
            jsonb_build_object(
                'social', i % 5 + 1,
                'intellect', i * 2 % 5 + 1,
                'chill', i * 3 % 5 + 1
            ),
            true
        );

        -- 4. Seed an initial story for each
        vibe_cat := CASE WHEN i % 2 = 0 THEN 'Social' ELSE 'Study' END;
        INSERT INTO public.stories (user_id, content, vibe_category, expires_at)
        VALUES (dummy_id, 'Who is up for a ' || vibe_cat || ' vibe? ✨', vibe_cat, now() + interval '24 hours');

    END LOOP;

    -- --- 7 BOY PROFILES ---
    FOR i IN 1..7 LOOP
        dummy_email := 'boy' || i || '@ssim-sync.com';
        dummy_id := gen_random_uuid();
        
        -- 1. Create User
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
        VALUES (
            dummy_id, 
            '00000000-0000-0000-0000-000000000000', 
            dummy_email, 
            crypt('demo1234', gen_salt('bf')), 
            now(), 
            '{"provider":"email","providers":["email"]}', 
            '{}', 
            false, 
            'authenticated'
        );

        -- 2. Create Private Profile
        INSERT INTO public.profiles_private (id, real_name, email, verification_status)
        VALUES (dummy_id, 'Demo Student M' || i, dummy_email, 'verified');

        -- 3. Create Public Profile
        INSERT INTO public.profiles_public (id, alias, gender, bio, vibe_scores, is_demo)
        VALUES (
            dummy_id,
            CASE 
                WHEN i = 1 THEN 'CyberGhost'
                WHEN i = 2 THEN 'SportySam'
                WHEN i = 3 THEN 'MusicFreak'
                WHEN i = 4 THEN 'CodeCracker'
                WHEN i = 5 THEN 'WanderLust'
                WHEN i = 6 THEN 'MovieBuff'
                ELSE 'NightOwl'
            END,
            'Male',
            CASE 
                WHEN i = 1 THEN 'Disconnected from reality. 🕵️‍♂️'
                WHEN i = 2 THEN 'Cricket is not a game, it is a vibe. 🏏'
                WHEN i = 3 THEN 'Indie music is the only truth. 🎸'
                WHEN i = 4 THEN 'Debugging my life, one coffee at a time. ☕'
                WHEN i = 5 THEN 'Captured by the lens, lost in the world. 📸'
                WHEN i = 6 THEN 'Life is basically a movie with a bad plot. 🍿'
                ELSE 'Only active after midnight. 🌙'
            END,
            jsonb_build_object(
                'social', i % 5 + 1,
                'intellect', i * 2 % 5 + 1,
                'chill', i * 3 % 5 + 1
            ),
            true
        );

        -- 4. Seed an initial story for each
        vibe_cat := CASE WHEN i % 2 = 0 THEN 'Random' ELSE 'Deep Talk' END;
        INSERT INTO public.stories (user_id, content, vibe_category, expires_at)
        VALUES (dummy_id, 'Any ' || vibe_cat || ' vibes today? 🔥', vibe_cat, now() + interval '24 hours');

    END LOOP;
END $$;
