CREATE TABLE IF NOT EXISTS public.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    application_no  VARCHAR(20) REFERENCES public.applications(application_no) ON DELETE SET NULL,
    type            VARCHAR(50) NOT NULL,   -- 'APPLICATION_RETURNED', 'CERT_READY', etc.
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    action_url      VARCHAR(255),           -- Deep link: e.g., /applicant/status?id=APP-XXXX
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: efficient unread queries per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, is_read)
    WHERE is_read = FALSE;

-- RLS: enable row-level security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: users can only read their own notifications
CREATE POLICY "Users can read own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());
