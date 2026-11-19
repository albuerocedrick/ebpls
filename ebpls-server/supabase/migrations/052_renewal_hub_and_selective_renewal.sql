BEGIN;

CREATE INDEX IF NOT EXISTS idx_permits_app_no ON public.permits(application_no);
CREATE INDEX IF NOT EXISTS idx_permits_expires ON public.permits(expires_at);
CREATE INDEX IF NOT EXISTS idx_applications_biz_type ON public.applications(business_id, type_id, status);
CREATE INDEX IF NOT EXISTS idx_business_branches_active ON public.business_branches(business_id, is_active);

-- Helper to retrieve all approved businesses with their active permits, branches, and declared activities
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

-- Atomic RPC for selective multi-branch renewal submissions
CREATE OR REPLACE FUNCTION public.submit_renewal_application(p_taxpayer_id UUID, p_payload JSONB)
RETURNS VARCHAR(20) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_biz public.businesses%ROWTYPE;
    v_app_no VARCHAR(20);
    v_year TEXT := to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY');
    v_sequence INTEGER;
    v_branch JSONB;
    v_branch_id UUID;
    v_barangay public.barangays%ROWTYPE;
    v_unselected_ids UUID[];
BEGIN
    IF p_payload->>'business_id' IS NULL THEN
        RAISE EXCEPTION 'A business_id is required to file a renewal.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_biz FROM public.businesses
    WHERE business_id = (p_payload->>'business_id')::uuid AND taxpayer_id = p_taxpayer_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business not found or not owned by taxpayer.' USING ERRCODE = 'P0002';
    END IF;

    IF v_biz.is_retired THEN
        RAISE EXCEPTION 'Cannot renew a retired business.' USING ERRCODE = '22023';
    END IF;

    -- Verify business has at least one issued permit
    IF NOT EXISTS (
        SELECT 1 FROM public.permits p JOIN public.applications a USING (application_no)
        WHERE a.business_id = v_biz.business_id
    ) THEN
        RAISE EXCEPTION 'Only businesses with an issued permit can be renewed.' USING ERRCODE = '22023';
    END IF;

    -- Check for in-flight renewal applications (prevent double renewals)
    IF EXISTS (
        SELECT 1 FROM public.applications
        WHERE business_id = v_biz.business_id AND type_id = 2
          AND status::text NOT IN ('Completed', 'Returned')
    ) THEN
        RAISE EXCEPTION 'A renewal application is already in progress for this business.' USING ERRCODE = '22023';
    END IF;

    IF NOT (p_payload ? 'branches') OR jsonb_array_length(p_payload->'branches') < 1 THEN
        RAISE EXCEPTION 'At least one branch must be selected for renewal.' USING ERRCODE = '22023';
    END IF;

    -- Generate sequential application number
    PERFORM pg_advisory_xact_lock(hashtext('ebpls.application.number.' || v_year));
    SELECT coalesce(max(substring(application_no FROM '[0-9]+$')::integer), 0) + 1 INTO v_sequence
    FROM public.applications WHERE application_no LIKE 'APP-' || v_year || '-%';
    v_app_no := 'APP-' || v_year || '-' || lpad(v_sequence::text, greatest(5, length(v_sequence::text)), '0');

    -- Insert renewal application linked to existing business_id (zero duplicate business)
    INSERT INTO public.applications (application_no, business_id, type_id, status, submitted_at, return_remarks)
    VALUES (v_app_no, v_biz.business_id, 2, 'Pending', now(), NULL);

    -- Flag unselected branches as not renewed / inactive
    IF p_payload ? 'unselected_branch_ids' AND jsonb_array_length(p_payload->'unselected_branch_ids') > 0 THEN
        SELECT array_agg(value::text::uuid) INTO v_unselected_ids
        FROM jsonb_array_elements_text(p_payload->'unselected_branch_ids');

        UPDATE public.business_branches
        SET is_active = false
        WHERE business_id = v_biz.business_id AND branch_id = ANY(v_unselected_ids);
    END IF;

    -- Commit renewed branches and their declared activities
    FOR v_branch IN SELECT value FROM jsonb_array_elements(p_payload->'branches') LOOP
        SELECT br.* INTO v_barangay FROM public.barangays br JOIN public.location_zones z ON z.id = br.zone_id
        WHERE br.name = v_branch->>'barangay' AND br.is_active AND z.is_active;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Select an active barangay and zone for every renewed branch' USING ERRCODE = '22023';
        END IF;

        IF v_branch->>'branch_id' IS NOT NULL THEN
            UPDATE public.business_branches
            SET branch_name = v_branch->>'branch_name',
                address_line1 = v_branch->>'address_line1',
                barangay = v_barangay.name,
                zone_id = v_barangay.zone_id,
                latitude = v_barangay.latitude,
                longitude = v_barangay.longitude,
                tenancy_type = v_branch->>'tenancy_type',
                stall_unit_numbers = ARRAY(SELECT jsonb_array_elements_text(v_branch->'stall_unit_numbers')),
                is_active = true
            WHERE branch_id = (v_branch->>'branch_id')::uuid AND business_id = v_biz.business_id
            RETURNING branch_id INTO v_branch_id;
        ELSE
            INSERT INTO public.business_branches(
                business_id, branch_key, branch_name, address_line1, barangay, zone_id,
                latitude, longitude, tenancy_type, stall_unit_numbers, is_main, is_active
            )
            VALUES(
                v_biz.business_id, coalesce(v_branch->>'branch_key', gen_random_uuid()::text),
                v_branch->>'branch_name', v_branch->>'address_line1', v_barangay.name, v_barangay.zone_id,
                v_barangay.latitude, v_barangay.longitude, v_branch->>'tenancy_type',
                ARRAY(SELECT jsonb_array_elements_text(v_branch->'stall_unit_numbers')),
                coalesce((v_branch->>'is_main')::boolean, false), true
            )
            RETURNING branch_id INTO v_branch_id;
        END IF;

        IF NOT (v_branch ? 'activities') OR jsonb_array_length(v_branch->'activities') < 1 THEN
            RAISE EXCEPTION 'Every renewed branch must have at least one active line of business' USING ERRCODE = '22023';
        END IF;

        INSERT INTO public.application_activities(application_no, activity_id, branch_id, capitalization, gross_sales_prev_year, metric_count)
        SELECT v_app_no, (a->>'activity_id')::integer, v_branch_id,
               coalesce((a->>'capitalization')::numeric, 0),
               coalesce((a->>'gross_sales_prev_year')::numeric, 0),
               (a->>'metric_count')::integer
        FROM jsonb_array_elements(v_branch->'activities') a;
    END LOOP;

    -- Insert document checklist verifications
    IF p_payload ? 'documents' AND jsonb_array_length(p_payload->'documents') > 0 THEN
        INSERT INTO public.doc_verifications (application_no, requirement_id, status, file_path)
        SELECT v_app_no, (d->>'requirement_id')::integer, 'Pending', string_agg(d->>'file_path', ',' ORDER BY ord)
        FROM jsonb_array_elements(p_payload->'documents') WITH ORDINALITY AS files(d, ord)
        GROUP BY (d->>'requirement_id')::integer;

        INSERT INTO public.application_document_files(application_no, requirement_id, branch_id, file_path, position)
        SELECT v_app_no, (d->>'requirement_id')::integer, b.branch_id, d->>'file_path', ord::integer
        FROM jsonb_array_elements(p_payload->'documents') WITH ORDINALITY AS documents(d, ord)
        LEFT JOIN public.business_branches b ON b.business_id = v_biz.business_id AND (b.branch_key = d->>'branch_key' OR b.branch_id::text = d->>'branch_id');
    END IF;

    INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, new_value)
    VALUES(p_taxpayer_id, 'RENEWAL_APPLICATION_SUBMITTED', 'applications', v_app_no,
        jsonb_build_object('business_id', v_biz.business_id, 'bin', v_biz.bin, 'application_no', v_app_no, 'type_id', 2));

    RETURN v_app_no;
END $$;

REVOKE ALL ON FUNCTION public.get_taxpayer_approved_businesses(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_taxpayer_approved_businesses(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.submit_renewal_application(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_renewal_application(UUID, JSONB) TO service_role;

COMMIT;
