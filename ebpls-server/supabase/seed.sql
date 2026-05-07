-- =================================================================
-- Seed File: seed.sql
-- Purpose:   Populate all reference/lookup tables with canonical data.
--            This file is the AUTHORITATIVE source for all static data.
--            Individual migration files may also seed their own tables
--            (using ON CONFLICT DO NOTHING), but this file is what
--            Supabase runs on every `supabase db reset` to guarantee
--            a consistent starting state across all developer machines.
-- Author:    eBPLS Team
-- Usage:     Run automatically by: supabase db reset
--            Run manually against live DB: psql $DATABASE_URL -f seed.sql
-- =================================================================

-- =================================================================
-- 1. ROLES
-- Canonical: 5 RBAC roles. IDs are positional and MUST be stable.
--   1 = Applicant (default for all registrations)
--   2 = BPLO_Officer
--   3 = Treasury_Officer
--   4 = Barangay_Officer
--   5 = Admin
-- =================================================================
INSERT INTO public.roles (role_id, role_name) VALUES
    (1, 'Applicant'),
    (2, 'BPLO_Officer'),
    (3, 'Treasury_Officer'),
    (4, 'Barangay_Officer'),
    (5, 'Admin')
ON CONFLICT (role_name) DO NOTHING;

-- =================================================================
-- 2. ORGANIZATION TYPES
-- Standard Philippine business entity classifications.
-- =================================================================
INSERT INTO public.organization_types (name) VALUES
    ('Sole Proprietorship'),
    ('Partnership'),
    ('Corporation'),
    ('Cooperative'),
    ('Non-Governmental Organization'),
    ('Government-Owned or Controlled Corporation')
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- 3. APPLICATION TYPES
-- =================================================================
INSERT INTO public.application_types (name) VALUES
    ('New'),
    ('Renewal'),
    ('Additional Line of Business')
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- 4. PAYMENT MODES (OTC installment options)
-- =================================================================
INSERT INTO public.payment_modes (name) VALUES
    ('Annually'),
    ('Bi-Annually'),
    ('Quarterly')
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- 5. DOCUMENT REQUIREMENT TYPES (BPLO Verification Checklist)
-- =================================================================
INSERT INTO public.requirement_types (name, description) VALUES
    ('DTI / SEC / CDA Registration',       'Proof of legal business registration with DTI (Sole Prop), SEC (Corp/Partnership), or CDA (Coop).'),
    ('Barangay Business Clearance',        'Clearance issued by the Barangay where the business is located.'),
    ('Fire Safety Inspection Certificate', 'Issued by the Bureau of Fire Protection (BFP) after premises inspection.'),
    ('Sanitary Permit',                    'Issued by the Municipal Health Office after sanitary inspection.'),
    ('Zoning Clearance',                   'Confirms business location complies with local zoning ordinances.'),
    ('Lease Contract / TCT',               'Proof of property ownership (TCT/OCT) or lease agreement if renting.'),
    ('Community Tax Certificate (CTC)',    'Cedula of the business owner for the current year.'),
    ('Previous Year Business Permit',      'Required for Renewal applications only.')
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- 6. CLEARANCE TYPES (Barangay Module)
-- =================================================================
INSERT INTO public.clearance_types (name) VALUES
    ('Business Clearance'),
    ('Residential Clearance'),
    ('Good Moral Character')
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- 7. FEE TYPES (Treasury Assessment)
-- NOTE: Fire Safety is inserted separately to reference Mayor's Permit by name.
-- =================================================================
INSERT INTO public.fee_types (name, description, computation_basis) VALUES
    ('Mayor''s Permit Fee',         'Primary business permit fee based on capitalization or gross sales schedule.',     'Gross_Sales'),
    ('Business Tax',                'Annual business tax based on gross sales from the preceding year.',               'Gross_Sales'),
    ('Sanitary Inspection Fee',     'Fee for Municipal Health Office sanitary inspection.',                            'Fixed'),
    ('Zoning / Occupancy Fee',      'Zoning compliance and occupancy verification fee.',                               'Fixed'),
    ('Garbage Collection Fee',      'Annual garbage collection and solid waste management fee.',                       'Fixed'),
    ('Environmental Fee',           'Municipal environmental compliance fee.',                                         'Fixed'),
    ('Weight and Measures Fee',     'Fee for businesses using commercial weighing and measuring devices.',             'Fixed')
ON CONFLICT (name) DO NOTHING;

-- Fire Safety: 10% of Mayor's Permit Fee (self-referencing insert)
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

-- =================================================================
-- 8. BUSINESS ACTIVITIES (Lines of Business / LOB)
-- =================================================================
INSERT INTO public.business_activities (name) VALUES
    ('General Merchandise / Retail Trade'),
    ('Food and Beverage Service (Restaurant / Eatery / Carinderia)'),
    ('Food Manufacturing and Processing'),
    ('Wholesale Trade'),
    ('Personal Services (Salon, Spa, Laundry, etc.)'),
    ('Professional Services (Legal, Medical, Accounting, Consultancy)'),
    ('Financial Services (Lending, Pawnshop, Money Changer)'),
    ('Lodging / Accommodation Services'),
    ('Transportation and Logistics'),
    ('Construction and Contracting'),
    ('Educational Services'),
    ('Entertainment and Recreation'),
    ('Hardware and Construction Materials'),
    ('Agricultural Products and Supplies'),
    ('Pharmaceutical / Drug Store'),
    ('Information Technology and Communications'),
    ('Real Estate Activities'),
    ('Other Services')
ON CONFLICT (name) DO NOTHING;

-- =================================================================
-- 9. DEVELOPMENT ADMIN ACCOUNT
-- =================================================================
-- IMPORTANT: This section is for LOCAL DEVELOPMENT ONLY.
-- Do NOT run this block against a Production database.
--
-- To create a seeded Admin user, use the Supabase CLI or Dashboard:
--
--   Option A — Supabase CLI (recommended):
--     supabase functions invoke create-admin-user --no-verify-jwt
--
--   Option B — Supabase Dashboard:
--     Authentication → Users → Invite User
--     Email: admin@liliw.gov.ph
--     Then update their role_id to 5 (Admin) via:
--       UPDATE public.users SET role_id = 5 WHERE email = 'admin@liliw.gov.ph';
--
--   Option C — Supabase Auth Admin API (from backend bootstrap script):
--     POST /auth/v1/admin/users  { email, password, role: 'authenticated' }
--     Then PATCH public.users SET role_id = 5 via service_role client.
--
-- The bootstrap script at ebpls-server/scripts/create-admin.js handles
-- Option C automatically. Run it once after initial migration:
--   node ebpls-server/scripts/create-admin.js
-- =================================================================
