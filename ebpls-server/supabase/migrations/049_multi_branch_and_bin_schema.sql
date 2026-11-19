BEGIN;

CREATE TABLE public.business_bin_counters (
    year INTEGER PRIMARY KEY,
    last_value BIGINT NOT NULL CHECK (last_value > 0)
);
REVOKE ALL ON public.business_bin_counters FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.assign_business_bin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_year INTEGER := extract(year FROM now() AT TIME ZONE 'Asia/Manila');
    v_number TEXT;
BEGIN
    INSERT INTO public.business_bin_counters(year, last_value) VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = business_bin_counters.last_value + 1
    RETURNING last_value::text INTO v_number;
    NEW.bin := 'BIN-' || v_year || '-' || lpad(v_number, greatest(5, length(v_number)), '0');
    RETURN NEW;
END $$;

ALTER TABLE public.businesses ADD COLUMN bin VARCHAR(50) UNIQUE;
WITH numbered AS (
    SELECT business_id, extract(year FROM created_at AT TIME ZONE 'Asia/Manila')::integer AS year,
        row_number() OVER (PARTITION BY extract(year FROM created_at AT TIME ZONE 'Asia/Manila') ORDER BY created_at, business_id) AS seq
    FROM public.businesses
)
UPDATE public.businesses b SET bin = 'BIN-' || n.year || '-' || lpad(n.seq::text, greatest(5, length(n.seq::text)), '0')
FROM numbered n WHERE n.business_id = b.business_id;
INSERT INTO public.business_bin_counters(year, last_value)
SELECT split_part(bin, '-', 2)::integer, max(split_part(bin, '-', 3)::bigint)
FROM public.businesses GROUP BY 1;
ALTER TABLE public.businesses ALTER COLUMN bin SET NOT NULL;

CREATE FUNCTION public.keep_business_bin() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.bin IS DISTINCT FROM OLD.bin THEN
        RAISE EXCEPTION 'A business BIN cannot be changed' USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER businesses_assign_bin BEFORE INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.assign_business_bin();
CREATE TRIGGER businesses_keep_bin BEFORE UPDATE OF bin ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.keep_business_bin();

