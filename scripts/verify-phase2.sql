SELECT json_build_object(
    'fields', (SELECT json_agg(column_name ORDER BY column_name)
        FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses'
        AND column_name IN ('tenancy_type','stall_unit_numbers')),
    'property_requirements', (SELECT json_agg(r ORDER BY r.name) FROM (
        SELECT rt.name,rt.is_active,rt.applies_to_new,rt.applies_to_renewal,rc.match_value
        FROM public.requirement_types rt JOIN public.requirement_conditions rc ON rc.requirement_id=rt.id
        WHERE rt.condition_type='tenancy_type'
    ) r),
    'clearance', (SELECT json_build_object('active',is_active,'conditional',is_conditional,'max_files',max_files)
        FROM public.requirement_types WHERE name='Barangay Business Clearance'),
    'rpc_permissions', json_build_object(
        'anon',has_function_privilege('anon','public.submit_applicant_application(uuid,jsonb)','EXECUTE'),
        'authenticated',has_function_privilege('authenticated','public.submit_applicant_application(uuid,jsonb)','EXECUTE'),
        'service_role',has_function_privilege('service_role','public.submit_applicant_application(uuid,jsonb)','EXECUTE'))
) AS phase_2_verification;
