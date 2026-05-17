-- =================================================================
-- Migration: 031_system_settings_lookup.sql
-- Purpose:   Create the system_settings table for Municipal Profile
--            and Signatories configuration.
-- Author:    eBPLS Team
-- =================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value VARCHAR(255) NOT NULL,
    description TEXT
);

COMMENT ON TABLE public.system_settings IS 'Global system configuration key-value pairs (e.g. Signatories, LGU profile).';

-- Seed default values
INSERT INTO public.system_settings (key, value, description) VALUES
    ('MAYOR_NAME', 'Hon. Mayor Name', 'Current Municipal Mayor for Permit Signatures'),
    ('BPLO_CHIEF_NAME', 'Juan Dela Cruz', 'Current BPLO Chief for Permit Signatures'),
    ('TREASURER_NAME', 'Maria Clara', 'Current Municipal Treasurer for Permit Signatures'),
    ('MUNICIPALITY_NAME', 'Municipality of Liliw', 'Official LGU Name'),
    ('PROVINCE_NAME', 'Laguna', 'Official LGU Province'),
    ('CONTACT_EMAIL', 'bplo@liliw.gov.ph', 'Official BPLO Contact Email'),
    ('CONTACT_PHONE', '(049) 123-4567', 'Official BPLO Contact Number')
ON CONFLICT (key) DO NOTHING;
