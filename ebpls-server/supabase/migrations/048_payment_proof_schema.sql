-- =================================================================
-- Migration: 048_payment_proof_schema.sql
-- Purpose:   Phase 5 Payment Modernization: Proof of Payment Schema
--            - Add PaymentVerificationPending application status
--            - Add proof of payment tracking columns to transactions
--            - Update tendered_type check constraint for OTC + Bank/GCash
--            - Create private proof-of-payments storage bucket
-- =================================================================

-- 1. Extend application_status enum with PaymentVerificationPending
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'PaymentVerificationPending';

-- 2. Add proof of payment fields to transactions table
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS proof_file_path TEXT,
    ADD COLUMN IF NOT EXISTS payment_reference_no VARCHAR(100),
    ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(user_id),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Migrate any legacy tendered_type values before updating constraint
UPDATE public.transactions 
SET tendered_type = 'GCash' 
WHERE tendered_type IN ('Online', 'Card');

-- 4. Update tendered_type check constraint
ALTER TABLE public.transactions 
    DROP CONSTRAINT IF EXISTS transactions_tendered_type_check;

ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_tendered_type_check 
    CHECK (tendered_type IN ('Cash', 'Manager Check', 'Bank Transfer', 'GCash'));

-- 5. Create proof-of-payments storage bucket (5MB file size limit, image + pdf)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'proof-of-payments',
    'proof-of-payments',
    false,
    5242880,
    '{image/jpeg, image/png, application/pdf}'
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 5242880,
    allowed_mime_types = '{image/jpeg, image/png, application/pdf}';

-- 6. Storage RLS policies for proof-of-payments bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
          AND schemaname = 'storage' 
          AND policyname = 'Applicants can upload proof of payment'
    ) THEN
        CREATE POLICY "Applicants can upload proof of payment"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'proof-of-payments');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
          AND schemaname = 'storage' 
          AND policyname = 'Authenticated users can view proof of payments'
    ) THEN
        CREATE POLICY "Authenticated users can view proof of payments"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'proof-of-payments');
    END IF;
END $$;
