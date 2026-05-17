-- =================================================================
-- Migration: 029_health_max_connections.sql
-- Purpose:   Create RPC to query maximum allowed database connections
--            for health dashboard capacity tracking.
-- =================================================================

CREATE OR REPLACE FUNCTION public.get_max_connections()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT setting::integer 
  FROM pg_settings 
  WHERE name = 'max_connections';
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_max_connections() TO authenticated;
