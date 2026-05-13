-- 1. Update tendered_type check constraint on transactions table
-- We drop the existing check and add the new one including GCash, Card, and Online
ALTER TABLE public.transactions 
  DROP CONSTRAINT IF EXISTS transactions_tendered_type_check;

ALTER TABLE public.transactions 
  ADD CONSTRAINT transactions_tendered_type_check 
  CHECK (tendered_type IN ('Cash', 'Manager Check', 'GCash', 'Card', 'Online'));

-- 2. Extend application_status Enum
-- This IS an enum type (defined in migration 005)
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'PaymentProcessing' AFTER 'ForPayment';

-- 3. Add PayMongo-specific columns to transactions table
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS paymongo_payment_intent_id VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS paymongo_payment_id VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_channel VARCHAR;

-- 4. Create payment_gateway_logs table for webhook idempotency and debugging
CREATE TABLE IF NOT EXISTS public.payment_gateway_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway VARCHAR NOT NULL DEFAULT 'paymongo',
  event_type VARCHAR NOT NULL,
  paymongo_event_id VARCHAR UNIQUE NOT NULL, -- Used as idempotency key
  application_no VARCHAR REFERENCES public.applications(application_no),
  transaction_id UUID REFERENCES public.transactions(transaction_id),
  raw_payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on the new log table
ALTER TABLE public.payment_gateway_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for payment_gateway_logs
-- Service role (Backend) needs full access to process webhooks
CREATE POLICY "Service role full access"
  ON public.payment_gateway_logs
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin role (role_id 5) can view logs for troubleshooting
CREATE POLICY "Admins can view logs"
  ON public.payment_gateway_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.user_id = auth.uid() 
      AND u.role_id = 5
    )
  );