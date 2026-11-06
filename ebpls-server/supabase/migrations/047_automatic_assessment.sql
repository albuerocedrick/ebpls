-- Phase 3: atomic BPLO assessment, immutable fee snapshots, audited BMBE relief.
BEGIN;
ALTER TABLE public.assessments
    ADD COLUMN calculation_context JSONB,
    ADD COLUMN bmbe_exempt BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN bmbe_certificate_path TEXT,
    ADD COLUMN bmbe_authority_reference TEXT,
    ADD COLUMN bmbe_remarks TEXT,
    ADD COLUMN bmbe_updated_by UUID REFERENCES public.users(user_id),
    ADD COLUMN bmbe_updated_at TIMESTAMPTZ;
ALTER TABLE public.assessment_line_items
    ADD COLUMN base_amount NUMERIC(10,2) CHECK (base_amount >= 0),
    ADD COLUMN is_business_tax BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN computation TEXT;
UPDATE public.assessment_line_items i SET base_amount = i.amount,
    is_business_tax = f.name = 'Business Tax'
FROM public.fee_types f WHERE f.id = i.fee_type_id;
ALTER TABLE public.assessment_line_items ALTER COLUMN base_amount SET NOT NULL;

-- Existing bills remain unchanged; new bills retain their exact input snapshot.
CREATE FUNCTION public.get_assessment_inputs(p_application_no VARCHAR)
RETURNS JSONB LANGUAGE sql STABLE SET search_path = public AS $$
SELECT jsonb_build_object(
    'application', jsonb_build_object('application_no',a.application_no,'status',a.status,'type_id',a.type_id,'updated_at',a.updated_at,'business_id',a.business_id),
    'barangay_active',br.is_active,
    'zone', CASE WHEN z.id IS NULL THEN NULL ELSE to_jsonb(z) END,
    'activities',coalesce((SELECT jsonb_agg(jsonb_build_object('id',aa.id,'name',ba.name,
        'capitalization',aa.capitalization,'gross_sales_prev_year',aa.gross_sales_prev_year,'metric_count',aa.metric_count) ORDER BY aa.id)
        FROM public.application_activities aa JOIN public.business_activities ba ON ba.id=aa.activity_id WHERE aa.application_no=a.application_no),'[]'),
    'fee_types',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM public.fee_types f WHERE f.is_active),'[]'),
    'fee_schedule',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.sort_order,s.id) FROM public.fee_schedule_items s WHERE s.is_active),'[]'),
    'rules',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.fee_schedule_rules r WHERE r.is_active),'[]')
)
FROM public.applications a JOIN public.businesses b ON b.business_id=a.business_id
LEFT JOIN public.barangays br ON br.name=b.barangay
LEFT JOIN public.location_zones z ON z.id=br.zone_id
WHERE a.application_no=p_application_no;
$$;

