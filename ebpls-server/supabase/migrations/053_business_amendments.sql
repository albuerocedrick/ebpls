BEGIN;

-- 1. Ensure 'Amendment' application type exists
INSERT INTO public.application_types (name)
VALUES ('Amendment')
ON CONFLICT (name) DO NOTHING;

-- 2. Create business_amendments tracking table
CREATE TABLE IF NOT EXISTS public.business_amendments (
    amendment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no VARCHAR(20) REFERENCES public.applications(application_no) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(business_id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.business_branches(branch_id) ON DELETE SET NULL,
    amendment_type VARCHAR(50) NOT NULL DEFAULT 'Change of Address'
        CHECK (amendment_type IN ('Change of Address', 'Change of Line', 'Change of Business Name')),
    old_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    review_remarks TEXT,
    reviewed_by UUID REFERENCES public.users(user_id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_business_amendments_biz ON public.business_amendments(business_id);
CREATE INDEX IF NOT EXISTS idx_business_amendments_app ON public.business_amendments(application_no);
CREATE INDEX IF NOT EXISTS idx_business_amendments_branch ON public.business_amendments(branch_id);
CREATE INDEX IF NOT EXISTS idx_business_amendments_status ON public.business_amendments(status);

ALTER TABLE public.business_amendments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_amendments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_amendments TO service_role;

-- 3. Atomic Stored Procedure: Submit Address Amendment
CREATE OR REPLACE FUNCTION public.submit_address_amendment(p_taxpayer_id UUID, p_payload JSONB)
RETURNS VARCHAR(20) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_biz public.businesses%ROWTYPE;
    v_branch public.business_branches%ROWTYPE;
    v_barangay public.barangays%ROWTYPE;
    v_type_id INTEGER;
    v_year TEXT := to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY');
    v_sequence INTEGER;
    v_app_no VARCHAR(20);
    v_doc JSONB;
BEGIN
    IF p_payload->>'business_id' IS NULL THEN
        RAISE EXCEPTION 'A business_id is required to file an amendment.' USING ERRCODE = '22023';
    END IF;

    IF p_payload->>'branch_id' IS NULL THEN
        RAISE EXCEPTION 'A branch_id is required to file an address amendment.' USING ERRCODE = '22023';
    END IF;

    -- Validate business ownership and active status
    SELECT * INTO v_biz FROM public.businesses
    WHERE business_id = (p_payload->>'business_id')::uuid
      AND taxpayer_id = p_taxpayer_id
      AND NOT is_retired
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active business not found or not owned by taxpayer.' USING ERRCODE = 'P0002';
    END IF;

    -- Validate branch
    SELECT * INTO v_branch FROM public.business_branches
    WHERE branch_id = (p_payload->>'branch_id')::uuid
      AND business_id = v_biz.business_id
      AND is_active
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active branch not found under this business.' USING ERRCODE = 'P0002';
    END IF;

    -- Prevent duplicate in-flight amendments for the same branch
    IF EXISTS (
        SELECT 1 FROM public.business_amendments
        WHERE branch_id = v_branch.branch_id
          AND status = 'Pending'
    ) THEN
        RAISE EXCEPTION 'An address amendment for this branch is already pending review.' USING ERRCODE = '22023';
    END IF;

    -- Validate new barangay exists and is active
    SELECT * INTO v_barangay FROM public.barangays
    WHERE name = p_payload->>'new_barangay' AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'The selected barangay is not active in the Municipality of Liliw.' USING ERRCODE = '22023';
    END IF;

    -- Get application type ID for 'Amendment'
    SELECT id INTO v_type_id FROM public.application_types WHERE name = 'Amendment';
    IF NOT FOUND THEN
        v_type_id := 4;
    END IF;

    -- Generate sequential application number
    PERFORM pg_advisory_xact_lock(hashtext('ebpls.application.number.' || v_year));
    SELECT coalesce(max(substring(application_no FROM '[0-9]+$')::integer), 0) + 1 INTO v_sequence
    FROM public.applications WHERE application_no LIKE 'APP-' || v_year || '-%';
    v_app_no := 'APP-' || v_year || '-' || lpad(v_sequence::text, greatest(5, length(v_sequence::text)), '0');

    -- Insert into applications table
    INSERT INTO public.applications (
        application_no,
        business_id,
        type_id,
        status,
        submitted_at,
        return_remarks
    ) VALUES (
        v_app_no,
        v_biz.business_id,
        v_type_id,
        'Pending',
        now(),
        NULL
    );

    -- Insert into business_amendments
    INSERT INTO public.business_amendments (
        application_no,
        business_id,
        branch_id,
        amendment_type,
        old_data,
        new_data,
        status,
        submitted_at
    ) VALUES (
        v_app_no,
        v_biz.business_id,
        v_branch.branch_id,
        'Change of Address',
        jsonb_build_object(
            'address_line1', v_branch.address_line1,
            'barangay', v_branch.barangay,
            'zone_id', v_branch.zone_id,
            'latitude', v_branch.latitude,
            'longitude', v_branch.longitude,
            'tenancy_type', v_branch.tenancy_type,
            'stall_unit_numbers', v_branch.stall_unit_numbers
        ),
        jsonb_build_object(
            'address_line1', p_payload->>'new_address_line1',
            'barangay', v_barangay.name,
            'zone_id', v_barangay.zone_id,
            'latitude', v_barangay.latitude,
            'longitude', v_barangay.longitude,
            'tenancy_type', p_payload->>'new_tenancy_type',
            'stall_unit_numbers', coalesce(p_payload->'new_stall_unit_numbers', '[]'::jsonb)
        ),
        'Pending',
        now()
    );

    -- Copy existing activities for this branch into application_activities
    INSERT INTO public.application_activities (
        application_no, activity_id, capitalization, gross_sales_prev_year, branch_id
    )
    SELECT v_app_no, aa.activity_id, aa.capitalization, aa.gross_sales_prev_year, v_branch.branch_id
    FROM public.application_activities aa
    JOIN public.applications prev_app ON prev_app.application_no = aa.application_no
    WHERE prev_app.business_id = v_biz.business_id
      AND (aa.branch_id = v_branch.branch_id OR (aa.branch_id IS NULL AND v_branch.is_main))
    ORDER BY prev_app.created_at DESC
    LIMIT 50
    ON CONFLICT DO NOTHING;

    -- Store uploaded clearances in doc_verifications
    IF p_payload ? 'documents' AND jsonb_array_length(p_payload->'documents') > 0 THEN
        INSERT INTO public.doc_verifications (application_no, requirement_id, status, file_path)
        SELECT v_app_no, (d->>'requirement_id')::integer, 'Pending', string_agg(d->>'file_path', ',' ORDER BY ord)
        FROM jsonb_array_elements(p_payload->'documents') WITH ORDINALITY AS files(d, ord)
        GROUP BY (d->>'requirement_id')::integer;
    END IF;

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
        (SELECT user_id FROM public.taxpayers WHERE taxpayer_id = p_taxpayer_id),
        'AMENDMENT_SUBMITTED',
        'applications',
        v_app_no,
        jsonb_build_object(
            'business_id', v_biz.business_id,
            'branch_id', v_branch.branch_id,
            'amendment_type', 'Change of Address',
            'new_barangay', v_barangay.name
        )
    );

    RETURN v_app_no;
END;
$$;

-- 4. Atomic Stored Procedure: Approve Address Amendment
CREATE OR REPLACE FUNCTION public.approve_address_amendment(
    p_application_no VARCHAR,
    p_officer_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_amend public.business_amendments%ROWTYPE;
    v_branch public.business_branches%ROWTYPE;
    v_stalls TEXT[];
BEGIN
    SELECT * INTO v_amend FROM public.business_amendments
    WHERE application_no = p_application_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Amendment record not found for application %', p_application_no USING ERRCODE = 'P0002';
    END IF;

    IF v_amend.status != 'Pending' THEN
        RAISE EXCEPTION 'Amendment application is not in pending review status.' USING ERRCODE = '22023';
    END IF;

    -- Check inter-agency clearances: MHO, BFB, and AMILYAR must all be verified or not needed
    IF EXISTS (
        SELECT 1 FROM public.regulatory_clearances rc
        WHERE rc.application_no = p_application_no
          AND rc.status NOT IN ('Verified', 'Not Needed')
    ) THEN
        RAISE EXCEPTION 'All inter-agency inspections (MHO, BFB, AMILYAR) must be verified before approving address relocation.'
            USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_branch FROM public.business_branches
    WHERE branch_id = v_amend.branch_id
    FOR UPDATE;

    -- Convert stalls JSON array to PostgreSQL text array
    SELECT coalesce(array_agg(val), ARRAY[]::TEXT[]) INTO v_stalls
    FROM jsonb_array_elements_text(coalesce(v_amend.new_data->'stall_unit_numbers', '[]'::jsonb)) AS val;

    -- Update business_branches master record
    UPDATE public.business_branches
    SET address_line1 = v_amend.new_data->>'address_line1',
        barangay = v_amend.new_data->>'barangay',
        zone_id = (v_amend.new_data->>'zone_id')::integer,
        latitude = (v_amend.new_data->>'latitude')::numeric,
        longitude = (v_amend.new_data->>'longitude')::numeric,
        tenancy_type = v_amend.new_data->>'tenancy_type',
        stall_unit_numbers = v_stalls
    WHERE branch_id = v_amend.branch_id;

    -- If this is the main branch, update businesses header as well
    IF v_branch.is_main THEN
        UPDATE public.businesses
        SET address_line1 = v_amend.new_data->>'address_line1',
            barangay = v_amend.new_data->>'barangay',
            latitude = (v_amend.new_data->>'latitude')::numeric,
            longitude = (v_amend.new_data->>'longitude')::numeric,
            tenancy_type = v_amend.new_data->>'tenancy_type',
            stall_unit_numbers = v_stalls
        WHERE business_id = v_amend.business_id;
    END IF;

    -- Update amendment status
    UPDATE public.business_amendments
    SET status = 'Approved',
        reviewed_by = p_officer_id,
        review_remarks = p_remarks,
        approved_at = now()
    WHERE amendment_id = v_amend.amendment_id;

    -- Update application status
    UPDATE public.applications
    SET status = 'Completed',
        updated_at = now()
    WHERE application_no = p_application_no;

    -- Audit log
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
        p_officer_id,
        'AMENDMENT_APPROVED',
        'applications',
        p_application_no,
        jsonb_build_object(
            'business_id', v_amend.business_id,
            'branch_id', v_amend.branch_id,
            'old_address', v_amend.old_data,
            'new_address', v_amend.new_data
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'application_no', p_application_no,
        'business_id', v_amend.business_id,
        'status', 'Approved'
    );
END;
$$;

-- 5. Atomic Stored Procedure: Reject Address Amendment
CREATE OR REPLACE FUNCTION public.reject_address_amendment(
    p_application_no VARCHAR,
    p_officer_id UUID,
    p_remarks TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_amend public.business_amendments%ROWTYPE;
BEGIN
    IF p_remarks IS NULL OR trim(p_remarks) = '' THEN
        RAISE EXCEPTION 'Remarks explaining the rejection reason are required.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_amend FROM public.business_amendments
    WHERE application_no = p_application_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Amendment record not found for application %', p_application_no USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.business_amendments
    SET status = 'Rejected',
        reviewed_by = p_officer_id,
        review_remarks = p_remarks
    WHERE amendment_id = v_amend.amendment_id;

    UPDATE public.applications
    SET status = 'Returned',
        return_remarks = p_remarks,
        updated_at = now()
    WHERE application_no = p_application_no;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
        p_officer_id,
        'AMENDMENT_REJECTED',
        'applications',
        p_application_no,
        jsonb_build_object('business_id', v_amend.business_id, 'remarks', p_remarks)
    );

    RETURN jsonb_build_object(
        'success', true,
        'application_no', p_application_no,
        'status', 'Rejected'
    );
END;
$$;

-- 6. Update get_taxpayer_approved_businesses to include pending amendment flag
CREATE OR REPLACE FUNCTION public.get_taxpayer_approved_businesses(p_taxpayer_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT coalesce(jsonb_agg(
    jsonb_build_object(
        'business_id', b.business_id,
        'bin', b.bin,
        'business_name', b.business_name,
        'trade_name', b.trade_name,
        'org_type_id', b.org_type_id,
        'org_type_name', ot.name,
        'address_line1', b.address_line1,
        'barangay', b.barangay,
        'permit_no', p.permit_no,
        'permit_issued_at', p.issued_at,
        'permit_expires_at', p.expires_at,
        'is_expired', (p.expires_at < now()),
        'days_until_expiry', greatest(0, floor(extract(epoch FROM (p.expires_at - now())) / 86400)::integer),
        'branches', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'branch_id', bb.branch_id,
                'branch_key', bb.branch_key,
                'branch_name', bb.branch_name,
                'address_line1', bb.address_line1,
                'barangay', bb.barangay,
                'tenancy_type', bb.tenancy_type,
                'stall_unit_numbers', bb.stall_unit_numbers,
                'is_main', bb.is_main,
                'is_active', bb.is_active,
                'has_pending_amendment', EXISTS (
                    SELECT 1 FROM public.business_amendments ba
                    WHERE ba.branch_id = bb.branch_id AND ba.status = 'Pending'
                ),
                'pending_amendment_app_no', (
                    SELECT ba.application_no FROM public.business_amendments ba
                    WHERE ba.branch_id = bb.branch_id AND ba.status = 'Pending'
                    ORDER BY ba.submitted_at DESC LIMIT 1
                ),
                'activities', coalesce((
                    SELECT jsonb_agg(jsonb_build_object(
                        'activity_id', ba.id,
                        'name', ba.name,
                        'capitalization', aa.capitalization,
                        'gross_sales_prev_year', aa.gross_sales_prev_year,
                        'metric_count', aa.metric_count
                    ) ORDER BY aa.id)
                    FROM public.application_activities aa
                    JOIN public.business_activities ba ON ba.id = aa.activity_id
                    WHERE aa.application_no = a.application_no AND (aa.branch_id = bb.branch_id OR (aa.branch_id IS NULL AND bb.is_main))
                ), '[]'::jsonb)
            ) ORDER BY bb.is_main DESC, bb.branch_name)
            FROM public.business_branches bb
            WHERE bb.business_id = b.business_id
        ), '[]'::jsonb),
        'has_pending_renewal', EXISTS (
            SELECT 1 FROM public.applications ren_app
            WHERE ren_app.business_id = b.business_id
              AND ren_app.type_id = 2
              AND ren_app.status::text NOT IN ('Completed', 'Returned')
        ),
        'pending_renewal_app_no', (
            SELECT ren_app.application_no FROM public.applications ren_app
            WHERE ren_app.business_id = b.business_id
              AND ren_app.type_id = 2
              AND ren_app.status::text NOT IN ('Completed', 'Returned')
            ORDER BY ren_app.created_at DESC LIMIT 1
        ),
        'has_pending_amendment', EXISTS (
            SELECT 1 FROM public.business_amendments ba
            WHERE ba.business_id = b.business_id AND ba.status = 'Pending'
        ),
        'pending_amendment_app_no', (
            SELECT ba.application_no FROM public.business_amendments ba
            WHERE ba.business_id = b.business_id AND ba.status = 'Pending'
            ORDER BY ba.submitted_at DESC LIMIT 1
        )
    ) ORDER BY b.created_at DESC
), '[]'::jsonb)
FROM public.businesses b
JOIN public.organization_types ot ON ot.id = b.org_type_id
JOIN LATERAL (
    SELECT p.permit_no, p.issued_at, p.expires_at, a.application_no
    FROM public.permits p
    JOIN public.applications a ON a.application_no = p.application_no
    WHERE a.business_id = b.business_id
    ORDER BY p.expires_at DESC, p.created_at DESC
    LIMIT 1
) p ON true
JOIN public.applications a ON a.application_no = p.application_no
WHERE b.taxpayer_id = p_taxpayer_id AND NOT b.is_retired;
$$;

COMMIT;
