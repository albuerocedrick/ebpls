-- =================================================================
-- Migration: 013_rls_policies.sql
-- Purpose:   Enable Row Level Security on ALL tables and define
--            access policies enforcing the RBAC boundaries.
-- Author:    eBPLS Team
-- Policy:    Supabase Expert rule — ALL tables must have RLS enabled.
--            Defense-in-depth: the backend API uses service_role (bypasses RLS).
--            These policies protect against direct client SDK access and
--            unauthorized data exposure if a JWT token is compromised.
--
-- ARCHITECTURE NOTE:
--   service_role key → bypasses ALL RLS automatically (no policy needed).
--   authenticated role → subject to all policies below.
--   anon role → no access to any table (default deny).
-- =================================================================

-- =================================================================
-- SECTION 0: HELPER FUNCTIONS
-- Reusable security functions called inside policy USING() clauses.
-- SECURITY DEFINER: runs as the function owner, not the caller.
-- STABLE: result is cached within a query for performance.
-- =================================================================

-- Returns the current authenticated user's role_name.
-- Returns NULL if the user is not in public.users (e.g., anon).
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT r.role_name
    FROM public.users u
    JOIN public.roles r ON r.role_id = u.role_id
    WHERE u.user_id = auth.uid()
$$;

-- Returns TRUE if the current user is active staff (any role that is not 'Applicant').
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT public.auth_user_role() IN ('BPLO_Officer', 'Treasury_Officer', 'Barangay_Officer', 'Admin')
$$;

-- Returns TRUE if the current user is a System Admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
LANGUAGE sql
AS $$
    SELECT public.auth_user_role() = 'Admin'
$$;

-- Returns the taxpayer_id of the currently authenticated user.
-- Returns NULL if the user has not yet completed their taxpayer profile.
CREATE OR REPLACE FUNCTION public.auth_taxpayer_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT taxpayer_id FROM public.taxpayers WHERE user_id = auth.uid()
$$;

-- =================================================================
-- SECTION 1: ENABLE RLS ON ALL TABLES
-- Must be done before any policies are created.
-- =================================================================

ALTER TABLE public.roles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxpayers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_modes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_drafts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_verifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barangay_clearances    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_line_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retirement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_activities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_line_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications    ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- SECTION 2: LOOKUP TABLES (Read-Only for Authenticated Users)
-- Static/reference tables. All authenticated users can read.
-- Mutations are Admin-only via the service_role API.
-- =================================================================

CREATE POLICY "Authenticated users can read roles"
    ON public.roles FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read organization_types"
    ON public.organization_types FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read application_types"
    ON public.application_types FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read payment_modes"
    ON public.payment_modes FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read requirement_types"
    ON public.requirement_types FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read clearance_types"
    ON public.clearance_types FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read fee_types"
    ON public.fee_types FOR SELECT
    TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read business_activities"
    ON public.business_activities FOR SELECT
    TO authenticated USING (TRUE);

-- =================================================================
-- SECTION 3: USERS TABLE
-- Users can read their own profile. Staff can read all profiles.
-- No direct client-side mutations — handled via service_role API.
-- =================================================================

CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_staff());

-- =================================================================
-- SECTION 4: TAXPAYERS TABLE
-- Applicants see only their own record. Staff see all.
-- =================================================================

CREATE POLICY "Applicants can read own taxpayer profile"
    ON public.taxpayers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_staff());

CREATE POLICY "Applicants can insert own taxpayer profile"
    ON public.taxpayers FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Applicants can update own taxpayer profile"
    ON public.taxpayers FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- =================================================================
-- SECTION 5: BUSINESSES TABLE
-- Applicants see only their own businesses. Staff see all.
-- =================================================================

CREATE POLICY "Applicants can read own businesses"
    ON public.businesses FOR SELECT
    TO authenticated
    USING (
        taxpayer_id = public.auth_taxpayer_id()
        OR public.is_staff()
    );

CREATE POLICY "Applicants can insert own businesses"
    ON public.businesses FOR INSERT
    TO authenticated
    WITH CHECK (taxpayer_id = public.auth_taxpayer_id());

CREATE POLICY "Applicants can update own businesses; Admin can update any"
    ON public.businesses FOR UPDATE
    TO authenticated
    USING (
        taxpayer_id = public.auth_taxpayer_id()
        OR public.is_admin()
    );

-- =================================================================
-- SECTION 6: APPLICATIONS & DRAFTS
-- Applicants see/manage their own. Staff see all.
-- =================================================================

CREATE POLICY "Applicants can read own applications; staff can read all"
    ON public.applications FOR SELECT
    TO authenticated
    USING (
        business_id IN (
            SELECT business_id FROM public.businesses
            WHERE taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.is_staff()
    );

CREATE POLICY "Applicants can insert own applications"
    ON public.applications FOR INSERT
    TO authenticated
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.businesses
            WHERE taxpayer_id = public.auth_taxpayer_id()
        )
    );

