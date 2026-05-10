-- =============================================================================
-- Migration 018: PayMongo Online Payment Integration
-- eBPLS — Municipality of Liliw
-- =============================================================================
-- What this migration does:
--   1. Add 'PaymentProcessing' to the application_status enum
--   2. Add 'GCash', 'Card', 'Online' values to the tendered_type check constraint
--      (tendered_type is VARCHAR in the current schema — a CHECK constraint is added)
--   3. Make transactions.cashier_id nullable (online payments have no cashier)
--   4. Add PayMongo reference columns to transactions
--   5. Create payment_gateway_logs table with RLS
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Add 'PaymentProcessing' to application_status enum
-- -----------------------------------------------------------------------------
-- application_status is a USER-DEFINED enum type confirmed in the schema.
-- PostgreSQL requires each new enum value to be added individually.

ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'PaymentProcessing';


-- -----------------------------------------------------------------------------
-- 2. Handle tendered_type
-- -----------------------------------------------------------------------------
-- The current schema has tendered_type as character varying with no constraint.
-- We add a CHECK constraint covering both existing and new values.
-- If a CHECK constraint already exists on this column, drop it first.

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_tendered_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_tendered_type_check
  CHECK (tendered_type IN ('Cash', 'Manager Check', 'GCash', 'Card', 'Online'));


-- -----------------------------------------------------------------------------
-- 3. Make cashier_id nullable
-- -----------------------------------------------------------------------------
-- Online payments are initiated by the applicant (no cashier involved).
-- cashier_id was NOT NULL in the original schema — this must be relaxed.

ALTER TABLE transactions
  ALTER COLUMN cashier_id DROP NOT NULL;


-- -----------------------------------------------------------------------------
-- 4. Add PayMongo reference columns to transactions
-- -----------------------------------------------------------------------------

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS paymongo_payment_intent_id VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS paymongo_payment_id        VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_channel            VARCHAR;

COMMENT ON COLUMN transactions.paymongo_payment_intent_id IS
  'PayMongo Payment Intent ID. Populated on online payment initiation. NULL for OTC payments.';

COMMENT ON COLUMN transactions.paymongo_payment_id IS
  'PayMongo confirmed Payment ID returned via webhook. NULL for OTC payments.';

COMMENT ON COLUMN transactions.payment_channel IS
  'PayMongo-reported channel: gcash | card | paymongo_link. NULL for OTC payments.';


-- -----------------------------------------------------------------------------
-- 5. Create payment_gateway_logs table
-- -----------------------------------------------------------------------------
-- Append-only audit table for all inbound PayMongo webhook events.
-- Used for idempotency: paymongo_event_id has a UNIQUE constraint so duplicate
-- webhook deliveries are detected and rejected before any state change occurs.

CREATE TABLE IF NOT EXISTS payment_gateway_logs (
  log_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway            VARCHAR      NOT NULL    DEFAULT 'paymongo',
  event_type         VARCHAR      NOT NULL,
  paymongo_event_id  VARCHAR      NOT NULL    UNIQUE,
  application_no     VARCHAR      NOT NULL    REFERENCES applications(application_no),
  transaction_id     UUID                     REFERENCES transactions(transaction_id),
  raw_payload        JSONB        NOT NULL,
  processed          BOOLEAN      NOT NULL    DEFAULT false,
  processed_at       TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE payment_gateway_logs IS
  'Append-only audit log for all inbound PayMongo webhook events. '
  'paymongo_event_id UNIQUE constraint provides idempotency. No DELETE policy granted.';

COMMENT ON COLUMN payment_gateway_logs.paymongo_event_id IS
  'The unique event ID from the PayMongo webhook payload. Used as idempotency key.';

COMMENT ON COLUMN payment_gateway_logs.raw_payload IS
  'Full raw webhook body as received. Never modified after insert.';


-- -----------------------------------------------------------------------------
-- 6. RLS for payment_gateway_logs
-- -----------------------------------------------------------------------------
-- RLS is auto-enabled on new tables via the rls_auto_enable event trigger
-- already present in the database. We still set policies explicitly here
-- for clarity and to ensure the service role is the only writer.

ALTER TABLE payment_gateway_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert (webhook handler runs under service role).
CREATE POLICY "Service role can insert gateway logs"
  ON payment_gateway_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update (mark processed = true after handling).
CREATE POLICY "Service role can update gateway logs"
  ON payment_gateway_logs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Service role can select (for idempotency lookups).
CREATE POLICY "Service role can select gateway logs"
  ON payment_gateway_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Admin can select (for audit log viewer in the Admin module).
CREATE POLICY "Admin can select gateway logs"
  ON payment_gateway_logs
  FOR SELECT
  USING (auth_user_role() = 'Admin');

-- No DELETE policy — this table is permanent append-only.


-- -----------------------------------------------------------------------------
-- 7. Index for common lookups
-- -----------------------------------------------------------------------------

-- Lookup by application when viewing payment history.
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_application_no
  ON payment_gateway_logs (application_no);

-- Lookup by processing status for any background reconciliation jobs.
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_processed
  ON payment_gateway_logs (processed)
  WHERE processed = false;

-- Lookup PayMongo reference columns on transactions (used in webhook handler).
CREATE INDEX IF NOT EXISTS idx_transactions_paymongo_intent
  ON transactions (paymongo_payment_intent_id)
  WHERE paymongo_payment_intent_id IS NOT NULL;