CREATE FUNCTION public.approve_and_assess_application(
    p_application_no VARCHAR, p_officer_id UUID, p_calculation JSONB, p_ip_address TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
    v_app public.applications%ROWTYPE;
    v_assessment public.assessments%ROWTYPE;
    v_total NUMERIC(12,2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.role_id=u.role_id
        WHERE u.user_id=p_officer_id AND u.is_active AND r.role_name IN ('Admin','BPLO_Officer')) THEN
        RAISE EXCEPTION 'BPLO authorization required' USING ERRCODE='42501';
    END IF;
    SELECT * INTO v_app FROM public.applications WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
    SELECT * INTO v_assessment FROM public.assessments WHERE application_no=p_application_no;
    IF FOUND AND v_app.status::text IN ('Assessed','For Payment') THEN
        RETURN jsonb_build_object('assessment_id',v_assessment.id,'application_no',p_application_no,
            'status',v_app.status,'total_amount',v_assessment.total_amount,'already_assessed',true);
    END IF;
    IF v_app.status::text NOT IN ('Pending','Under Review') THEN
        RAISE EXCEPTION 'Application is not awaiting BPLO approval' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.assessments WHERE application_no=p_application_no) THEN
        RAISE EXCEPTION 'An assessment already exists; review the existing bill' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.doc_verifications WHERE application_no=p_application_no)
       OR EXISTS (SELECT 1 FROM public.doc_verifications WHERE application_no=p_application_no AND status NOT IN ('Verified','Yes','Not Needed'))
       OR (SELECT count(*) FROM public.application_data_reviews WHERE application_no=p_application_no) < 4
       OR EXISTS (SELECT 1 FROM public.application_data_reviews WHERE application_no=p_application_no AND status <> 'Verified') THEN
        RAISE EXCEPTION 'Complete all BPLO document and data checks before approval' USING ERRCODE='22023';
    END IF;
    IF public.get_assessment_inputs(p_application_no) IS DISTINCT FROM p_calculation->'source' THEN
        RAISE EXCEPTION 'Assessment inputs changed; recalculate' USING ERRCODE='40001';
    END IF;
    IF jsonb_array_length(p_calculation->'lineItems')=0 THEN
        RAISE EXCEPTION 'Assessment requires fee line items' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.assessments(application_no,total_amount,assessed_by,calculation_context)
    VALUES(p_application_no,0,p_officer_id,p_calculation->'context') RETURNING * INTO v_assessment;
    INSERT INTO public.assessment_line_items(assessment_id,fee_type_id,amount,base_amount,is_business_tax,computation,is_override)
    SELECT v_assessment.id,(item->>'fee_type_id')::integer,(item->>'amount')::numeric,
        (item->>'base_amount')::numeric,(item->>'is_business_tax')::boolean,item->>'computation',false
    FROM jsonb_array_elements(p_calculation->'lineItems') item;
    SELECT round(sum(amount),2) INTO v_total FROM public.assessment_line_items WHERE assessment_id=v_assessment.id;
    IF v_total IS DISTINCT FROM (p_calculation->>'totalAmount')::numeric THEN
        RAISE EXCEPTION 'Assessment total does not match its line items' USING ERRCODE='22023';
    END IF;
    UPDATE public.assessments SET total_amount=v_total WHERE id=v_assessment.id;
    UPDATE public.applications SET status='Assessed',last_updated_by=p_officer_id,return_remarks=NULL
    WHERE application_no=p_application_no;
    INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_value,new_value,ip_address) VALUES
        (p_officer_id,'APPLICATION_VERIFIED','applications',p_application_no,jsonb_build_object('status',v_app.status),jsonb_build_object('status','Assessed','assessment_id',v_assessment.id),nullif(p_ip_address,'')::inet),
        (p_officer_id,'FEE_ASSESSED','assessments',v_assessment.id::text,NULL,jsonb_build_object('total_amount',v_total,'context',p_calculation->'context'),nullif(p_ip_address,'')::inet);
    RETURN jsonb_build_object('assessment_id',v_assessment.id,'application_no',p_application_no,
        'status','Assessed','total_amount',v_total,'already_assessed',false);
END $$;

CREATE FUNCTION public.set_assessment_bmbe_exemption(p_application_no VARCHAR,p_officer_id UUID,
    p_enabled BOOLEAN,p_certificate_path TEXT,p_authority_reference TEXT,p_remarks TEXT)
