SELECT json_build_object(
 'assessments', (SELECT json_build_object('count',count(*),'total_amount_sum',coalesce(sum(total_amount),0)) FROM public.assessments),
 'line_items', (SELECT json_build_object('count',count(*),'amount_sum',coalesce(sum(amount),0),'missing_base_amounts',count(*) FILTER(WHERE base_amount IS NULL)) FROM public.assessment_line_items),
 'client_permissions',json_build_object(
  'line_update',has_table_privilege('authenticated','public.assessment_line_items','UPDATE'),
  'assessment_update',has_table_privilege('authenticated','public.assessments','UPDATE'),
  'approve',has_function_privilege('authenticated','public.approve_and_assess_application(varchar,uuid,jsonb,text)','EXECUTE'),
  'bmbe',has_function_privilege('authenticated','public.set_assessment_bmbe_exemption(varchar,uuid,boolean,text,text,text)','EXECUTE')),
 'service_permissions',json_build_object(
  'approve',has_function_privilege('service_role','public.approve_and_assess_application(varchar,uuid,jsonb,text)','EXECUTE'),
  'bmbe',has_function_privilege('service_role','public.set_assessment_bmbe_exemption(varchar,uuid,boolean,text,text,text)','EXECUTE'))
) AS phase_3_verification;
