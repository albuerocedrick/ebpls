-- =================================================================
-- Migration: 023_email_notifications_payload.sql
-- Purpose:   Add a 'payload' JSONB column to the email_notifications table.
--            This allows the outbox pattern/retry worker to resend failed 
--            emails using the exact context (e.g., OR number, remarks) 
--            captured at the time of the event, without needing to 
--            re-fetch or reconstruct complex business state.
-- Author:    eBPLS Team
-- =================================================================

ALTER TABLE public.email_notifications
ADD COLUMN IF NOT EXISTS payload JSONB;

COMMENT ON COLUMN public.email_notifications.payload IS 'Stores the context data required to render the email template (e.g., OR number, rejection remarks). Essential for robust retry logic without reconstructing state.';
