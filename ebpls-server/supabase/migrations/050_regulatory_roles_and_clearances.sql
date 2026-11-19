BEGIN;

INSERT INTO public.roles(role_name) VALUES ('MHO_Officer'), ('BFB_Officer'), ('Amilyar_Officer')
ON CONFLICT (role_name) DO NOTHING;

ALTER TABLE public.requirement_types ADD COLUMN regulatory_agency_code TEXT
    CHECK (regulatory_agency_code IN ('MHO', 'BFB', 'AMILYAR'));
UPDATE public.requirement_types SET regulatory_agency_code = CASE
    WHEN name IN ('Sanitary Permit', 'Laboratories (Photocopy of X-ray Result)', 'Health Certificate', 'Food Handler Card') THEN 'MHO'
    WHEN name = 'Fire Safety Inspection Certificate' THEN 'BFB'
    WHEN name = 'Realty Tax (OR-Amilyar)' THEN 'AMILYAR'
END;

CREATE TABLE public.regulatory_clearances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no VARCHAR(20) NOT NULL REFERENCES public.applications(application_no) ON DELETE CASCADE,
    agency_code TEXT NOT NULL CHECK (agency_code IN ('MHO', 'BFB', 'AMILYAR')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Returned', 'Not Needed')),
    remarks TEXT,
    verified_by UUID REFERENCES public.users(user_id),
    verified_at TIMESTAMPTZ,
    UNIQUE (application_no, agency_code)
);
CREATE INDEX regulatory_clearances_queue_idx ON public.regulatory_clearances(agency_code, status, application_no);
ALTER TABLE public.regulatory_clearances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.regulatory_clearances FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regulatory_clearances TO service_role;

