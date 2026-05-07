-- =================================================================
-- Migration: 006_verifications.sql
-- Purpose:   Create document verification checklist tables for the BPLO module.
--            Also defines clearance_types lookup used by the Barangay module (007).
-- Author:    eBPLS Team
-- Policy:    BPLO Officers can only transition applications they are reviewing.
--            All checklist items must reach 'Verified' or 'Not Needed' before
--            the application can progress to 'Verified' status.
--            RLS enforcement deferred to 013_rls_policies.sql.
-- =================================================================

-- ---------------------------------------------------------------
-- Lookup: requirement_types
-- Defines the standard document requirements BPLO officers check.
-- Kept as a lookup table so Admin can manage the list via the Admin Module.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requirement_types (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE  public.requirement_types             IS 'Admin-managed lookup of document requirements checked during BPLO verification.';
COMMENT ON COLUMN public.requirement_types.is_active   IS 'Allows Admin to retire outdated requirement types without deleting historical records.';

-- Seed standard BPLO document requirements for business permit applications
INSERT INTO public.requirement_types (name, description) VALUES
    ('DTI / SEC / CDA Registration',    'Proof of legal business registration with DTI (Sole Prop), SEC (Corp/Partnership), or CDA (Coop).'),
    ('Barangay Business Clearance',     'Clearance issued by the Barangay where the business is located.'),
    ('Fire Safety Inspection Certificate', 'Issued by the Bureau of Fire Protection (BFP) after premises inspection.'),
    ('Sanitary Permit',                 'Issued by the Municipal Health Office after sanitary inspection.'),
    ('Zoning Clearance',                'Confirms business location complies with local zoning ordinances.'),
    ('Lease Contract / TCT',            'Proof of property ownership (TCT/OCT) or lease agreement if renting.'),
    ('Community Tax Certificate (CTC)', 'Cedula of the business owner for the current year.'),
    ('Previous Year Business Permit',   'Required for Renewal applications only.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------
-- Lookup: clearance_types
-- Defines categories of clearances that can be issued by Barangay officers.
-- Used by the barangay_clearances table in 007_barangay.sql.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clearance_types (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

COMMENT ON TABLE public.clearance_types IS 'Lookup for types of barangay clearances. Referenced by barangay_clearances in 007_barangay.sql.';

INSERT INTO public.clearance_types (name) VALUES
    ('Business Clearance'),
    ('Residential Clearance'),
    ('Good Moral Character')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------
-- Table: doc_verifications
-- One row per requirement_type per application.
-- BPLO officer updates each row as they check documents.
-- ALL rows for an application must be 'Verified' or 'Not Needed'
-- before the application status can transition to 'Verified'.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doc_verifications (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no   VARCHAR(20)   NOT NULL REFERENCES public.applications (application_no) ON DELETE CASCADE,
    requirement_id   INTEGER       NOT NULL REFERENCES public.requirement_types (id),

    -- Verification status per document
    -- 'Not Needed' allows BPLO to skip requirements not applicable to this business type
    status           VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                                   CHECK (status IN ('Pending', 'Verified', 'Returned', 'Not Needed')),

    -- Remarks are mandatory when marking a document as 'Returned'
    remarks          TEXT,

    -- The BPLO officer who last updated this checklist item
    verified_by      UUID          REFERENCES public.users (user_id) ON DELETE SET NULL,
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Prevent duplicate checklist entries for the same requirement on the same application
    UNIQUE (application_no, requirement_id)
);

COMMENT ON TABLE  public.doc_verifications                IS 'BPLO verification checklist. One row per requirement per application.';
COMMENT ON COLUMN public.doc_verifications.status        IS 'Pending=not yet reviewed, Verified=approved, Returned=needs resubmission, Not Needed=not applicable.';
COMMENT ON COLUMN public.doc_verifications.remarks       IS 'Mandatory when status is Returned. Explains what the applicant must fix.';
COMMENT ON COLUMN public.doc_verifications.verified_by   IS 'UUID of BPLO Officer who last updated this row. SET NULL on user deletion to preserve the record.';

CREATE OR REPLACE TRIGGER doc_verifications_set_updated_at
    BEFORE UPDATE ON public.doc_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
