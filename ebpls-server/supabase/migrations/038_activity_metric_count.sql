-- Migration: 038_activity_metric_count.sql
-- Adds metric_count to application_activities for tiered-fee businesses.

ALTER TABLE public.application_activities
  ADD COLUMN IF NOT EXISTS metric_count INTEGER 
    CHECK (metric_count IS NULL OR metric_count > 0);

COMMENT ON COLUMN public.application_activities.metric_count 
  IS 'For tiered-fee businesses (Piggery, Poultry, etc.): count of heads/boarders/seating.
      NULL for non-tiered businesses. Used by Phase 2 assessment engine to look up the correct fee tier.';