-- Application drafts: strictly own-only
CREATE POLICY "Applicants can manage own drafts only"
    ON public.application_drafts FOR ALL
    TO authenticated
    USING (taxpayer_id = public.auth_taxpayer_id())
    WITH CHECK (taxpayer_id = public.auth_taxpayer_id());

-- Application activities: same scope as applications
CREATE POLICY "Applicants can read own activities; staff can read all"
    ON public.application_activities FOR SELECT
    TO authenticated
    USING (
        application_no IN (
            SELECT a.application_no FROM public.applications a
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.is_staff()
    );

-- =================================================================
-- SECTION 7: BPLO — DOCUMENT VERIFICATIONS
-- BPLO Officers can read and update all. Applicants can read their own.
-- =================================================================

CREATE POLICY "Applicants can read own verifications; BPLO can read all"
    ON public.doc_verifications FOR SELECT
    TO authenticated
    USING (
        application_no IN (
            SELECT a.application_no FROM public.applications a
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.auth_user_role() IN ('BPLO_Officer', 'Admin')
    );

-- =================================================================
-- SECTION 8: BARANGAY CLEARANCES
-- Barangay Officers manage all. Applicants can read their own.
-- =================================================================

CREATE POLICY "Applicants can read own clearances; Barangay Officers read all"
    ON public.barangay_clearances FOR SELECT
    TO authenticated
    USING (
        application_no IN (
            SELECT a.application_no FROM public.applications a
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.auth_user_role() IN ('Barangay_Officer', 'Admin')
    );

-- =================================================================
-- SECTION 9: TREASURY — ASSESSMENTS, LINE ITEMS, TRANSACTIONS
-- Treasury Officers manage all. Applicants can read their own.
-- =================================================================

CREATE POLICY "Applicants can read own assessments; Treasury reads all"
    ON public.assessments FOR SELECT
    TO authenticated
    USING (
        application_no IN (
            SELECT a.application_no FROM public.applications a
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.auth_user_role() IN ('Treasury_Officer', 'Admin')
    );

CREATE POLICY "Applicants can read own assessment line items; Treasury reads all"
    ON public.assessment_line_items FOR SELECT
    TO authenticated
    USING (
        assessment_id IN (
            SELECT id FROM public.assessments a
            JOIN public.applications app ON app.application_no = a.application_no
            JOIN public.businesses b ON b.business_id = app.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.auth_user_role() IN ('Treasury_Officer', 'Admin')
    );

CREATE POLICY "Applicants can read own transactions; Treasury reads all"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (
        assessment_id IN (
            SELECT id FROM public.assessments a
            JOIN public.applications app ON app.application_no = a.application_no
            JOIN public.businesses b ON b.business_id = app.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.auth_user_role() IN ('Treasury_Officer', 'Admin')
    );

-- =================================================================
-- SECTION 10: RETIREMENT APPLICATIONS
-- Applicants can read/create their own. BPLO + Treasury + Admin can read all.
-- =================================================================

CREATE POLICY "Applicants can read own retirements; staff can read all"
    ON public.retirement_applications FOR SELECT
    TO authenticated
    USING (
        submitted_by = auth.uid()
        OR public.is_staff()
    );

CREATE POLICY "Applicants can insert own retirements"
    ON public.retirement_applications FOR INSERT
    TO authenticated
    WITH CHECK (submitted_by = auth.uid());

-- =================================================================
-- SECTION 11: PERMITS
-- Applicants can read their own permits. All staff can read all permits.
-- =================================================================

CREATE POLICY "Applicants can read own permits; staff can read all"
    ON public.permits FOR SELECT
    TO authenticated
    USING (
        application_no IN (
            SELECT a.application_no FROM public.applications a
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.is_staff()
    );

CREATE POLICY "Applicants can read own permit line items; staff can read all"
    ON public.permit_line_items FOR SELECT
    TO authenticated
    USING (
        permit_id IN (
            SELECT p.id FROM public.permits p
            JOIN public.applications a ON a.application_no = p.application_no
            JOIN public.businesses b ON b.business_id = a.business_id
            WHERE b.taxpayer_id = public.auth_taxpayer_id()
        )
        OR public.is_staff()
    );

-- =================================================================
-- SECTION 12: AUDIT LOGS — ADMIN-ONLY READ, NO CLIENT WRITES
-- The audit trail is sacred. Only Admins can read it.
-- Inserts are done exclusively via service_role (backend API).
-- No client-side UPDATE or DELETE is ever permitted.
-- =================================================================

CREATE POLICY "Only Admin can read audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Explicitly block any client-side INSERT/UPDATE/DELETE on audit_logs.
-- All audit log writes go through the service_role backend API only.
-- (No INSERT/UPDATE/DELETE policies created = default DENY for authenticated role)

-- =================================================================
-- SECTION 13: EMAIL NOTIFICATIONS — ADMIN-ONLY READ, NO CLIENT ACCESS
-- Email records are internal system data. Admin can view for debugging.
-- No client-side writes permitted.
-- =================================================================

CREATE POLICY "Only Admin can read email notifications"
    ON public.email_notifications FOR SELECT
    TO authenticated
    USING (public.is_admin());
