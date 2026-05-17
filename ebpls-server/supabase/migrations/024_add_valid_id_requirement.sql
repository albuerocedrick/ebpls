-- =================================================================
-- Migration: 024_add_valid_id_requirement.sql
-- Purpose:   Add "Owner's Valid ID" to the requirement_types lookup table
--            so BPLO officers can verify it during the application review.
-- =================================================================

INSERT INTO public.requirement_types (name, description) VALUES
    ('Owner''s Valid ID', 'Clear copy of any valid government-issued ID (e.g., Passport, Driver’s License, UMID) of the business owner.')
ON CONFLICT (name) DO NOTHING;
