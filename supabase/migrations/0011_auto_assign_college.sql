-- Migration: Auto Assign College to New Users
-- Creates a trigger on auth.users to stamp the college_id on the user's profiles 
-- based on their email domain upon registration.

CREATE OR REPLACE FUNCTION public.handle_new_user_college_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_domain TEXT;
    v_college_id UUID;
BEGIN
    -- Extract the domain from the new user's email
    v_domain := split_part(NEW.email, '@', 2);
    
    -- If there's no domain, we can't assign a college
    IF v_domain IS NULL OR v_domain = '' THEN
        RETURN NEW;
    END IF;

    -- Look up the domain in the active colleges table
    SELECT id INTO v_college_id
    FROM public.colleges
    WHERE domain = v_domain AND is_active = true
    LIMIT 1;

    -- If we found a matching college, update the profile tables
    IF v_college_id IS NOT NULL THEN
        -- Update profiles_public
        UPDATE public.profiles_public
        SET college_id = v_college_id
        WHERE id = NEW.id;

        -- Update profiles_private if it exists and has the column
        UPDATE public.profiles_private
        SET college_id = v_college_id
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_stamp_college ON auth.users;
CREATE TRIGGER on_auth_user_created_stamp_college
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_college_stamp();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
