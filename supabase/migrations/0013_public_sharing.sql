-- Migration: Enable public read access for vibes and public profiles to support sharing
-- Run this in the Supabase SQL Editor

-- 1. Allow anyone (including anonymous guests) to view public profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles_public;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles_public
    FOR SELECT USING (true);

-- 2. Allow anyone (including anonymous guests) to view vibes
DROP POLICY IF EXISTS "Vibes are viewable by everyone" ON public.vibes;
CREATE POLICY "Vibes are viewable by everyone" ON public.vibes
    FOR SELECT USING (true);
