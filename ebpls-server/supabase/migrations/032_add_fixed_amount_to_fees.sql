-- =================================================================
-- Migration: 032_add_fixed_amount_to_fees.sql
-- Purpose:   Add fixed_amount column to fee_types lookup table
--            and populate realistic standard flat rates for Liliw LGU.
-- Author:    eBPLS Team
-- =================================================================

-- Add the column if it doesn't exist
ALTER TABLE public.fee_types 
ADD COLUMN IF NOT EXISTS fixed_amount NUMERIC(10, 2) DEFAULT 500.00;

COMMENT ON COLUMN public.fee_types.fixed_amount IS 'The flat rate amount charged when computation_basis = Fixed.';

-- Update the seeded values with realistic flat rate fees
UPDATE public.fee_types SET fixed_amount = 300.00 WHERE name = 'Sanitary Inspection Fee';
UPDATE public.fee_types SET fixed_amount = 250.00 WHERE name = 'Zoning / Occupancy Fee';
UPDATE public.fee_types SET fixed_amount = 400.00 WHERE name = 'Garbage Collection Fee';
UPDATE public.fee_types SET fixed_amount = 150.00 WHERE name = 'Environmental Fee';
UPDATE public.fee_types SET fixed_amount = 200.00 WHERE name = 'Weight and Measures Fee';
