-- =================================================================
-- Migration: 028_admin_health_rpc.sql
-- Purpose:   Create RPC functions for the Admin Health Dashboard
--            to access system tables not exposed directly to PostgREST.
-- =================================================================

-- 1. Get active Postgres connections
CREATE OR REPLACE FUNCTION public.get_active_connections()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT count(*)::integer
  FROM pg_stat_activity;
$$;

-- 2. Get total storage size across all buckets
CREATE OR REPLACE FUNCTION public.get_storage_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Supabase storage.objects stores size inside the metadata JSONB column
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)
  FROM storage.objects;
$$;

-- Grant execution to authenticated users (RLS inside controller will ensure only Admins call this)
GRANT EXECUTE ON FUNCTION public.get_active_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_size() TO authenticated;
