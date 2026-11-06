-- Supabase's default privileges grant new functions directly to client roles.
-- Revoking PUBLIC alone does not remove those explicit grants.
REVOKE ALL ON FUNCTION public.submit_applicant_application(UUID, JSONB)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_applicant_application(UUID, JSONB)
TO service_role;
