-- Migration: 042_correction_requests.sql
-- Description: Creates correction_requests and correction_request_documents tables

CREATE TABLE IF NOT EXISTS public.correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no VARCHAR(20) NOT NULL REFERENCES public.applications(application_no) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES auth.users(id),
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    remarks TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.correction_request_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correction_request_id UUID NOT NULL REFERENCES public.correction_requests(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Enable
ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correction_request_documents ENABLE ROW LEVEL SECURITY;

-- Applicants can SELECT and INSERT their own correction_requests
CREATE POLICY "Applicants can view their own correction requests"
ON public.correction_requests FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

CREATE POLICY "Applicants can insert their own correction requests"
ON public.correction_requests FOR INSERT
TO authenticated
WITH CHECK (requested_by = auth.uid());

-- BPLO/Admin can SELECT and UPDATE all correction_requests
CREATE POLICY "BPLO and Admin can view all correction requests"
ON public.correction_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.role_id
        WHERE u.user_id = auth.uid() AND r.role_name IN ('BPLO_Officer', 'Admin')
    )
);

CREATE POLICY "BPLO and Admin can update all correction requests"
ON public.correction_requests FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.role_id
        WHERE u.user_id = auth.uid() AND r.role_name IN ('BPLO_Officer', 'Admin')
    )
);

-- Applicants can SELECT and INSERT their own documents
CREATE POLICY "Applicants can view their own correction documents"
ON public.correction_request_documents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.correction_requests
        WHERE id = correction_request_id AND requested_by = auth.uid()
    )
);

CREATE POLICY "Applicants can insert their own correction documents"
ON public.correction_request_documents FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.correction_requests
        WHERE id = correction_request_id AND requested_by = auth.uid()
    )
);

-- BPLO/Admin can SELECT documents
CREATE POLICY "BPLO and Admin can view all correction documents"
ON public.correction_request_documents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.role_id
        WHERE u.user_id = auth.uid() AND r.role_name IN ('BPLO_Officer', 'Admin')
    )
);
