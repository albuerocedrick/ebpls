-- =================================================================
-- Migration: 001_roles.sql
-- Purpose:   Create the roles lookup table and seed the 5 core RBAC roles.
-- Author:    eBPLS Team
-- Policy:    Follows 3NF normalization. RLS is enabled via 013_rls_policies.sql.
-- =================================================================

-- Create the roles table.
-- Using a simple integer PK as this is a small, static lookup table.
CREATE TABLE IF NOT EXISTS public.roles (
    role_id   SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

COMMENT ON TABLE  public.roles            IS 'Static lookup table defining the 5 RBAC roles in eBPLS.';
COMMENT ON COLUMN public.roles.role_id   IS 'Internal auto-incremented primary key.';
COMMENT ON COLUMN public.roles.role_name IS 'Unique human-readable role name enforced across the entire system.';

-- Seed the 5 core roles as defined by the System Architecture RBAC rules.
-- These names are canonical and MUST match the constants in the backend (src/utils/constants.js).
INSERT INTO public.roles (role_name) VALUES
    ('Applicant'),
    ('BPLO_Officer'),
    ('Treasury_Officer'),
    ('Barangay_Officer'),
    ('Admin')
ON CONFLICT (role_name) DO NOTHING;
