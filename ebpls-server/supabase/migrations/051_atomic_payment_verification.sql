BEGIN;

ALTER TYPE public.email_trigger_event ADD VALUE IF NOT EXISTS 'PAYMENT_PROOF_REJECTED';
ALTER TABLE public.transactions ADD COLUMN proof_revision INTEGER NOT NULL DEFAULT 1 CHECK (proof_revision > 0);
CREATE INDEX transactions_pending_proof_idx ON public.transactions(payment_date DESC, transaction_id)
WHERE verification_status='Pending' AND tendered_type IN ('GCash','Bank Transfer') AND proof_file_path IS NOT NULL;

-- The application serves signed, owner-checked URLs for this bucket.
DROP POLICY IF EXISTS "Applicants can upload proof of payment" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view proof of payments" ON storage.objects;

CREATE FUNCTION public.issue_business_permit(p_application_no VARCHAR, p_issuer UUID) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_status TEXT;
    v_year INTEGER := extract(year FROM now() AT TIME ZONE 'Asia/Manila');
    v_next TEXT;
    v_permit public.permits%ROWTYPE;
BEGIN
    SELECT status::text INTO v_status FROM public.applications WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND OR v_status NOT IN ('Paid','Completed') THEN
        RAISE EXCEPTION 'Business permits are issued after payment.' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_permit FROM public.permits WHERE application_no=p_application_no;
    IF FOUND THEN RETURN to_jsonb(v_permit); END IF;
    PERFORM pg_advisory_xact_lock(hashtext('ebpls.permit.sequence'), v_year);
    SELECT (coalesce(max(substring(permit_no FROM ('^BP-' || v_year || '-([0-9]{1,12})$'))::bigint),0)+1)::text
    INTO v_next FROM public.permits WHERE permit_no LIKE 'BP-' || v_year || '-%';
    INSERT INTO public.permits(application_no,permit_no,expires_at,issued_by)
    VALUES(p_application_no,'BP-' || v_year || '-' || lpad(v_next,greatest(5,length(v_next)),'0'),
        make_timestamptz(v_year,12,31,23,59,59,'Asia/Manila'),p_issuer) RETURNING * INTO v_permit;
    INSERT INTO public.permit_line_items(permit_id,activity_id)
    SELECT DISTINCT v_permit.id,activity_id FROM public.application_activities WHERE application_no=p_application_no;
    RETURN to_jsonb(v_permit);
END $$;

CREATE FUNCTION public.submit_online_payment_proof(p_application_no VARCHAR, p_actor UUID, p_channel TEXT,
    p_reference TEXT, p_payment_date DATE, p_file TEXT) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_app public.applications%ROWTYPE;
    v_assessment public.assessments%ROWTYPE;
    v_tx public.transactions%ROWTYPE;
    v_role TEXT;
