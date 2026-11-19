BEGIN;

-- 1. Create table for tracking permit expiry warnings and suppressing duplicates
CREATE TABLE IF NOT EXISTS public.permit_expiry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_no VARCHAR(50) NOT NULL REFERENCES public.permits(permit_no) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(business_id) ON DELETE CASCADE,
    warning_tier INTEGER NOT NULL CHECK (warning_tier IN (60, 30, 15)),
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notification_channel TEXT NOT NULL DEFAULT 'both' CHECK (notification_channel IN ('in_app', 'email', 'both')),
    UNIQUE(permit_no, warning_tier)
);

CREATE INDEX IF NOT EXISTS idx_permit_expiry_logs_permit ON public.permit_expiry_logs(permit_no);
CREATE INDEX IF NOT EXISTS idx_permit_expiry_logs_tier ON public.permit_expiry_logs(warning_tier);
CREATE INDEX IF NOT EXISTS idx_permit_expiry_logs_date ON public.permit_expiry_logs(notified_at);

ALTER TABLE public.permit_expiry_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.permit_expiry_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_expiry_logs TO service_role;

-- 2. Stored Procedure: Fetch expiring permits with tier calculation and deduplication
CREATE OR REPLACE FUNCTION public.get_expiring_permits(p_reference_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE (
    permit_no VARCHAR(50),
    business_id UUID,
    bin VARCHAR(50),
    business_name VARCHAR(255),
    taxpayer_user_id UUID,
    taxpayer_name TEXT,
    taxpayer_email TEXT,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER,
    warning_tier INTEGER
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH active_permits AS (
    SELECT 
        p.permit_no,
        b.business_id,
        b.bin,
        b.business_name,
        u.user_id AS taxpayer_user_id,
        (t.first_name || ' ' || t.last_name) AS taxpayer_name,
        u.email AS taxpayer_email,
        p.expires_at,
        floor(extract(epoch FROM (p.expires_at - p_reference_date)) / 86400)::integer AS days_remaining
    FROM public.permits p
    JOIN public.applications a ON a.application_no = p.application_no
    JOIN public.businesses b ON b.business_id = a.business_id
    JOIN public.taxpayers t ON t.taxpayer_id = b.taxpayer_id
    JOIN public.users u ON u.user_id = t.user_id
    WHERE NOT b.is_retired
      AND p.expires_at >= p_reference_date
      AND floor(extract(epoch FROM (p.expires_at - p_reference_date)) / 86400)::integer <= 60
),
evaluated_tiers AS (
    SELECT 
        ap.*,
        CASE 
            WHEN ap.days_remaining <= 15 THEN 15
            WHEN ap.days_remaining <= 30 THEN 30
            WHEN ap.days_remaining <= 60 THEN 60
            ELSE NULL
        END AS target_tier
    FROM active_permits ap
)
SELECT 
    et.permit_no,
    et.business_id,
    et.bin,
    et.business_name,
    et.taxpayer_user_id,
    et.taxpayer_name,
    et.taxpayer_email,
    et.expires_at,
    et.days_remaining,
    et.target_tier AS warning_tier
FROM evaluated_tiers et
WHERE et.target_tier IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.permit_expiry_logs pel
      WHERE pel.permit_no = et.permit_no
        AND pel.warning_tier = et.target_tier
  );
$$;

-- 3. Stored Procedure: Record expiry notification log entry
CREATE OR REPLACE FUNCTION public.log_permit_expiry_notification(
    p_permit_no VARCHAR,
    p_business_id UUID,
    p_tier INTEGER,
    p_channel TEXT DEFAULT 'both'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.permit_expiry_logs (permit_no, business_id, warning_tier, notification_channel, notified_at)
    VALUES (p_permit_no, p_business_id, p_tier, p_channel, now())
    ON CONFLICT (permit_no, warning_tier) DO NOTHING
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

COMMIT;
