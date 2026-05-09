-- =================================================================
-- Migration: 015_design_gaps_fix.sql
-- Purpose:   Add application_data_reviews, update doc_verifications status check,
--            add BARANGAY_CLEARANCE_REJECTED email trigger event.
-- =================================================================

-- 1. Update email_trigger_event ENUM
ALTER TYPE public.email_trigger_event ADD VALUE IF NOT EXISTS 'BARANGAY_CLEARANCE_REJECTED';

-- 2. Update doc_verifications status CHECK constraint
-- Since the original constraint was unnamed, we drop the constraint that references the column.
ALTER TABLE public.doc_verifications DROP CONSTRAINT IF EXISTS doc_verifications_status_check;
ALTER TABLE public.doc_verifications ADD CONSTRAINT doc_verifications_status_check 
    CHECK (status IN ('Pending', 'Verified', 'Returned', 'Yes', 'No', 'Not Needed', 'Awaiting Issuance'));

COMMENT ON COLUMN public.doc_verifications.status IS 'Pending=not yet reviewed, Verified/Yes=approved, Returned/No=needs resubmission, Not Needed=not applicable, Awaiting Issuance=waiting for barangay clearance.';

-- 3. Create application_data_reviews table
CREATE TABLE IF NOT EXISTS public.application_data_reviews (
    review_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no      VARCHAR(20)   NOT NULL REFERENCES public.applications (application_no) ON DELETE CASCADE,
    section             VARCHAR(50)   NOT NULL,
    
    -- Verification status per data section
    status              VARCHAR(20)   NOT NULL DEFAULT 'Verified'
                                      CHECK (status IN ('Verified', 'Discrepancy')),
    
    -- Remarks are mandatory when marking a section as 'Discrepancy'
    remarks             TEXT,
    
    -- The BPLO officer who reviewed this section
    reviewed_by_user_id UUID          REFERENCES public.users (user_id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate section reviews on the same application
    UNIQUE (application_no, section)
);

COMMENT ON TABLE  public.application_data_reviews                     IS 'Data discrepancies flagged by BPLO per section.';
COMMENT ON COLUMN public.application_data_reviews.section             IS 'e.g., business_details, location, activities, financials.';
COMMENT ON COLUMN public.application_data_reviews.status              IS 'Verified=data is accurate, Discrepancy=data discrepancy flagged.';
COMMENT ON COLUMN public.application_data_reviews.remarks             IS 'Required if Discrepancy. Explains what the applicant must fix.';
COMMENT ON COLUMN public.application_data_reviews.reviewed_by_user_id IS 'UUID of BPLO Officer who reviewed this row. SET NULL on user deletion.';

-- 4. Enable RLS and add policies for application_data_reviews
ALTER TABLE public.application_data_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can read own data reviews; BPLO can read all"
    ON public.application_data_reviews FOR SELECT
    TO authenticated
    USING (
        application_no IN (
            SELECT a.application_no FROM public.applications a
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.auth_user_role() IN ('BPLO_Officer', 'Admin')
    );
