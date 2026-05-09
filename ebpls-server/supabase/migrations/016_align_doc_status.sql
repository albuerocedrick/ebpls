-- =================================================================
-- Migration: 016_align_doc_status.sql
-- Purpose:   Align doc_verifications status values with the new 
--            Yes/No design specification.
-- =================================================================

-- 1. Update doc_verifications status CHECK constraint
-- Drop the constraint created in 015 and recreate it with Yes/No values.
ALTER TABLE public.doc_verifications DROP CONSTRAINT IF EXISTS doc_verifications_status_check;
ALTER TABLE public.doc_verifications ADD CONSTRAINT doc_verifications_status_check 
    CHECK (status IN ('Pending', 'Verified', 'Returned', 'Yes', 'No', 'Not Needed', 'Awaiting Issuance'));

COMMENT ON COLUMN public.doc_verifications.status IS 'Pending=not yet reviewed, Verified/Yes=approved, Returned/No=needs resubmission, Not Needed=not applicable, Awaiting Issuance=waiting for barangay clearance.';
