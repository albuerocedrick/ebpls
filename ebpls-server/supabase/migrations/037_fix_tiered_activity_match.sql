-- ---------------------------------------------------------------
-- Migration: 037_fix_tiered_activity_match.sql
-- Description: Fix missing activity_match values for tiered items
-- ---------------------------------------------------------------

UPDATE public.fee_schedule_items
SET activity_match = business_type
WHERE tier_label IS NOT NULL AND activity_match IS NULL;
