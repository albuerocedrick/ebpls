-- =================================================================
-- Migration: 008_treasury.sql
-- Purpose:   Create the Treasury module schema: fee types, assessments,
--            line items, and OTC payment transactions.
-- Author:    eBPLS Team
-- Policy:    SYSTEM ARCHITECT — OTC PAYMENT STRICT ENFORCEMENT.
--            tendered_type is hard-constrained to 'Cash' or 'Manager Check'.
--            Online payment channels are EXPLICITLY PROHIBITED at the DB level.
--            Fire Safety Fee = 10% of applicable LGU fees (enforced in
--            assessment.service.js, documented here for traceability).
--            All fee overrides MUST be logged in audit_logs (Phase 9).
-- =================================================================

-- ---------------------------------------------------------------
-- Lookup: fee_types
-- Defines the categories of fees applicable to business permits.
-- Admin-managed via the Admin Module — not hardcoded in the API.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_types (
    id                 SERIAL        PRIMARY KEY,
    name               VARCHAR(150)  NOT NULL UNIQUE,
    description        TEXT,

    -- How this fee is calculated:
    -- 'Fixed'         — flat amount regardless of business size
    -- 'Gross_Sales'   — percentage/schedule based on annual gross sales
    -- 'Percentage'    — fixed percentage of another fee (e.g. Fire Safety = 10% of Mayor's Permit)
    computation_basis  VARCHAR(20)   NOT NULL DEFAULT 'Fixed'
                                     CHECK (computation_basis IN ('Fixed', 'Gross_Sales', 'Percentage')),

    -- For 'Percentage' basis: the fee_type this one is calculated from
    -- e.g. Fire Safety references Mayor's Permit fee_type_id
    percentage_of_id   INTEGER       REFERENCES public.fee_types (id) ON DELETE SET NULL,

    -- Percentage value when computation_basis = 'Percentage' (stored as decimal, e.g. 0.10 = 10%)
    percentage_value   DECIMAL(5, 4),

    is_active          BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE  public.fee_types                    IS 'Admin-managed fee category definitions for business permit assessment.';
COMMENT ON COLUMN public.fee_types.computation_basis IS 'Fixed=flat fee, Gross_Sales=schedule-based, Percentage=derived from another fee type.';
COMMENT ON COLUMN public.fee_types.percentage_of_id  IS 'Self-referencing FK. For Fire Safety (10% of Mayor''s Permit), this points to the Mayor''s Permit fee_type row.';
COMMENT ON COLUMN public.fee_types.percentage_value  IS 'Decimal percentage. 0.10 = 10%. Only used when computation_basis = Percentage.';

-- Seed standard LGU fee types for Liliw, Laguna
-- NOTE: actual amounts/rates are configured in the assessment service, not stored here.
INSERT INTO public.fee_types (name, description, computation_basis) VALUES
    ('Mayor''s Permit Fee',            'Primary business permit fee based on capitalization or gross sales schedule.', 'Gross_Sales'),
    ('Business Tax',                   'Annual business tax based on gross sales from the preceding year.',            'Gross_Sales'),
    ('Sanitary Inspection Fee',        'Fee for Municipal Health Office sanitary inspection.',                         'Fixed'),
    ('Zoning / Occupancy Fee',         'Zoning compliance and occupancy verification fee.',                           'Fixed'),
    ('Garbage Collection Fee',         'Annual garbage collection and solid waste management fee.',                   'Fixed'),
    ('Environmental Fee',              'Municipal environmental compliance fee.',                                      'Fixed'),
    ('Weight and Measures Fee',        'Fee for businesses using commercial weighing and measuring devices.',          'Fixed')
ON CONFLICT (name) DO NOTHING;

-- Insert Fire Safety AFTER other fees so we can reference Mayor's Permit by ID
INSERT INTO public.fee_types (name, description, computation_basis, percentage_of_id, percentage_value)
SELECT
    'Fire Safety Inspection Fee',
    'Bureau of Fire Protection (BFP) fee. Strictly 10% of applicable LGU fees (Mayor''s Permit Fee).',
    'Percentage',
    id,
    0.10
FROM public.fee_types
WHERE name = 'Mayor''s Permit Fee'
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------
-- Table: assessments
-- One assessment per application, created by a Treasury Officer.
-- Stores a denormalized total_amount snapshot for fast reporting.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessments (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no  VARCHAR(20)   NOT NULL UNIQUE REFERENCES public.applications (application_no) ON DELETE RESTRICT,

    -- Denormalized sum of all line items — kept in sync by the assessment service.
    -- UNIQUE per application: only one active assessment at a time.
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),

    assessed_by     UUID          NOT NULL REFERENCES public.users (user_id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.assessments               IS 'Treasury fee assessment record. One per application. Drives the For Assessment→Assessed state transition.';
COMMENT ON COLUMN public.assessments.total_amount  IS 'Denormalized sum of assessment_line_items.amount. Kept in sync by assessment.service.js.';
COMMENT ON COLUMN public.assessments.assessed_by   IS 'Treasury Officer who created and finalized this assessment.';

CREATE OR REPLACE TRIGGER assessments_set_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- Table: assessment_line_items
-- Individual fee breakdown rows within an assessment.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_line_items (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id  UUID          NOT NULL REFERENCES public.assessments (id) ON DELETE CASCADE,
    fee_type_id    INTEGER       NOT NULL REFERENCES public.fee_types (id),

    -- Computed or manually overridden fee amount for this line item
    amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),

    -- Override tracking — if Treasury Officer manually changed the system-calculated amount
    is_override    BOOLEAN       NOT NULL DEFAULT FALSE,
    override_reason TEXT,                               -- Mandatory when is_override = TRUE (enforced at API layer)

    -- Prevent duplicate fee types within the same assessment
    UNIQUE (assessment_id, fee_type_id)
);

COMMENT ON TABLE  public.assessment_line_items                IS 'Individual fee line items composing a treasury assessment.';
COMMENT ON COLUMN public.assessment_line_items.is_override    IS 'TRUE if Treasury Officer manually changed the auto-calculated amount.';
COMMENT ON COLUMN public.assessment_line_items.override_reason IS 'Mandatory when is_override=TRUE. Logged to audit_logs by the API. Explains the deviation from calculated amount.';

-- ---------------------------------------------------------------
-- Table: transactions
-- OTC Payment record. The strictest constraint in the entire schema.
-- =================================================================
-- SYSTEM ARCHITECT RULE — OTC PAYMENT STRICT ENFORCEMENT:
-- This system supports ONLY:
--   (1) Cash
--   (2) Manager's Check
-- ANY other payment type (e-wallet, credit card, online transfer, etc.)
-- is EXPLICITLY PROHIBITED. The CHECK constraint below is the DB-level
-- enforcement of this architectural rule.
-- =================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    transaction_id  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID          NOT NULL UNIQUE REFERENCES public.assessments (id) ON DELETE RESTRICT,

    -- Official Receipt number issued by the Municipal Treasurer's Office
    or_number       VARCHAR(50)   NOT NULL UNIQUE,

    -- OTC Payment amounts
    amount_due      NUMERIC(12,2) NOT NULL CHECK (amount_due > 0),
    amount_tendered NUMERIC(12,2) NOT NULL CHECK (amount_tendered > 0),
    change_amount   NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (change_amount >= 0),

    -- ============================================================
    -- STRICT OTC-ONLY ENFORCEMENT — DO NOT MODIFY THIS CONSTRAINT.
    -- Online payment channels are permanently out of scope per the
    -- System Architecture specification for Municipality of Liliw.
    -- ============================================================
    tendered_type   VARCHAR(20)   NOT NULL
                                  CHECK (tendered_type IN ('Cash', 'Manager Check')),

    -- Check number — required when tendered_type = 'Manager Check'
    check_number    VARCHAR(50),
    bank_name       VARCHAR(100),

    -- The Cashier (Treasury Officer) who recorded this payment
    cashier_id      UUID          NOT NULL REFERENCES public.users (user_id) ON DELETE RESTRICT,
    paid_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.transactions                 IS 'OTC-only payment records. Strictly constrained to Cash or Manager Check. Online payments are architecturally prohibited.';
COMMENT ON COLUMN public.transactions.or_number       IS 'Official Receipt number from the Municipal Treasurer''s Office. Must be unique.';
COMMENT ON COLUMN public.transactions.tendered_type   IS 'STRICTLY Cash or Manager Check only. CHECK constraint enforces this at the DB level.';
COMMENT ON COLUMN public.transactions.change_amount   IS 'Cash change due to the applicant. Must be (amount_tendered - amount_due). Computed by cashier POS, stored for receipt generation.';
COMMENT ON COLUMN public.transactions.check_number    IS 'Bank check number. Required when tendered_type = Manager Check (enforced at API layer).';
