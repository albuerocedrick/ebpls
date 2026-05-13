-- 021_make_or_nullable.sql
-- Allow or_number to be NULL initially for online payments.
-- The OR number will be generated and assigned once the payment is confirmed via webhook.

ALTER TABLE public.transactions
  ALTER COLUMN or_number DROP NOT NULL;

-- Also, make cashier_id nullable for online payments, 
-- as they are initiated by the system/applicant, not a Treasury Officer.
ALTER TABLE public.transactions
  ALTER COLUMN cashier_id DROP NOT NULL;