BEGIN
    SELECT r.role_name INTO v_role FROM public.users u JOIN public.roles r USING(role_id)
    WHERE u.user_id=p_actor AND u.is_active;
    IF v_role IS NULL OR v_role NOT IN ('Applicant','Treasury_Officer','Admin') THEN
        RAISE EXCEPTION 'You cannot submit payment proof.' USING ERRCODE='42501';
    END IF;
    SELECT * INTO v_app FROM public.applications WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found.' USING ERRCODE='P0002'; END IF;
    IF v_role='Applicant' AND NOT EXISTS (SELECT 1 FROM public.businesses b JOIN public.taxpayers t USING(taxpayer_id)
        WHERE b.business_id=v_app.business_id AND t.user_id=p_actor) THEN
        RAISE EXCEPTION 'You do not own this application.' USING ERRCODE='42501';
    END IF;
    IF p_channel IS NULL OR p_channel NOT IN ('GCash','Bank Transfer') OR p_reference IS NULL OR length(btrim(p_reference)) NOT BETWEEN 3 AND 100
        OR p_payment_date IS NULL OR nullif(btrim(p_file),'') IS NULL THEN
        RAISE EXCEPTION 'Payment channel, reference, date and proof are required.' USING ERRCODE='22023';
    END IF;
    SELECT * INTO v_assessment FROM public.assessments WHERE application_no=p_application_no FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assessment not found.' USING ERRCODE='P0002'; END IF;
    SELECT * INTO v_tx FROM public.transactions WHERE assessment_id=v_assessment.id FOR UPDATE;
    IF FOUND THEN
        IF v_app.status::text='PaymentVerificationPending' AND v_tx.verification_status='Pending'
           AND (v_tx.proof_file_path,v_tx.payment_reference_no,v_tx.payment_date,v_tx.tendered_type) IS NOT DISTINCT FROM (p_file,p_reference,p_payment_date,p_channel) THEN
            RETURN to_jsonb(v_tx);
        END IF;
        IF v_tx.or_number IS NOT NULL OR v_tx.verification_status='Verified' OR v_tx.tendered_type NOT IN ('GCash','Bank Transfer') OR
           NOT (v_tx.verification_status IS NOT DISTINCT FROM 'Rejected' OR (v_app.status::text='PaymentProcessing' AND v_tx.proof_file_path IS NULL)) THEN
            RAISE EXCEPTION 'A payment or pending proof already exists for this bill.' USING ERRCODE='22023';
        END IF;
    END IF;
    IF v_app.status::text NOT IN ('For Payment','PaymentProcessing') OR v_assessment.total_amount<=0 THEN
        RAISE EXCEPTION 'This application is not ready for payment.' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.transactions(assessment_id,amount_due,amount_tendered,tendered_type,payment_reference_no,payment_date,proof_file_path,verification_status,paid_at,cashier_id)
    VALUES(v_assessment.id,v_assessment.total_amount,v_assessment.total_amount,p_channel,p_reference,p_payment_date,p_file,'Pending',NULL,NULL)
    ON CONFLICT (assessment_id) DO UPDATE SET amount_due=EXCLUDED.amount_due,amount_tendered=EXCLUDED.amount_tendered,
        tendered_type=p_channel,payment_reference_no=p_reference,payment_date=p_payment_date,proof_file_path=p_file,
        verification_status='Pending',rejection_reason=NULL,verified_by=NULL,verified_at=NULL,paid_at=NULL,cashier_id=NULL,
        proof_revision=transactions.proof_revision+1
    WHERE transactions.transaction_id=v_tx.transaction_id AND transactions.or_number IS NULL
    RETURNING * INTO v_tx;
    IF NOT FOUND THEN RAISE EXCEPTION 'The payment changed. Refresh before submitting proof.' USING ERRCODE='22023'; END IF;
    UPDATE public.applications SET status='PaymentVerificationPending',last_updated_by=p_actor WHERE application_no=p_application_no;
    INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,new_value)
    VALUES(p_actor,'PAYMENT_PROOF_SUBMITTED','transactions',v_tx.transaction_id::text,
        jsonb_build_object('application_no',p_application_no,'payment_channel',p_channel,'payment_reference_no',p_reference,'payment_date',p_payment_date,'revision',v_tx.proof_revision));
    RETURN to_jsonb(v_tx);
END $$;

