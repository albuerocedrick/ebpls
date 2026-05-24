-- =================================================================
-- Migration: 033_remove_payment_modes.sql
-- Purpose:   Remove the payment_modes concept entirely from the system.
--            Payment is always annual (no installment options).
--            Steps:
--              1. Drop the FK column from applications.
--              2. Drop the RLS policy on payment_modes.
--              3. Drop the payment_modes lookup table.
-- Author:    eBPLS Team
-- =================================================================

-- Step 1: Drop the payment_mode_id column from applications.
-- The column is nullable (no NOT NULL constraint), so this is a safe DROP
-- with no data integrity risk. Existing rows simply lose the column.
ALTER TABLE public.applications
    DROP COLUMN IF EXISTS payment_mode_id;

-- Step 2: Drop the RLS SELECT policy that was on payment_modes.
-- Must be dropped before the table can be dropped.
DROP POLICY IF EXISTS "Authenticated users can read payment_modes" ON public.payment_modes;

-- Step 3: Drop the payment_modes lookup table entirely.
-- ON CASCADE is not needed since the FK column above is already gone.
DROP TABLE IF EXISTS public.payment_modes;
