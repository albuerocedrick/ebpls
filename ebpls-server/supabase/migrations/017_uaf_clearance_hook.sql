-- =================================================================
-- Migration: 017_uaf_clearance_hook.sql
-- Purpose:   Create an atomic RPC function for the Phase 3C UAF
--            Barangay Clearance Hook. This function is called by
--            application.service.js during final UAF submission.
--
-- Behaviour:
--   PATH A (request_clearance = TRUE):
--     1. Insert barangay_clearances row (status = 'Pending')
--     2. Insert doc_verifications row (status = 'Awaiting Issuance')
--     Both inserts are in the same transaction — atomically.
--
--   PATH B (request_clearance = FALSE):
--     1. Insert ONLY a doc_verifications row (status = 'Pending')
--        so BPLO can track the manually-uploaded clearance document.
--     No barangay_clearances record is created.
--
-- Guard: Uses ON CONFLICT DO NOTHING on both tables to be
--        idempotent against accidental duplicate calls.
-- =================================================================

CREATE OR REPLACE FUNCTION public.uaf_create_barangay_clearance_hook(
    p_application_no     VARCHAR(20),
    p_clearance_type_id  INTEGER,
    p_requirement_id     INTEGER,
    p_request_clearance  BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_request_clearance THEN
        -- PATH A: Applicant wants the municipality to request clearance on their behalf.
        -- Insert barangay_clearances record (status = 'Pending').
        INSERT INTO public.barangay_clearances (application_no, clearance_type_id, status)
        VALUES (p_application_no, p_clearance_type_id, 'Pending')
        ON CONFLICT (application_no, clearance_type_id) DO NOTHING;

        -- Insert doc_verifications record (status = 'Awaiting Issuance').
        -- This tells BPLO "the clearance request is in flight; do not reject the app yet."
        INSERT INTO public.doc_verifications (application_no, requirement_id, status)
        VALUES (p_application_no, p_requirement_id, 'Awaiting Issuance')
        ON CONFLICT (application_no, requirement_id) DO NOTHING;

    ELSE
        -- PATH B: Applicant will upload their own existing barangay clearance.
        -- Insert ONLY the doc_verifications record (status = 'Pending').
        -- BPLO must manually verify the uploaded document.
        INSERT INTO public.doc_verifications (application_no, requirement_id, status)
        VALUES (p_application_no, p_requirement_id, 'Pending')
        ON CONFLICT (application_no, requirement_id) DO NOTHING;

    END IF;
END;
$$;

COMMENT ON FUNCTION public.uaf_create_barangay_clearance_hook IS
    'Atomic UAF Phase 3C hook. Creates barangay_clearances + doc_verifications rows '
    'in one transaction when applicant requests clearance (PATH A), or only a '
    'doc_verifications row when applicant uploads their own clearance (PATH B).';

-- Grant execute to the service_role so the backend can call it via supabaseAdmin.
GRANT EXECUTE ON FUNCTION public.uaf_create_barangay_clearance_hook TO service_role;
