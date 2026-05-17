-- =================================================================
-- Migration: 027_admin_module_setup.sql
-- Purpose:   Initialize Admin Module RLS policies and document-templates bucket
-- =================================================================

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admin full access to users" ON public.users;
    DROP POLICY IF EXISTS "Admin read access to audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Admin can update users" ON public.users;
    DROP POLICY IF EXISTS "Admin full access to document_templates" ON storage.objects;
END $$;

-- 1. Admin full access to users
CREATE POLICY "Admin full access to users" ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Admin read access to audit_logs
CREATE POLICY "Admin read access to audit_logs" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 3. Storage Bucket setup
INSERT INTO storage.buckets (id, name, public, allowed_mime_types) 
VALUES (
    'document-templates', 
    'document-templates', 
    false, 
    '{application/pdf}'
) ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS
CREATE POLICY "Admin full access to document_templates" 
ON storage.objects FOR ALL 
TO authenticated 
USING (
    bucket_id = 'document-templates' AND
    public.is_admin()
)
WITH CHECK (
    bucket_id = 'document-templates' AND
    public.is_admin()
);
