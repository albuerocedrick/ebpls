-- ---------------------------------------------------------------
-- Migration: 041_cert_ready_notification.sql
-- Purpose: Add cert_notified_at and cert_notes to applications for Phase 5.
-- ---------------------------------------------------------------

ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS cert_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cert_notes TEXT;
