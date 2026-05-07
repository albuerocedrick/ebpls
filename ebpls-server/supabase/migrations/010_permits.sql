-- =================================================================
-- Migration: 010_permits.sql
-- Purpose:   Create business activities lookup, application activity
--            declarations, and the permit issuance tables.
-- Author:    eBPLS Team
-- Policy:    A single permit may cover multiple Lines of Business (LOB).
--            Each LOB declared in the UAF drives the fee assessment.
--            Per-LOB permits are generated via the PDF service using
--            permit_line_items (one row = one LOB = one permit page).
--            RLS enforcement deferred to 013_rls_policies.sql.
-- =================================================================

-- ---------------------------------------------------------------
-- Lookup: business_activities
-- Lines of Business (LOB) categories available for selection in the UAF.
-- Admin-managed — LGU can add or retire activity types without code changes.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_activities (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE  public.business_activities          IS 'Admin-managed Lines of Business (LOB) categories. Selected during UAF wizard by applicants.';
COMMENT ON COLUMN public.business_activities.is_active IS 'Allows retiring outdated activity types without deleting historical LOB records.';

-- Seed common LOB categories for Philippine LGU business permits
INSERT INTO public.business_activities (name) VALUES
    ('General Merchandise / Retail Trade'),
    ('Food and Beverage Service (Restaurant / Eatery / Carinderia)'),
    ('Food Manufacturing and Processing'),
    ('Wholesale Trade'),
    ('Personal Services (Salon, Spa, Laundry, etc.)'),
    ('Professional Services (Legal, Medical, Accounting, Consultancy)'),
    ('Financial Services (Lending, Pawnshop, Money Changer)'),
    ('Lodging / Accommodation Services'),
    ('Transportation and Logistics'),
    ('Construction and Contracting'),
    ('Educational Services'),
    ('Entertainment and Recreation'),
    ('Hardware and Construction Materials'),
    ('Agricultural Products and Supplies'),
    ('Pharmaceutical / Drug Store'),
    ('Information Technology and Communications'),
    ('Real Estate Activities'),
    ('Other Services')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------
-- Table: application_activities
-- Junction table: declares which LOBs an application covers,
-- along with the capitalization and prior year gross sales used
-- for fee assessment by the Treasury Officer.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_activities (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no   VARCHAR(20)   NOT NULL REFERENCES public.applications (application_no) ON DELETE CASCADE,
    activity_id      INTEGER       NOT NULL REFERENCES public.business_activities (id),

    -- Financial figures declared by the applicant for this specific LOB.
    -- These are the inputs to the assessment.service.js fee calculation engine.
    capitalization        NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (capitalization >= 0),
    gross_sales_prev_year NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (gross_sales_prev_year >= 0),

    -- Prevent the same LOB being declared twice on one application
    UNIQUE (application_no, activity_id)
);

COMMENT ON TABLE  public.application_activities                          IS 'Declared Lines of Business per application. Drives fee assessment calculations in Treasury.';
COMMENT ON COLUMN public.application_activities.capitalization           IS 'Initial capital for this LOB. Used for New applications without prior gross sales data.';
COMMENT ON COLUMN public.application_activities.gross_sales_prev_year   IS 'Gross sales from preceding year for this LOB. Primary input for Renewal fee schedules.';

-- ---------------------------------------------------------------
-- Table: permits
-- The officially issued Business Permit record.
-- Created by the system when an application reaches 'Completed' status
-- and the PDF generation service runs.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permits (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no  VARCHAR(20)   NOT NULL UNIQUE REFERENCES public.applications (application_no) ON DELETE RESTRICT,

    -- Government-issued permit number. Format determined by Admin/LGU.
    -- Example: BP-2026-00001
    permit_no       VARCHAR(50)   NOT NULL UNIQUE,

    -- Validity window — standard LGU practice: Jan 1 to Dec 31 of the issued year.
    issued_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ   NOT NULL,               -- Must be set explicitly; no default assumption

    -- The BPLO Officer or System user who formally issued the permit
    issued_by       UUID          NOT NULL REFERENCES public.users (user_id) ON DELETE RESTRICT,

    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.permits              IS 'Issued business permits. One per completed application. Drives PDF generation endpoint.';
COMMENT ON COLUMN public.permits.permit_no    IS 'Official LGU permit reference number. Format: BP-{YEAR}-{NNNNN}.';
COMMENT ON COLUMN public.permits.expires_at   IS 'Permit expiry. Explicitly set by the permit generation service — typically Dec 31 of the issued year.';

-- ---------------------------------------------------------------
-- Table: permit_line_items
-- One row per Line of Business declared on the permit.
-- Each row corresponds to one LOB page in the generated PDF permit.
-- Enables the per-LOB permit API endpoint:
--   GET /api/documents/permit/:app_no?lob=:activity_id
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permit_line_items (
    id          UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_id   UUID     NOT NULL REFERENCES public.permits (id) ON DELETE CASCADE,
    activity_id INTEGER  NOT NULL REFERENCES public.business_activities (id),

    -- Prevent duplicate LOBs on the same permit
    UNIQUE (permit_id, activity_id)
);

COMMENT ON TABLE  public.permit_line_items             IS 'Per-LOB line items on an issued permit. Each row = one LOB = one permit page in the PDF.';
COMMENT ON COLUMN public.permit_line_items.activity_id IS 'FK to business_activities. Enables per-LOB permit PDF generation via ?lob= query param.';
