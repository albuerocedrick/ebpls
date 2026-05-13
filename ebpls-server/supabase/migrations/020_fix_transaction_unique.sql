-- 020_fix_transaction_unique.sql
-- Ensure assessment_id is unique in transactions to allow for idempotent upserts
-- during online payment initiation.

-- First, clean up any existing duplicate transactions (though there shouldn't be many in dev)
-- We use 'paid_at' as the timestamp column.
DELETE FROM public.transactions
WHERE transaction_id IN (
    SELECT transaction_id
    FROM (
        SELECT transaction_id,
               ROW_NUMBER() OVER (PARTITION BY assessment_id ORDER BY paid_at DESC) as row_num
        FROM public.transactions
    ) t
    WHERE t.row_num > 1
);

-- Add the unique constraint (using IF NOT EXISTS logic via a DO block to be safe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_assessment_id_unique'
    ) THEN
        ALTER TABLE public.transactions
        ADD CONSTRAINT transactions_assessment_id_unique UNIQUE (assessment_id);
    END IF;
END $$;
