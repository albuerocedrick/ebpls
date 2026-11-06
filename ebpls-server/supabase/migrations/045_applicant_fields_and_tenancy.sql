-- Phase 2: applicant tenancy, stall declarations, and upload-only requirements.
BEGIN;

ALTER TABLE public.businesses
    ADD COLUMN tenancy_type TEXT NOT NULL DEFAULT 'Owned Commercial'
        CHECK (tenancy_type IN ('Rented', 'Owned Commercial', 'Owned Residential')),
    ADD COLUMN stall_unit_numbers TEXT[] NOT NULL DEFAULT '{}'
        CHECK (cardinality(stall_unit_numbers) <= 50)
        CHECK (array_position(stall_unit_numbers, NULL) IS NULL);

UPDATE public.businesses
SET tenancy_type = CASE WHEN is_renting THEN 'Rented' ELSE 'Owned Commercial' END;

-- Keep older clients' rental flag compatible while tenancy becomes canonical.
CREATE FUNCTION public.sync_business_tenancy() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_renting AND NEW.tenancy_type = 'Owned Commercial' THEN
            NEW.tenancy_type := 'Rented';
        END IF;
    ELSIF NEW.tenancy_type = OLD.tenancy_type
          AND NEW.is_renting IS DISTINCT FROM OLD.is_renting THEN
        NEW.tenancy_type := CASE WHEN NEW.is_renting THEN 'Rented' ELSE 'Owned Commercial' END;
    END IF;
    NEW.is_renting := NEW.tenancy_type = 'Rented';
    RETURN NEW;
END $$;

CREATE TRIGGER businesses_sync_tenancy BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.sync_business_tenancy();

ALTER TABLE public.requirement_types DROP CONSTRAINT requirement_types_condition_type_check;
ALTER TABLE public.requirement_types ADD CONSTRAINT requirement_types_condition_type_check
CHECK (condition_type IN ('none', 'org_type', 'business_activity', 'rental_status', 'tenancy_type'));

-- Reuse existing requirement IDs so historical document references remain valid.
UPDATE public.requirement_types SET name = 'Contract of Lease'
WHERE name = 'Lease Contract'
AND NOT EXISTS (SELECT 1 FROM public.requirement_types WHERE name = 'Contract of Lease');
UPDATE public.requirement_types SET name = 'Building Permit'
WHERE name = 'Building Permit / Locational Clearance'
AND NOT EXISTS (SELECT 1 FROM public.requirement_types WHERE name = 'Building Permit');

INSERT INTO public.requirement_types
    (name, description, is_active, applies_to_new, applies_to_renewal, is_conditional, condition_type, condition_description, max_files, sort_order)
VALUES
    ('Contract of Lease', 'Lease agreement for the rented business premises.', true, true, true, true, 'tenancy_type', 'Required for rented premises', 1, 13),
    ('Building Permit', 'Building permit for owned commercial premises.', true, true, true, true, 'tenancy_type', 'Required for owned commercial premises', 1, 14),
    ('Zoning Clearance', 'Zoning clearance for a business operating on owned residential property.', true, true, true, true, 'tenancy_type', 'Required for owned residential premises', 1, 15)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description, is_active = true,
    applies_to_new = true, applies_to_renewal = true,
    is_conditional = true, condition_type = 'tenancy_type',
    condition_description = EXCLUDED.condition_description,
    max_files = EXCLUDED.max_files, sort_order = EXCLUDED.sort_order;

UPDATE public.requirement_types SET is_active = false
WHERE name IN ('Lease Contract', 'Building Permit / Locational Clearance');

DELETE FROM public.requirement_conditions
WHERE requirement_id IN (SELECT id FROM public.requirement_types
    WHERE name IN ('Contract of Lease', 'Building Permit', 'Zoning Clearance'));
INSERT INTO public.requirement_conditions (requirement_id, match_value)
SELECT id, CASE name WHEN 'Contract of Lease' THEN 'Rented'
                    WHEN 'Building Permit' THEN 'Owned Commercial'
                    WHEN 'Zoning Clearance' THEN 'Owned Residential' END
FROM public.requirement_types
WHERE name IN ('Contract of Lease', 'Building Permit', 'Zoning Clearance');

UPDATE public.requirement_types SET
    is_active = true, applies_to_new = true, applies_to_renewal = true,
    is_conditional = false, condition_type = 'none', max_files = 1
WHERE name = 'Barangay Business Clearance';

COMMENT ON COLUMN public.businesses.tenancy_type IS 'Applicant premises tenancy. Legacy is_renting is synchronized for compatibility.';
COMMENT ON COLUMN public.businesses.stall_unit_numbers IS 'Declared unit/stall labels covered by this single business application.';

