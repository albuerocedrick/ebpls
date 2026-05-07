-- =================================================================
-- Migration: 004_businesses.sql
-- Purpose:   Create the organization_types lookup and businesses tables.
-- Author:    eBPLS Team
-- Policy:    3NF — org type data isolated in lookup table.
--            is_retired flag drives business cessation state machine.
--            OTC payment strict: no payment fields here — owned by treasury module.
-- =================================================================

-- ---------------------------------------------------------------
-- Lookup: organization_types
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_types (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

COMMENT ON TABLE  public.organization_types      IS 'Lookup table for business organization/entity types.';
COMMENT ON COLUMN public.organization_types.id   IS 'Auto-incremented PK for small static lookup.';
COMMENT ON COLUMN public.organization_types.name IS 'Unique entity type name (e.g. Sole Proprietorship).';

-- Seed standard Philippine business entity types
INSERT INTO public.organization_types (name) VALUES
    ('Sole Proprietorship'),
    ('Partnership'),
    ('Corporation'),
    ('Cooperative'),
    ('Non-Governmental Organization'),
    ('Government-Owned or Controlled Corporation')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------
-- Table: businesses
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
    business_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id       UUID          NOT NULL REFERENCES public.taxpayers (taxpayer_id) ON DELETE RESTRICT,

    -- Business identity
    business_name     VARCHAR(255)  NOT NULL,
    trade_name        VARCHAR(255),                   -- DBA / trade name if different
    org_type_id       INTEGER       NOT NULL REFERENCES public.organization_types (id),

    -- Registration details (DTI for Sole Prop, SEC for Corp/Partnership, CDA for Coop)
    dti_sec_cda_reg_no VARCHAR(100),

    -- Franchise flag — some businesses are operated under a franchise
    is_franchise      BOOLEAN       NOT NULL DEFAULT FALSE,
    franchisor_name   VARCHAR(255),                   -- Required if is_franchise = true

    -- Business physical address (may differ from taxpayer's address)
    address_line1     VARCHAR(255),
    barangay          VARCHAR(100),
    city              VARCHAR(100)  NOT NULL DEFAULT 'Liliw',
    province          VARCHAR(100)  NOT NULL DEFAULT 'Laguna',

    -- Geolocation from the Leaflet.js interactive map pin (UAF Step)
    -- Stored as DECIMAL to avoid PostGIS dependency for a simple lat/lng use case
    latitude          DECIMAL(10, 7),
    longitude         DECIMAL(10, 7),

    -- Cessation state — driven by the Retirement Module (Phase 7)
    is_retired        BOOLEAN       NOT NULL DEFAULT FALSE,
    retired_at        TIMESTAMPTZ,                    -- Set when retirement is completed

    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.businesses                  IS 'Business entities owned by taxpayers. Core subject of all permit applications.';
COMMENT ON COLUMN public.businesses.business_id      IS 'Server-generated UUID PK.';
COMMENT ON COLUMN public.businesses.taxpayer_id      IS 'FK to taxpayers. ON DELETE RESTRICT prevents data loss — retire the business first.';
COMMENT ON COLUMN public.businesses.trade_name       IS 'Trade/DBA name if different from legal business name.';
COMMENT ON COLUMN public.businesses.dti_sec_cda_reg_no IS 'Registration certificate number from DTI, SEC, or CDA depending on org type.';
COMMENT ON COLUMN public.businesses.is_franchise     IS 'True if this business operates under a franchise agreement.';
COMMENT ON COLUMN public.businesses.latitude         IS 'Geolocation latitude from the UAF location pin (Leaflet.js). Stored as DECIMAL(10,7).';
COMMENT ON COLUMN public.businesses.longitude        IS 'Geolocation longitude from the UAF location pin (Leaflet.js). Stored as DECIMAL(10,7).';
COMMENT ON COLUMN public.businesses.is_retired       IS 'Set to TRUE by the Retirement Module upon successful cessation.';
COMMENT ON COLUMN public.businesses.retired_at       IS 'Timestamp of retirement completion. Null while business is active.';

-- Bind the shared updated_at trigger (function defined in 003_taxpayers.sql)
CREATE OR REPLACE TRIGGER businesses_set_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
