SELECT json_build_object(
  'zones', (SELECT json_agg(z ORDER BY z.id) FROM public.location_zones z),
  'barangays', (SELECT json_build_object(
    'total', count(*),
    'complete', count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND zone_id IS NOT NULL),
    'valid_coordinates', count(*) FILTER (WHERE latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
    'active', count(*) FILTER (WHERE is_active)
  ) FROM public.barangays),
  'assignments', (SELECT json_agg(a ORDER BY a.id) FROM (
    SELECT z.id, z.name, count(b.id) AS barangays
    FROM public.location_zones z LEFT JOIN public.barangays b ON b.zone_id = z.id
    GROUP BY z.id, z.name
  ) a),
  'location_zones_rls_enabled', (SELECT c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'location_zones')
) AS phase_1_verification;