-- Commit business, activities, uploaded requirements, status, and draft deletion
-- together. A failed document/activity write must not leave a partial submission.
CREATE FUNCTION public.submit_applicant_application(p_taxpayer_id UUID, p_payload JSONB)
RETURNS VARCHAR(20) LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
    v_app_no VARCHAR(20) := nullif(p_payload->>'application_no', '');
    v_business_id UUID;
    v_status TEXT;
    v_year TEXT := to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY');
    v_sequence INTEGER;
    v_barangay public.barangays%ROWTYPE;
BEGIN
    SELECT * INTO v_barangay FROM public.barangays
    WHERE name = p_payload->>'barangay' AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Select an active Liliw barangay' USING ERRCODE = '22023'; END IF;

    IF v_app_no IS NOT NULL THEN
        SELECT a.business_id, a.status::text INTO v_business_id, v_status
        FROM public.applications a JOIN public.businesses b ON b.business_id = a.business_id
        WHERE a.application_no = v_app_no AND b.taxpayer_id = p_taxpayer_id
        FOR UPDATE OF a, b;
        IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002'; END IF;
        IF v_status NOT IN ('Draft', 'Returned') THEN
            RAISE EXCEPTION 'Only draft or returned applications can be submitted' USING ERRCODE = '22023';
        END IF;
    ELSE
        PERFORM pg_advisory_xact_lock(hashtext('ebpls.application.number.' || v_year));
        SELECT coalesce(max(substring(application_no FROM '[0-9]+$')::integer), 0) + 1 INTO v_sequence
        FROM public.applications WHERE application_no LIKE 'APP-' || v_year || '-%';
        v_app_no := 'APP-' || v_year || '-' || lpad(v_sequence::text, greatest(5, length(v_sequence::text)), '0');
        INSERT INTO public.businesses (taxpayer_id, business_name, org_type_id)
        VALUES (p_taxpayer_id, p_payload->>'business_name', (p_payload->>'org_type_id')::integer)
        RETURNING business_id INTO v_business_id;
    END IF;

    UPDATE public.businesses SET
        business_name = p_payload->>'business_name', trade_name = p_payload->>'trade_name',
        org_type_id = (p_payload->>'org_type_id')::integer,
        dti_sec_cda_reg_no = p_payload->>'dti_sec_cda_reg_no',
        is_franchise = coalesce((p_payload->>'is_franchise')::boolean, false),
        franchisor_name = p_payload->>'franchisor_name', address_line1 = p_payload->>'address_line1',
        barangay = v_barangay.name, city = 'Liliw', province = 'Laguna',
        latitude = v_barangay.latitude, longitude = v_barangay.longitude,
        tenancy_type = p_payload->>'tenancy_type',
        is_renting = p_payload->>'tenancy_type' = 'Rented',
        stall_unit_numbers = ARRAY(SELECT jsonb_array_elements_text(coalesce(p_payload->'stall_unit_numbers', '[]'::jsonb)))
    WHERE business_id = v_business_id;

    INSERT INTO public.applications (application_no, business_id, type_id, status, submitted_at, return_remarks, location_mismatch)
    VALUES (v_app_no, v_business_id, (p_payload->>'type_id')::integer, 'Pending', now(), NULL, false)
    ON CONFLICT (application_no) DO UPDATE SET type_id = EXCLUDED.type_id,
        status = 'Pending', submitted_at = now(), return_remarks = NULL, location_mismatch = false;

    DELETE FROM public.application_activities WHERE application_no = v_app_no;
    INSERT INTO public.application_activities (application_no, activity_id, capitalization, gross_sales_prev_year, metric_count)
    SELECT v_app_no, (a->>'activity_id')::integer, (a->>'capitalization')::numeric,
           coalesce((a->>'gross_sales_prev_year')::numeric, 0), (a->>'metric_count')::integer
    FROM jsonb_array_elements(p_payload->'activities') a;

    -- Clearance is now an ordinary uploaded requirement. No municipal request
    -- or barangay_clearances row is created by this applicant flow.
    DELETE FROM public.doc_verifications WHERE application_no = v_app_no;
    INSERT INTO public.doc_verifications (application_no, requirement_id, status, file_path)
    SELECT v_app_no, (d->>'requirement_id')::integer, 'Pending', string_agg(d->>'file_path', ',' ORDER BY ord)
    FROM jsonb_array_elements(p_payload->'documents') WITH ORDINALITY AS files(d, ord)
    GROUP BY (d->>'requirement_id')::integer;

    DELETE FROM public.application_drafts WHERE taxpayer_id = p_taxpayer_id;
    RETURN v_app_no;
END $$;
REVOKE ALL ON FUNCTION public.submit_applicant_application(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_applicant_application(UUID, JSONB) TO service_role;
COMMIT;
