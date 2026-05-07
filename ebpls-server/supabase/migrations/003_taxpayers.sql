-- =================================================================
-- Migration: 003_taxpayers.sql
-- Purpose:   Create the taxpayers profile table (1:1 with public.users).
-- Author:    eBPLS Team
-- Policy:    3NF — personal/taxpayer data is separated from auth identity.
--            One taxpayer record per user account (enforced by UNIQUE on user_id).
-- =================================================================

CREATE TABLE IF NOT EXISTS public.taxpayers (
    taxpayer_id  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL UNIQUE REFERENCES public.users (user_id) ON DELETE CASCADE,

    -- TIN is unique per taxpayer; nullable because it may not be provided at registration
    tin_no       VARCHAR(20)  UNIQUE,

    -- Personal info (3NF: stored once here, referenced everywhere else by taxpayer_id)
    first_name   VARCHAR(100) NOT NULL,
    middle_name  VARCHAR(100),
    last_name    VARCHAR(100) NOT NULL,
    suffix       VARCHAR(10),                      -- Jr., Sr., III, etc.
    contact_no   VARCHAR(20),

    -- Business address (main address for this taxpayer)
    address_line1 VARCHAR(255),
    barangay      VARCHAR(100),
    city          VARCHAR(100) NOT NULL DEFAULT 'Liliw',
    province      VARCHAR(100) NOT NULL DEFAULT 'Laguna',

    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.taxpayers              IS 'Taxpayer profile. 1:1 with public.users. Contains personal and address data.';
COMMENT ON COLUMN public.taxpayers.taxpayer_id  IS 'Server-generated UUID PK. Never exposed as a sequential ID.';
COMMENT ON COLUMN public.taxpayers.user_id      IS 'UNIQUE FK to public.users. Enforces the 1:1 relationship.';
COMMENT ON COLUMN public.taxpayers.tin_no       IS 'Tax Identification Number. Unique per taxpayer. Nullable at registration.';
COMMENT ON COLUMN public.taxpayers.city         IS 'Defaults to Liliw as the primary LGU jurisdiction.';

-- =================================================================
-- TRIGGER: Auto-update updated_at on row modification
-- =================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 
    'Generic trigger function to auto-update the updated_at column on any table row modification.';

CREATE OR REPLACE TRIGGER taxpayers_set_updated_at
    BEFORE UPDATE ON public.taxpayers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
