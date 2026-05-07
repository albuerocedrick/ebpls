-- =================================================================
-- Migration: 012_email_notifications.sql
-- Purpose:   Create the email_notifications tracking table.
--            Records every outbound email trigger event for auditability
--            and retry logic. The 9 trigger events are defined in the
--            System Architecture (Section 7.2).
-- Author:    eBPLS Team
-- Policy:    Every email trigger must create a row here BEFORE attempting
--            to send. The status is updated to 'Sent' or 'Failed' after
--            the Nodemailer/Brevo call resolves. In dev mode (SMTP not
--            configured), status is set to 'Skipped' with no actual send.
--            RLS enforcement deferred to 013_rls_policies.sql.
-- =================================================================

-- Custom ENUM for the 9 canonical email trigger events from the System Architecture.
-- Using ENUM (not VARCHAR) to guarantee only valid trigger names enter this table.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_trigger_event') THEN
        CREATE TYPE public.email_trigger_event AS ENUM (
            -- Auth events
            'ACCOUNT_CREATED',          -- New user registered; includes activation link
            'PASSWORD_RESET',           -- Password reset link (1-hour expiry)

            -- Application lifecycle events
            'APPLICATION_SUBMITTED',    -- UAF final submission confirmed to applicant
            'APPLICATION_RETURNED',     -- BPLO returned application with remarks
            'APPLICATION_VERIFIED',     -- All documents verified; proceeding to Treasury

            -- Treasury events
            'TOP_GENERATED',            -- Tax Order of Payment ready; attach TOP PDF
            'PAYMENT_RECORDED',         -- OTC payment confirmed by cashier

            -- Document/completion events
            'PERMIT_READY',             -- Business Permit + E-Resibo generated; attach PDFs

            -- Retirement events
            'RETIREMENT_COMPLETE'       -- Business officially retired
        );
    END IF;
END$$;

COMMENT ON TYPE public.email_trigger_event IS
    'Canonical enum of the 9 email trigger events defined in eBPLS System Architecture Section 7.2. '
    'Must match EMAIL_TRIGGERS constants in src/utils/constants.js.';

-- ---------------------------------------------------------------
-- Table: email_notifications
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_notifications (
    id               UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Application context — nullable because some triggers (ACCOUNT_CREATED,
    -- PASSWORD_RESET) are not tied to a specific permit application.
    application_no   VARCHAR(20)                REFERENCES public.applications (application_no) ON DELETE SET NULL,

    -- The specific trigger event that caused this email to be queued
    trigger_event    public.email_trigger_event NOT NULL,

    -- Recipient details (denormalized for auditability — preserved even if user is deleted)
    recipient_email  VARCHAR(255)               NOT NULL,
    recipient_name   VARCHAR(200),              -- Used to personalize the email greeting

    -- Email content metadata (stored for audit trail, not for re-sending from the DB)
    subject          VARCHAR(500)               NOT NULL,

    -- Delivery status lifecycle:
    -- Pending  — created, not yet attempted
    -- Sent     — Nodemailer/Brevo confirmed delivery
    -- Failed   — Nodemailer/Brevo threw an error; check error_message
    -- Skipped  — Dev mode: SMTP not configured, email was intentionally not sent
    status           VARCHAR(10)                NOT NULL DEFAULT 'Pending'
                                               CHECK (status IN ('Pending', 'Sent', 'Failed', 'Skipped')),

    -- Error tracking for failed sends
    error_message    TEXT,                      -- Populated when status = 'Failed'
    retry_count      INTEGER                    NOT NULL DEFAULT 0 CHECK (retry_count >= 0),

    -- Timestamps
    sent_at          TIMESTAMPTZ,               -- NULL until status transitions to 'Sent'
    created_at       TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.email_notifications                  IS 'Audit log of all outbound email trigger events. Created before send attempt; status updated after.';
COMMENT ON COLUMN public.email_notifications.application_no  IS 'FK to parent application. Nullable — auth emails (ACCOUNT_CREATED, PASSWORD_RESET) have no application context.';
COMMENT ON COLUMN public.email_notifications.trigger_event   IS 'Strongly-typed enum of the 9 valid email triggers from the System Architecture.';
COMMENT ON COLUMN public.email_notifications.recipient_email IS 'Denormalized. Preserved for audit even if the user account is later deleted.';
COMMENT ON COLUMN public.email_notifications.status          IS 'Pending=queued, Sent=delivered, Failed=error (see error_message), Skipped=dev mode mock.';
COMMENT ON COLUMN public.email_notifications.retry_count     IS 'Number of send attempts. Incremented by email.service.js on each retry. Max retries enforced at service layer.';
COMMENT ON COLUMN public.email_notifications.sent_at         IS 'Timestamp of successful delivery confirmation. NULL while Pending, Failed, or Skipped.';

-- Index for querying unsent/failed emails (for retry jobs or admin dashboard)
CREATE INDEX IF NOT EXISTS idx_email_notifications_status
    ON public.email_notifications (status)
    WHERE status IN ('Pending', 'Failed');

-- Index for looking up all emails related to a specific application
CREATE INDEX IF NOT EXISTS idx_email_notifications_application
    ON public.email_notifications (application_no)
    WHERE application_no IS NOT NULL;
