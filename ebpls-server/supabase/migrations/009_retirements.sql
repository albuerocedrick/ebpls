-- =================================================================
-- Migration: 009_retirements.sql
-- Purpose:   Create the retirement_applications table for the
--            Business Retirement / Cessation Module.
-- Author:    eBPLS Team
-- Policy:    Retirement flow is separate from the main permit application
--            state machine but REUSES the OTC payment endpoint (008_treasury.sql).
--            Completion of retirement MUST trigger businesses.is_retired = TRUE
--            (enforced at API layer in retirement.controller.js, Phase 7).
--            RLS enforcement deferred to 013_rls_policies.sql.
-- =================================================================

-- Custom type for retirement status.
-- Kept as a separate ENUM (not reusing application_status) because
-- the retirement lifecycle is a distinct, shorter sub-flow.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retirement_status') THEN
        CREATE TYPE public.retirement_status AS ENUM (
            'Pending',    -- Submitted by applicant, awaiting BPLO acknowledgment
            'Assessed',   -- Treasury has computed final taxes
            'Paid',       -- OTC payment recorded against the retirement assessment
            'Completed'   -- Business officially retired; businesses.is_retired set to TRUE
        );
    END IF;
END$$;

COMMENT ON TYPE public.retirement_status IS
    'State machine for business retirement/cessation flow: Pending→Assessed→Paid→Completed.';

-- ---------------------------------------------------------------
-- Table: retirement_applications
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.retirement_applications (
    id                UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The business being retired. ON DELETE RESTRICT: cannot delete a business
    -- that has an active retirement application in progress.
    business_id       UUID                    NOT NULL REFERENCES public.businesses (business_id) ON DELETE RESTRICT,

    -- Submitted by the taxpayer who owns the business
    submitted_by      UUID                    NOT NULL REFERENCES public.users (user_id) ON DELETE RESTRICT,

    -- Retirement details provided by the applicant in the UAF
    reason            TEXT                    NOT NULL,         -- Reason for cessation (closure, relocation, etc.)
    cessation_date    DATE                    NOT NULL,         -- Actual date the business stopped operating

    -- Final gross sales figure for computing last taxes due.
    -- Provided by the applicant; verified/overridden by Treasury Officer.
    final_gross_sales NUMERIC(15, 2)          NOT NULL DEFAULT 0.00 CHECK (final_gross_sales >= 0),

    -- Retirement state machine status
    status            public.retirement_status NOT NULL DEFAULT 'Pending',

    -- Link to the Treasury assessment created for the final tax computation.
    -- NULL until Treasury Officer assesses and creates the assessment record.
    -- Reuses the assessments table from 008_treasury.sql (same OTC payment flow).
    assessment_id     UUID                    UNIQUE REFERENCES public.assessments (id) ON DELETE SET NULL,

    -- BPLO Officer who acknowledged and forwarded to Treasury
    acknowledged_by   UUID                    REFERENCES public.users (user_id) ON DELETE SET NULL,
    acknowledged_at   TIMESTAMPTZ,

    -- Completion metadata — populated when retirement is finalized
    completed_by      UUID                    REFERENCES public.users (user_id) ON DELETE SET NULL,
    completed_at      TIMESTAMPTZ,

    created_at        TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    -- Business rule: only one active retirement application per business at a time.
    -- An active application is any that is not yet 'Completed'.
    -- Enforced at the API layer with a query guard; UNIQUE on business_id
    -- would be too strict (prevents re-opening a new retirement if the first was cancelled).
    CONSTRAINT retirement_cessation_date_check
        CHECK (cessation_date <= CURRENT_DATE)    -- Cannot retire a business in the future
);

COMMENT ON TABLE  public.retirement_applications                   IS 'Business cessation/retirement applications. Separate flow from permit applications, but reuses Treasury OTC payment endpoint.';
COMMENT ON COLUMN public.retirement_applications.business_id       IS 'The business being retired. RESTRICT prevents deletion of a business with an in-flight retirement.';
COMMENT ON COLUMN public.retirement_applications.reason            IS 'Applicant-provided reason for business closure or cessation.';
COMMENT ON COLUMN public.retirement_applications.cessation_date    IS 'Actual date operations ceased. Cannot be a future date.';
COMMENT ON COLUMN public.retirement_applications.final_gross_sales IS 'Gross sales figure used to compute final tax liability. Applicant-provided, Treasury-verified.';
COMMENT ON COLUMN public.retirement_applications.assessment_id     IS 'FK to assessments table (008). NULL until Treasury creates the final tax assessment. Reuses OTC payment flow.';
COMMENT ON COLUMN public.retirement_applications.completed_at      IS 'Timestamp of retirement completion. When set, retirement.controller.js also flips businesses.is_retired = TRUE.';

CREATE OR REPLACE TRIGGER retirement_applications_set_updated_at
    BEFORE UPDATE ON public.retirement_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
