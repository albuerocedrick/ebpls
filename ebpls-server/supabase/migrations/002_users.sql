-- =================================================================
-- Migration: 002_users.sql
-- Purpose:   Create the public.users profile table linked to auth.users,
--            and a trigger to auto-provision a user row on signup.
-- Author:    eBPLS Team
-- Policy:    Supabase Expert rule — user_id MUST reference auth.users(id).
--            Trigger auto-inserts on auth signup with default 'Applicant' role.
-- =================================================================

-- Create the public users profile table.
-- This is the authoritative profile table for the application layer.
-- auth.users (managed by Supabase Auth) is the source of truth for credentials.
CREATE TABLE IF NOT EXISTS public.users (
    user_id    UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email      VARCHAR(255) NOT NULL UNIQUE,
    role_id    INTEGER      NOT NULL DEFAULT 1 REFERENCES public.roles (role_id),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users            IS 'Public user profiles. 1:1 mirror of auth.users with RBAC role assignment.';
COMMENT ON COLUMN public.users.user_id   IS 'PK and FK to auth.users(id). Cascades on auth user deletion.';
COMMENT ON COLUMN public.users.email     IS 'Denormalized from auth.users for efficient query joins.';
COMMENT ON COLUMN public.users.role_id   IS 'FK to roles. Defaults to 1 (Applicant) on registration.';
COMMENT ON COLUMN public.users.is_active IS 'Admin-controlled flag. Inactive users are blocked from all API access.';

-- =================================================================
-- TRIGGER: Auto-provision public.users on auth.users signup
-- =================================================================
-- This function is called by Supabase's auth system after a new user
-- completes registration. It creates the corresponding public profile
-- automatically, preventing orphaned auth accounts.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (user_id, email, role_id)
    VALUES (
        NEW.id,
        NEW.email,
        1 -- Default role: 'Applicant' (role_id = 1 from 001_roles.sql seed)
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
    'Trigger function: Auto-creates a public.users row when auth.users gains a new entry. Defaults to Applicant role.';

-- Bind the trigger to the auth schema's users table.
-- This fires AFTER each INSERT on auth.users (i.e., after successful signup).
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