CREATE TABLE public.business_branches (
    branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(business_id) ON DELETE CASCADE,
    branch_key VARCHAR(36) NOT NULL,
    branch_name VARCHAR(100) NOT NULL CHECK (btrim(branch_name) <> ''),
    address_line1 VARCHAR(255),
    barangay VARCHAR(100),
    zone_id INTEGER REFERENCES public.location_zones(id) ON DELETE RESTRICT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    tenancy_type TEXT NOT NULL CHECK (tenancy_type IN ('Rented','Owned Commercial','Owned Residential')),
    stall_unit_numbers TEXT[] NOT NULL DEFAULT '{}',
    is_main BOOLEAN NOT NULL DEFAULT false CHECK (is_main = (branch_key = 'main')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (business_id, branch_key)
);
INSERT INTO public.business_branches(business_id, branch_key, branch_name, address_line1, barangay, zone_id,
    latitude, longitude, tenancy_type, stall_unit_numbers, is_main, is_active)
SELECT b.business_id, 'main', 'Main branch', b.address_line1, b.barangay, br.zone_id,
    b.latitude, b.longitude, b.tenancy_type, b.stall_unit_numbers, true, NOT b.is_retired
FROM public.businesses b LEFT JOIN public.barangays br ON br.name = b.barangay;

-- Keep the main branch compatible with older readers and address correction flows.
CREATE FUNCTION public.sync_main_business_branch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.business_branches(business_id, branch_key, branch_name, address_line1, barangay, zone_id,
        latitude, longitude, tenancy_type, stall_unit_numbers, is_main, is_active)
    VALUES (NEW.business_id, 'main', 'Main branch', NEW.address_line1, NEW.barangay,
        (SELECT zone_id FROM public.barangays WHERE name = NEW.barangay), NEW.latitude, NEW.longitude,
        NEW.tenancy_type, NEW.stall_unit_numbers, true, NOT NEW.is_retired)
    ON CONFLICT (business_id, branch_key) DO UPDATE SET address_line1 = EXCLUDED.address_line1,
        barangay = EXCLUDED.barangay, zone_id = EXCLUDED.zone_id, latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude, tenancy_type = EXCLUDED.tenancy_type,
        stall_unit_numbers = EXCLUDED.stall_unit_numbers, is_active = EXCLUDED.is_active;
    RETURN NEW;
END $$;
CREATE TRIGGER businesses_sync_main_branch
AFTER INSERT OR UPDATE OF address_line1, barangay, latitude, longitude, tenancy_type, is_renting, stall_unit_numbers, is_retired
ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.sync_main_business_branch();

ALTER TABLE public.application_activities ADD COLUMN branch_id UUID REFERENCES public.business_branches(branch_id);
ALTER TABLE public.application_activities DROP CONSTRAINT application_activities_application_no_activity_id_key;
CREATE UNIQUE INDEX application_activities_legacy_unique ON public.application_activities(application_no, activity_id) WHERE branch_id IS NULL;
CREATE UNIQUE INDEX application_activities_branch_unique ON public.application_activities(application_no, branch_id, activity_id) WHERE branch_id IS NOT NULL;
CREATE INDEX application_activities_branch_id_idx ON public.application_activities(branch_id);

-- Existing BPLO checklist rows remain grouped by requirement. Each file also
-- records its branch so returned applications and agency queues can recover the scope.
CREATE TABLE public.application_document_files (
    application_no VARCHAR(20) NOT NULL,
    requirement_id INTEGER NOT NULL,
    branch_id UUID REFERENCES public.business_branches(branch_id),
    file_path TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (application_no, file_path),
    FOREIGN KEY (application_no, requirement_id) REFERENCES public.doc_verifications(application_no, requirement_id) ON DELETE CASCADE
);
ALTER TABLE public.business_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_document_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_branches, public.application_document_files FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_branches, public.application_document_files TO service_role;
REVOKE ALL ON FUNCTION public.assign_business_bin(), public.keep_business_bin(), public.sync_main_business_branch() FROM PUBLIC, anon, authenticated;

UPDATE public.business_activities SET is_active = false WHERE lower(btrim(name)) = 'other services';

ALTER FUNCTION public.submit_applicant_application(UUID, JSONB) RENAME TO submit_single_location_application;
CREATE FUNCTION public.submit_applicant_application(p_taxpayer_id UUID, p_payload JSONB)
RETURNS VARCHAR(20) LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
    v_app_no VARCHAR(20);
    v_business_id UUID;
    v_branch JSONB;
    v_key TEXT;
    v_branch_id UUID;
    v_barangay public.barangays%ROWTYPE;
    v_previous_branch_ids UUID[];
BEGIN
    IF NOT (p_payload ? 'branches') THEN
        RETURN public.submit_single_location_application(p_taxpayer_id, p_payload);
    END IF;
    IF jsonb_array_length(p_payload->'branches') < 1
       OR p_payload->'branches'->0->>'branch_key' IS DISTINCT FROM 'main' THEN
        RAISE EXCEPTION 'The application must include a main branch' USING ERRCODE = '22023';
    END IF;
    IF p_payload->>'application_no' IS NOT NULL THEN
        SELECT array_agg(DISTINCT aa.branch_id) INTO v_previous_branch_ids
        FROM public.applications a JOIN public.businesses b USING (business_id)
        JOIN public.application_activities aa USING (application_no)
        WHERE a.application_no = p_payload->>'application_no' AND b.taxpayer_id = p_taxpayer_id AND aa.branch_id IS NOT NULL;
    END IF;

    -- Reuse the existing ownership/state checks, main-address projection,
    -- application numbering, and atomic checklist reset.
    v_branch := p_payload->'branches'->0;
    v_app_no := public.submit_single_location_application(p_taxpayer_id, p_payload || jsonb_build_object(
        'address_line1', v_branch->>'address_line1', 'barangay', v_branch->>'barangay',
        'tenancy_type', v_branch->>'tenancy_type', 'stall_unit_numbers', v_branch->'stall_unit_numbers',
        'activities', '[]'::jsonb));
    SELECT business_id INTO STRICT v_business_id FROM public.applications WHERE application_no = v_app_no;

    UPDATE public.business_branches b SET is_active = false
    WHERE b.business_id = v_business_id AND b.branch_id = ANY(v_previous_branch_ids) AND NOT b.is_main
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'branches') branch WHERE branch->>'branch_key' = b.branch_key)
      AND NOT EXISTS (SELECT 1 FROM public.application_activities aa WHERE aa.branch_id = b.branch_id);

    FOR v_branch IN SELECT value FROM jsonb_array_elements(p_payload->'branches') LOOP
        v_key := v_branch->>'branch_key';
        SELECT br.* INTO v_barangay FROM public.barangays br JOIN public.location_zones z ON z.id = br.zone_id
        WHERE br.name = v_branch->>'barangay' AND br.is_active AND z.is_active;
        IF NOT FOUND THEN RAISE EXCEPTION 'Select an active barangay and zone for every branch' USING ERRCODE = '22023'; END IF;
        INSERT INTO public.business_branches(business_id, branch_key, branch_name, address_line1, barangay, zone_id,
            latitude, longitude, tenancy_type, stall_unit_numbers, is_main)
        VALUES(v_business_id, v_key, v_branch->>'branch_name', v_branch->>'address_line1', v_barangay.name, v_barangay.zone_id,
            v_barangay.latitude, v_barangay.longitude, v_branch->>'tenancy_type',
            ARRAY(SELECT jsonb_array_elements_text(v_branch->'stall_unit_numbers')), v_key = 'main')
        ON CONFLICT (business_id, branch_key) DO UPDATE SET branch_name = EXCLUDED.branch_name,
            address_line1 = EXCLUDED.address_line1, barangay = EXCLUDED.barangay, zone_id = EXCLUDED.zone_id,
            latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, tenancy_type = EXCLUDED.tenancy_type,
            stall_unit_numbers = EXCLUDED.stall_unit_numbers, is_active = true
        RETURNING branch_id INTO v_branch_id;

        INSERT INTO public.application_activities(application_no, activity_id, branch_id, capitalization, gross_sales_prev_year, metric_count)
        SELECT v_app_no, (a->>'activity_id')::integer, v_branch_id, (a->>'capitalization')::numeric,
            coalesce((a->>'gross_sales_prev_year')::numeric, 0), (a->>'metric_count')::integer
        FROM jsonb_array_elements(v_branch->'activities') a;
    END LOOP;

    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'documents') d
        WHERE d->>'branch_key' IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload->'branches') b WHERE b->>'branch_key' = d->>'branch_key')) THEN
        RAISE EXCEPTION 'A document refers to an unknown branch' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.application_document_files(application_no, requirement_id, branch_id, file_path, position)
    SELECT v_app_no, (d->>'requirement_id')::integer, b.branch_id, d->>'file_path', ord::integer
    FROM jsonb_array_elements(p_payload->'documents') WITH ORDINALITY AS documents(d, ord)
    LEFT JOIN public.business_branches b ON b.business_id = v_business_id AND b.branch_key = d->>'branch_key';
    RETURN v_app_no;