CREATE FUNCTION public.decide_online_payment_proof(p_transaction_id UUID, p_actor UUID, p_decision TEXT,
    p_reason TEXT, p_revision INTEGER) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
    v_app public.applications%ROWTYPE;
    v_assessment public.assessments%ROWTYPE;
    v_tx public.transactions%ROWTYPE;
    v_app_no VARCHAR(20);
    v_year INTEGER := extract(year FROM now() AT TIME ZONE 'Asia/Manila');
    v_next TEXT;
    v_or VARCHAR(50);
    v_permit JSONB;
    v_owner RECORD;
    v_reason TEXT := nullif(btrim(p_reason),'');
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users u JOIN public.roles r USING(role_id) WHERE u.user_id=p_actor AND u.is_active
        AND r.role_name IN ('Treasury_Officer','Admin')) THEN
        RAISE EXCEPTION 'Treasury authorization is required.' USING ERRCODE='42501';
    END IF;
    IF p_decision IS NULL OR p_decision NOT IN ('Verified','Rejected')
       OR (p_decision='Rejected' AND (v_reason IS NULL OR length(v_reason) NOT BETWEEN 3 AND 1000)) THEN
        RAISE EXCEPTION 'A rejection reason of 3 to 1000 characters is required.' USING ERRCODE='22023';
    END IF;
    SELECT a.application_no INTO v_app_no FROM public.transactions t JOIN public.assessments a ON a.id=t.assessment_id
    WHERE t.transaction_id=p_transaction_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment proof not found.' USING ERRCODE='P0002'; END IF;
    SELECT * INTO STRICT v_app FROM public.applications WHERE application_no=v_app_no FOR UPDATE;
    SELECT * INTO STRICT v_assessment FROM public.assessments WHERE application_no=v_app_no FOR UPDATE;
    SELECT * INTO STRICT v_tx FROM public.transactions WHERE transaction_id=p_transaction_id FOR UPDATE;
    IF v_tx.tendered_type NOT IN ('GCash','Bank Transfer') OR nullif(btrim(v_tx.proof_file_path),'') IS NULL THEN
        RAISE EXCEPTION 'This transaction has no online payment proof.' USING ERRCODE='22023';
    END IF;
    IF coalesce(p_revision,1) <> v_tx.proof_revision THEN
        RAISE EXCEPTION 'The applicant uploaded a new proof. Refresh and review it before deciding.' USING ERRCODE='22023';
    END IF;
    IF v_tx.verification_status=p_decision AND ((p_decision='Rejected' AND v_app.status::text='For Payment') OR
        (p_decision='Verified' AND v_tx.or_number IS NOT NULL AND v_app.status::text IN ('Paid','Completed'))) THEN
        RETURN jsonb_build_object('transaction',to_jsonb(v_tx),'application_no',v_app_no,'or_number',v_tx.or_number,'already_decided',true);
    END IF;
    IF v_app.status::text <> 'PaymentVerificationPending' OR v_tx.verification_status IS DISTINCT FROM 'Pending' OR v_tx.or_number IS NOT NULL THEN
        RAISE EXCEPTION 'This proof is no longer pending verification.' USING ERRCODE='22023';
    END IF;
    IF p_decision='Verified' THEN
        IF v_tx.amount_due <> v_assessment.total_amount OR v_tx.amount_tendered <> v_assessment.total_amount THEN
            RAISE EXCEPTION 'The payment amounts do not match the current assessment.' USING ERRCODE='22023';
        END IF;
        PERFORM pg_advisory_xact_lock(hashtext('ebpls.or.sequence'),v_year);
        SELECT (coalesce(max(substring(or_number FROM ('^OR-' || v_year || '-([0-9]{1,12})$'))::bigint),0)+1)::text
        INTO v_next FROM public.transactions WHERE or_number LIKE 'OR-' || v_year || '-%';
        v_or := 'OR-' || v_year || '-' || lpad(v_next,greatest(6,length(v_next)),'0');
        UPDATE public.transactions SET verification_status='Verified',rejection_reason=NULL,or_number=v_or,
            cashier_id=p_actor,paid_at=now(),verified_by=p_actor,verified_at=now()
        WHERE transaction_id=p_transaction_id RETURNING * INTO v_tx;
        UPDATE public.applications SET status='Paid',last_updated_by=p_actor WHERE application_no=v_app_no;
        v_permit := public.issue_business_permit(v_app_no,p_actor);
        UPDATE public.applications SET status='Completed',last_updated_by=p_actor WHERE application_no=v_app_no;
    ELSE
        UPDATE public.transactions SET verification_status='Rejected',rejection_reason=v_reason,verified_by=p_actor,verified_at=now()
        WHERE transaction_id=p_transaction_id RETURNING * INTO v_tx;
        UPDATE public.applications SET status='For Payment',last_updated_by=p_actor WHERE application_no=v_app_no;
    END IF;
    SELECT u.user_id,u.email,t.first_name,t.last_name,b.business_name INTO v_owner
    FROM public.businesses b JOIN public.taxpayers t USING(taxpayer_id) JOIN public.users u ON u.user_id=t.user_id
    WHERE b.business_id=v_app.business_id;
    IF v_owner.user_id IS NOT NULL THEN
        INSERT INTO public.notifications(user_id,application_no,type,title,message,action_url)
        VALUES(v_owner.user_id,v_app_no,CASE WHEN p_decision='Verified' THEN 'PAYMENT_CONFIRMED' ELSE 'PAYMENT_PROOF_REJECTED' END,
            CASE WHEN p_decision='Verified' THEN 'Payment verified' ELSE 'Payment proof returned' END,
            CASE WHEN p_decision='Verified' THEN 'Official Receipt ' || v_or || ' and your Business Permit are ready for download.' ELSE v_reason END,
            '/applicant/status?id=' || v_app_no);
    END IF;
    INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,old_value,new_value)
    VALUES(p_actor,'PAYMENT_PROOF_' || upper(p_decision),'transactions',p_transaction_id::text,
        jsonb_build_object('verification_status','Pending','application_status',v_app.status),
        jsonb_build_object('verification_status',p_decision,'application_no',v_app_no,'or_number',v_or,'rejection_reason',v_reason,'revision',v_tx.proof_revision));
    RETURN jsonb_build_object('transaction',to_jsonb(v_tx),'application_no',v_app_no,'or_number',v_or,'permit',v_permit,
        'recipient',to_jsonb(v_owner),'already_decided',false);
END $$;

REVOKE ALL ON FUNCTION public.issue_business_permit(VARCHAR,UUID), public.submit_online_payment_proof(VARCHAR,UUID,TEXT,TEXT,DATE,TEXT),
    public.decide_online_payment_proof(UUID,UUID,TEXT,TEXT,INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_business_permit(VARCHAR,UUID), public.submit_online_payment_proof(VARCHAR,UUID,TEXT,TEXT,DATE,TEXT),
    public.decide_online_payment_proof(UUID,UUID,TEXT,TEXT,INTEGER) TO service_role;

COMMIT;
