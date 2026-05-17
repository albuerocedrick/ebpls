-- =================================================================
-- Migration: 026_reset_clearance_status_on_resubmit.sql
-- Purpose:   Modify public.uaf_create_barangay_clearance_hook to reset
--            Barangay clearance statuses and remarks during resubmission.
--            Ensures that if an application was previously returned or
--            rejected, resubmission starts the Barangay flow fresh.
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
        -- Insert or Reset barangay_clearances record (status = 'Pending').
        INSERT INTO public.barangay_clearances (
            application_no, 
            clearance_type_id, 
            status, 
            clearance_no, 
            remarks, 
            processed_by, 
            issued_at, 
            expires_at
        )
        VALUES (
            p_application_no, 
            p_clearance_type_id, 
            'Pending', 
            NULL, 
            NULL, 
            NULL, 
            NULL, 
            NULL
        )
        ON CONFLICT (application_no, clearance_type_id) DO UPDATE
        SET status = 'Pending',
            clearance_no = NULL,
            remarks = NULL,
            processed_by = NULL,
            issued_at = NULL,
            expires_at = NULL,
            updated_at = NOW();

        -- Insert or Reset doc_verifications record (status = 'Awaiting Issuance').
        INSERT INTO public.doc_verifications (
            application_no, 
            requirement_id, 
            status, 
            remarks, 
            verified_by, 
            file_path
        )
        VALUES (
            p_application_no, 
            p_requirement_id, 
            'Awaiting Issuance', 
            NULL, 
            NULL, 
            NULL
        )
        ON CONFLICT (application_no, requirement_id) DO UPDATE
        SET status = 'Awaiting Issuance',
            remarks = NULL,
            verified_by = NULL,
            file_path = NULL,
            updated_at = NOW();

    ELSE
        -- PATH B: Applicant will upload their own existing barangay clearance.
        -- Delete any pre-existing barangay clearance request (since they switched to Path B)
        DELETE FROM public.barangay_clearances
        WHERE application_no = p_application_no 
          AND clearance_type_id = p_clearance_type_id;

        -- Insert or Reset doc_verifications record (status = 'Pending').
        INSERT INTO public.doc_verifications (
            application_no, 
            requirement_id, 
            status, 
            remarks, 
            verified_by
        )
        VALUES (
            p_application_no, 
            p_requirement_id, 
            'Pending', 
            NULL, 
            NULL
        )
        ON CONFLICT (application_no, requirement_id) DO UPDATE
        SET status = 'Pending',
            remarks = NULL,
            verified_by = NULL,
            updated_at = NOW();

    END IF;
END;
$$;

COMMENT ON FUNCTION public.uaf_create_barangay_clearance_hook IS
    'Atomic UAF hook to initialize or reset barangay clearances and doc verifications on UAF submission/resubmission.';
