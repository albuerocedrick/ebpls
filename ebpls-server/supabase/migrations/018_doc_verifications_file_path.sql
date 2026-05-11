-- =================================================================
-- Migration: 018_doc_verifications_file_path.sql
-- Purpose:   Add file_path column to doc_verifications so uploaded
--            documents can be linked to their verification checklist row.
--            This enables the BPLO SplitScreenVerifier to display
--            the actual uploaded document for each requirement.
-- =================================================================

-- 1. Add file_path column to doc_verifications
ALTER TABLE public.doc_verifications
    ADD COLUMN IF NOT EXISTS file_path TEXT;

COMMENT ON COLUMN public.doc_verifications.file_path IS 'Supabase Storage path (e.g., taxpayer_id/timestamp_filename.pdf). NULL if no document uploaded yet or if requirement is Not Needed.';
