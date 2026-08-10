-- Migration: 039_fix_activity_matches.sql
-- Description: Fix mismatch between fee_schedule_items and business_activities table.

UPDATE public.fee_schedule_items
SET activity_match = 'Piggery'
WHERE activity_match = 'Piggery Farm';

UPDATE public.fee_schedule_items
SET activity_match = 'Poultry'
WHERE activity_match LIKE 'Poultry Farm%';
