-- 022_fix_paid_at_nullable.sql
-- Allow paid_at to be NULL initially for online payments.
-- This column will be updated with the actual timestamp once confirmed by PayMongo.

ALTER TABLE public.transactions
  ALTER COLUMN paid_at DROP NOT NULL;