RETURNS JSONB LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_app public.applications%ROWTYPE; v_ass public.assessments%ROWTYPE; v_total NUMERIC(12,2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.role_id=u.role_id
        WHERE u.user_id=p_officer_id AND u.is_active AND r.role_name IN ('Admin','Treasury_Officer')) THEN
        RAISE EXCEPTION 'Treasury authorization required' USING ERRCODE='42501';
    END IF;
    SELECT * INTO v_app FROM public.applications WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
    SELECT * INTO v_ass FROM public.assessments WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found' USING ERRCODE='P0002'; END IF;
    IF v_app.status::text <> 'Assessed' OR v_ass.calculation_context IS NULL
       OR EXISTS (SELECT 1 FROM public.transactions WHERE assessment_id=v_ass.id) THEN
        RAISE EXCEPTION 'Exemptions may only change a new, unpaid assessment before finalization' USING ERRCODE='22023';
    END IF;
    IF length(btrim(coalesce(p_remarks,''))) < 3 THEN RAISE EXCEPTION 'Exemption remarks are required' USING ERRCODE='22023'; END IF;
    IF p_enabled AND (length(btrim(coalesce(p_certificate_path,'')))=0 OR length(btrim(coalesce(p_authority_reference,'')))<3) THEN
        RAISE EXCEPTION 'DTI certificate and approved LGU authority reference are required' USING ERRCODE='22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.assessment_line_items WHERE assessment_id=v_ass.id AND is_business_tax) THEN
        RAISE EXCEPTION 'No Business Tax line exists for this assessment' USING ERRCODE='22023';
    END IF;
    IF v_ass.bmbe_exempt=p_enabled THEN RETURN to_jsonb(v_ass); END IF;
    UPDATE public.assessment_line_items SET amount=CASE WHEN p_enabled THEN 0 ELSE base_amount END
    WHERE assessment_id=v_ass.id AND is_business_tax;
    SELECT round(sum(amount),2) INTO v_total FROM public.assessment_line_items WHERE assessment_id=v_ass.id;
    UPDATE public.assessments SET total_amount=v_total,bmbe_exempt=p_enabled,
        bmbe_certificate_path=CASE WHEN p_enabled THEN p_certificate_path ELSE bmbe_certificate_path END,
        bmbe_authority_reference=CASE WHEN p_enabled THEN p_authority_reference ELSE bmbe_authority_reference END,
        bmbe_remarks=p_remarks,bmbe_updated_by=p_officer_id,bmbe_updated_at=now()
    WHERE id=v_ass.id;
    INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_value,new_value)
    VALUES(p_officer_id,'BMBE_EXEMPTION_UPDATED','assessments',v_ass.id::text,
        jsonb_build_object('bmbe_exempt',v_ass.bmbe_exempt,'total_amount',v_ass.total_amount),
        jsonb_build_object('bmbe_exempt',p_enabled,'total_amount',v_total,'certificate_path',coalesce(p_certificate_path,v_ass.bmbe_certificate_path),
            'authority_reference',coalesce(p_authority_reference,v_ass.bmbe_authority_reference),'remarks',p_remarks));
    RETURN (SELECT to_jsonb(a) FROM public.assessments a WHERE id=v_ass.id);
END $$;

CREATE FUNCTION public.finalize_automatic_assessment(p_application_no VARCHAR,p_officer_id UUID)
RETURNS JSONB LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_app public.applications%ROWTYPE; v_ass public.assessments%ROWTYPE;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.role_id=u.role_id
        WHERE u.user_id=p_officer_id AND u.is_active AND r.role_name IN ('Admin','Treasury_Officer')) THEN
        RAISE EXCEPTION 'Treasury authorization required' USING ERRCODE='42501';
    END IF;
    SELECT * INTO v_app FROM public.applications WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found' USING ERRCODE='P0002'; END IF;
    SELECT * INTO v_ass FROM public.assessments WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found' USING ERRCODE='P0002'; END IF;
    IF v_app.status::text='For Payment' THEN RETURN jsonb_build_object('already_finalized',true); END IF;
    IF v_app.status::text <> 'Assessed' OR NOT EXISTS (SELECT 1 FROM public.assessment_line_items WHERE assessment_id=v_ass.id)
       OR (SELECT round(sum(amount),2) FROM public.assessment_line_items WHERE assessment_id=v_ass.id) <> v_ass.total_amount THEN
        RAISE EXCEPTION 'A complete, balanced assessment is required before billing' USING ERRCODE='22023';
    END IF;
    UPDATE public.applications SET status='For Payment',last_updated_by=p_officer_id WHERE application_no=p_application_no;
    INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_value,new_value)
    VALUES(p_officer_id,'APPLICATION_STATUS_UPDATED','applications',p_application_no,jsonb_build_object('status','Assessed'),jsonb_build_object('status','For Payment','total_amount',v_ass.total_amount));
    RETURN jsonb_build_object('already_finalized',false);
END $$;

REVOKE ALL ON FUNCTION public.get_assessment_inputs(VARCHAR) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.approve_and_assess_application(VARCHAR,UUID,JSONB,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_assessment_bmbe_exemption(VARCHAR,UUID,BOOLEAN,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalize_automatic_assessment(VARCHAR,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_inputs(VARCHAR),
    public.approve_and_assess_application(VARCHAR,UUID,JSONB,TEXT),
    public.set_assessment_bmbe_exemption(VARCHAR,UUID,BOOLEAN,TEXT,TEXT,TEXT),
    public.finalize_automatic_assessment(VARCHAR,UUID) TO service_role;
REVOKE INSERT,UPDATE,DELETE ON public.assessments,public.assessment_line_items FROM anon,authenticated;
COMMIT;
