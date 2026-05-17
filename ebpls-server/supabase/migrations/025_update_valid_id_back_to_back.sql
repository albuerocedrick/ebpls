-- =================================================================
-- Migration: 025_update_valid_id_back_to_back.sql
-- Purpose:   Rename "Owner's Valid ID" to "Owner's Valid ID (Front)"
--            and insert a new requirement for "Owner's Valid ID (Back)"
-- =================================================================

-- 1. Rename existing requirement to Front
UPDATE public.requirement_types 
SET 
    name = 'Owner''s Valid ID (Front)',
    description = 'Clear copy of the FRONT of any valid government-issued ID (e.g., Passport, Driver’s License, UMID) of the business owner.'
WHERE name = 'Owner''s Valid ID';

-- 2. Insert the Back requirement
INSERT INTO public.requirement_types (name, description) VALUES
    ('Owner''s Valid ID (Back)', 'Clear copy of the BACK of the same valid government-issued ID.')
ON CONFLICT (name) DO NOTHING;