CREATE FUNCTION public.seed_regulatory_clearances(p_application_no VARCHAR, p_reset BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.regulatory_clearances(application_no, agency_code, status)
    SELECT p_application_no, agency.code,
        CASE WHEN EXISTS (
            SELECT 1 FROM public.doc_verifications d JOIN public.requirement_types r ON r.id=d.requirement_id
            WHERE d.application_no=p_application_no AND r.regulatory_agency_code=agency.code
        ) THEN 'Pending' ELSE 'Not Needed' END
    FROM (VALUES ('MHO'), ('BFB'), ('AMILYAR')) agency(code)
    ON CONFLICT (application_no, agency_code) DO UPDATE SET status=EXCLUDED.status,
        remarks=NULL, verified_at=NULL, verified_by=NULL WHERE p_reset;
END $$;

CREATE FUNCTION public.sync_regulatory_clearances() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NEW.status::text IN ('Pending', 'Under Review') THEN
        IF TG_OP = 'INSERT' THEN
            PERFORM public.seed_regulatory_clearances(NEW.application_no, false);
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            PERFORM public.seed_regulatory_clearances(NEW.application_no, OLD.status::text = 'Returned');
            IF OLD.status::text = 'Returned' THEN
                DELETE FROM public.application_data_reviews WHERE application_no=NEW.application_no;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- Phase 1 writes the checklist after the application header in the same transaction.
CREATE CONSTRAINT TRIGGER applications_sync_regulatory_clearances
AFTER INSERT OR UPDATE ON public.applications DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_regulatory_clearances();

SELECT public.seed_regulatory_clearances(application_no, false)
FROM public.applications WHERE status::text IN ('Pending', 'Under Review');

CREATE FUNCTION public.enforce_regulatory_approval() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF OLD.status::text IN ('Pending', 'Under Review') AND NEW.status::text IN ('Verified', 'For Assessment', 'Assessed')
        AND (SELECT count(*) FROM public.regulatory_clearances c WHERE c.application_no=NEW.application_no
             AND (c.status='Verified' OR (c.status='Not Needed' AND NOT EXISTS (
                 SELECT 1 FROM public.doc_verifications d JOIN public.requirement_types r ON r.id=d.requirement_id
                 WHERE d.application_no=c.application_no AND r.regulatory_agency_code=c.agency_code
             )))) <> 3 THEN
        RAISE EXCEPTION 'All inter-agency regulatory clearances must be verified or not needed before BPLO approval.' USING ERRCODE='22023';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER applications_require_regulatory_signoff BEFORE UPDATE OF status ON public.applications
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.enforce_regulatory_approval();

CREATE FUNCTION public.protect_regulatory_document_review() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF (NEW.status, NEW.remarks, NEW.verified_by) IS DISTINCT FROM (OLD.status, OLD.remarks, OLD.verified_by)
       AND current_setting('ebpls.regulatory_review', true) IS DISTINCT FROM 'on'
       AND EXISTS (SELECT 1 FROM public.requirement_types WHERE id=OLD.requirement_id AND regulatory_agency_code IS NOT NULL) THEN
        RAISE EXCEPTION 'Only the assigned agency can review this document.' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER doc_verifications_agency_review BEFORE UPDATE OF status, remarks, verified_by ON public.doc_verifications
FOR EACH ROW EXECUTE FUNCTION public.protect_regulatory_document_review();

CREATE FUNCTION public.review_regulatory_clearance(p_application_no VARCHAR, p_agency TEXT, p_officer UUID,
    p_decision TEXT, p_remarks TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_app public.applications%ROWTYPE;
    v_clearance public.regulatory_clearances%ROWTYPE;
    v_applicant_user UUID;
    v_remarks TEXT := nullif(btrim(p_remarks), '');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r ON r.role_id=u.role_id
        WHERE u.user_id=p_officer AND u.is_active AND r.role_name=CASE p_agency
            WHEN 'MHO' THEN 'MHO_Officer' WHEN 'BFB' THEN 'BFB_Officer' WHEN 'AMILYAR' THEN 'Amilyar_Officer' END) THEN
        RAISE EXCEPTION 'Only the assigned agency can review this clearance.' USING ERRCODE='42501';
    END IF;
    IF p_decision IS NULL OR p_decision NOT IN ('Verified', 'Returned')
       OR (p_decision='Returned' AND v_remarks IS NULL) OR length(v_remarks)>1000 THEN
        RAISE EXCEPTION 'Provide valid remarks when returning a clearance.' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_app FROM public.applications WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found.' USING ERRCODE='P0002'; END IF;
    SELECT * INTO v_clearance FROM public.regulatory_clearances WHERE application_no=p_application_no AND agency_code=p_agency FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Clearance not found.' USING ERRCODE='P0002'; END IF;
    IF v_clearance.status=p_decision THEN RETURN to_jsonb(v_clearance); END IF;
    IF v_app.status::text NOT IN ('Pending', 'Under Review') OR v_clearance.status <> 'Pending' THEN
        RAISE EXCEPTION 'This clearance is no longer pending review.' USING ERRCODE='22023';
    END IF;

    IF p_decision='Verified' AND (
        NOT EXISTS (SELECT 1 FROM public.doc_verifications d JOIN public.requirement_types r ON r.id=d.requirement_id
            WHERE d.application_no=p_application_no AND r.regulatory_agency_code=p_agency)
        OR EXISTS (SELECT 1 FROM public.doc_verifications d JOIN public.requirement_types r ON r.id=d.requirement_id
            WHERE d.application_no=p_application_no AND r.regulatory_agency_code=p_agency AND nullif(btrim(d.file_path), '') IS NULL)
    ) THEN
        RAISE EXCEPTION 'All assigned documents must be uploaded before verification.' USING ERRCODE='22023';
    END IF;

    UPDATE public.regulatory_clearances SET status=p_decision, remarks=v_remarks, verified_by=p_officer, verified_at=now()
    WHERE id=v_clearance.id RETURNING * INTO v_clearance;
    PERFORM set_config('ebpls.regulatory_review', 'on', true);
    UPDATE public.doc_verifications d SET status=p_decision, remarks=v_remarks, verified_by=p_officer
    FROM public.requirement_types r WHERE d.application_no=p_application_no AND d.requirement_id=r.id AND r.regulatory_agency_code=p_agency;
    PERFORM set_config('ebpls.regulatory_review', '', true);

    IF p_decision='Returned' THEN
        UPDATE public.applications SET status='Returned', return_remarks=p_agency || ': ' || v_remarks, last_updated_by=p_officer
        WHERE application_no=p_application_no;
        SELECT t.user_id INTO v_applicant_user FROM public.businesses b JOIN public.taxpayers t USING (taxpayer_id)
        WHERE b.business_id=v_app.business_id;
        IF v_applicant_user IS NOT NULL THEN
            INSERT INTO public.notifications(user_id, application_no, type, title, message, action_url)
            VALUES(v_applicant_user,p_application_no,'APPLICATION_RETURNED','Clearance returned for correction',
                p_agency || ': ' || v_remarks,'/applicant/status?id=' || p_application_no);
        END IF;
    END IF;
    INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_value,new_value)
    VALUES(p_officer,'REGULATORY_CLEARANCE_' || upper(p_decision),'regulatory_clearances',v_clearance.id::text,
        jsonb_build_object('status','Pending'),jsonb_build_object('status',p_decision,'agency_code',p_agency,'application_no',p_application_no,'remarks',v_remarks));
    RETURN to_jsonb(v_clearance);
END $$;

REVOKE ALL ON FUNCTION public.seed_regulatory_clearances(VARCHAR, BOOLEAN), public.sync_regulatory_clearances(),
    public.enforce_regulatory_approval(), public.protect_regulatory_document_review(),
    public.review_regulatory_clearance(VARCHAR,TEXT,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_regulatory_clearance(VARCHAR,TEXT,UUID,TEXT,TEXT) TO service_role;

COMMIT;