END $$;
REVOKE ALL ON FUNCTION public.submit_applicant_application(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_applicant_application(UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.get_assessment_inputs(p_application_no VARCHAR)
RETURNS JSONB LANGUAGE sql STABLE SET search_path = public AS $$
SELECT jsonb_build_object(
    'application', jsonb_build_object('application_no',a.application_no,'status',a.status,'type_id',a.type_id,'updated_at',a.updated_at,'business_id',a.business_id),
    'barangay_active',br.is_active,
    'zone', CASE WHEN z.id IS NULL THEN NULL ELSE to_jsonb(z) END,
    'activities',coalesce((SELECT jsonb_agg(jsonb_build_object('id',aa.id,'name',ba.name,
        'branch_id',aa.branch_id,'capitalization',aa.capitalization,'gross_sales_prev_year',aa.gross_sales_prev_year,'metric_count',aa.metric_count) ORDER BY aa.id)
        FROM public.application_activities aa JOIN public.business_activities ba ON ba.id=aa.activity_id WHERE aa.application_no=a.application_no),'[]'),
    'branches', coalesce((SELECT jsonb_agg(jsonb_build_object('branch_id',bb.branch_id,'name',bb.branch_name,
        'is_active',bb.is_active,'barangay_active',abr.is_active,'zone',CASE WHEN az.id IS NULL THEN NULL ELSE to_jsonb(az) END)
        ORDER BY bb.is_main DESC, bb.branch_key)
        FROM public.business_branches bb LEFT JOIN public.barangays abr ON abr.name=bb.barangay
        LEFT JOIN public.location_zones az ON az.id=abr.zone_id
        WHERE bb.business_id=b.business_id AND EXISTS (SELECT 1 FROM public.application_activities scoped
            WHERE scoped.application_no=a.application_no AND scoped.branch_id=bb.branch_id)), '[]'),
    'fee_types',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM public.fee_types f WHERE f.is_active),'[]'),
    'fee_schedule',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.sort_order,s.id) FROM public.fee_schedule_items s WHERE s.is_active),'[]'),
    'rules',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.fee_schedule_rules r WHERE r.is_active),'[]')
)
FROM public.applications a JOIN public.businesses b ON b.business_id=a.business_id
LEFT JOIN public.barangays br ON br.name=b.barangay
LEFT JOIN public.location_zones z ON z.id=br.zone_id
WHERE a.application_no=p_application_no;
$$;

COMMIT;
