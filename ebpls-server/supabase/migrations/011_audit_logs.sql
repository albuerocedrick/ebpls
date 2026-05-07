-- =================================================================
-- Migration: 011_audit_logs.sql
-- Purpose:   Create the audit_logs table for full DPA 2012 compliance.
-- Author:    eBPLS Team
-- Policy:    Supabase Expert rule — every significant mutation
--            (Application submission, payment, permit generation) MUST
--            trigger an insert into this table with old_value and new_value
--            JSONB snapshots. This table is IMMUTABLE — no UPDATE or DELETE
--            is ever permitted. Enforced via RLS in 013_rls_policies.sql.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    log_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

    -- The user who performed the action.
    -- NULL for system-automated actions (e.g., auto-routing status transitions).
    -- SET NULL on user deletion to preserve the audit record.
    user_id      UUID         REFERENCES public.users (user_id) ON DELETE SET NULL,

    -- Canonical action name — matches constants in src/utils/constants.js.
    -- See seeded action categories below for valid values.
    action       VARCHAR(100) NOT NULL,

    -- Polymorphic reference to the affected record.
    -- entity_type = table name (e.g., 'applications', 'transactions')
    -- entity_id   = the PK of the affected row (stored as VARCHAR to handle UUID and VARCHAR PKs)
    entity_type  VARCHAR(50)  NOT NULL,
    entity_id    VARCHAR(50)  NOT NULL,

    -- JSONB snapshots of the row state before and after the mutation.
    -- NULL for creates (no old_value) or hard deletes (no new_value).
    old_value    JSONB,
    new_value    JSONB,

    -- Client IP address captured at the API gateway level.
    -- Used for DPA compliance incident reporting.
    ip_address   INET,

    -- Server-side timestamp — never trust client-provided timestamps.
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.audit_logs            IS 'Immutable DPA 2012 compliance audit trail. Every significant mutation is recorded. No UPDATE or DELETE allowed (enforced via RLS).';
COMMENT ON COLUMN public.audit_logs.user_id    IS 'Actor who triggered the action. NULL for automated system transitions.';
COMMENT ON COLUMN public.audit_logs.action     IS 'Canonical action name constant (e.g. APPLICATION_SUBMITTED). Must match src/utils/constants.js AUDIT_ACTIONS.';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'The table/domain of the affected record (e.g. applications, transactions, permits).';
COMMENT ON COLUMN public.audit_logs.entity_id  IS 'PK of the affected row as VARCHAR to support both UUID and VARCHAR PKs (e.g. application_no).';
COMMENT ON COLUMN public.audit_logs.old_value  IS 'JSONB snapshot of the row BEFORE the mutation. NULL for INSERT operations.';
COMMENT ON COLUMN public.audit_logs.new_value  IS 'JSONB snapshot of the row AFTER the mutation. NULL for hard DELETE operations.';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Client IP from API request headers. Stored as INET for native Postgres IP operations.';

-- =================================================================
-- PERFORMANCE INDEXES
-- The Admin Module's AuditLogs.jsx viewer supports filtering by:
-- user, action type, entity type, and date range.
-- These indexes ensure those filter queries stay fast even with
-- hundreds of thousands of audit rows (e.g., January renewal spikes).
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON public.audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON public.audit_logs (action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON public.audit_logs (created_at DESC);

-- =================================================================
-- DOCUMENTATION: Canonical Audit Action Names
-- These must match AUDIT_ACTIONS constants in src/utils/constants.js.
-- Documented here for schema traceability.
--
-- AUTH:
--   ACCOUNT_CREATED         — New user registered
--   PASSWORD_RESET          — Password reset link issued
--   USER_ROLE_CHANGED       — Admin promoted/demoted a user's role
--   USER_DEACTIVATED        — Admin set is_active = FALSE
--
-- APPLICATION LIFECYCLE:
--   APPLICATION_DRAFT_SAVED     — Autosave triggered
--   APPLICATION_SUBMITTED       — UAF final submission (Draft→Pending)
--   APPLICATION_RETURNED        — BPLO returned with remarks
--   APPLICATION_VERIFIED        — All docs verified (→Verified)
--
-- TREASURY:
--   ASSESSMENT_CREATED          — Treasury created fee assessment
--   ASSESSMENT_LINE_OVERRIDDEN  — Treasury manually changed a fee amount
--   PAYMENT_RECORDED            — OTC payment confirmed (→Paid)
--
-- DOCUMENTS:
--   PERMIT_GENERATED            — Business Permit PDF created (→Completed)
--   ERESIBO_GENERATED           — E-Resibo PDF created
--   TOP_GENERATED               — Tax Order of Payment PDF created
--   CLEARANCE_ISSUED            — Barangay clearance issued
--   CLEARANCE_REJECTED          — Barangay clearance rejected
--
-- RETIREMENT:
--   RETIREMENT_SUBMITTED        — Applicant submitted retirement request
--   RETIREMENT_ASSESSED         — Treasury computed final taxes
--   RETIREMENT_COMPLETED        — Business officially retired
--
-- ADMIN:
--   MASTER_DATA_UPDATED         — Admin changed a lookup table row
-- =================================================================
