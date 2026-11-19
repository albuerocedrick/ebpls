const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const taxpayerUser = '11111111-1111-4111-8111-111111111111';
const otherUser = '22222222-2222-4222-8222-222222222222';
const officerUser = '33333333-3333-4333-8333-333333333333';
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit INTEGER, allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects (bucket_id TEXT);
    CREATE TABLE users (user_id UUID PRIMARY KEY, role_id INTEGER, email TEXT, is_active BOOLEAN DEFAULT true);
    CREATE TABLE taxpayers (taxpayer_id UUID PRIMARY KEY, user_id UUID UNIQUE REFERENCES users(user_id), first_name TEXT, last_name TEXT);
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  `);

  const migrations = [
    '001_roles.sql', '004_businesses.sql', '005_applications.sql', '006_verifications.sql',
    '008_treasury.sql', '010_permits.sql', '011_audit_logs.sql', '012_email_notifications.sql',
    '018_doc_verifications_file_path.sql', '030_barangays_lookup.sql', '034_requirements_revision.sql',
    '035_requirements_revision_updates.sql', '038_activity_metric_count.sql', '043_location_mismatch.sql',
    '044_location_zones_and_centroids.sql', '045_applicant_fields_and_tenancy.sql', '032_add_fixed_amount_to_fees.sql',
    '036_fee_schedule.sql', '047_automatic_assessment.sql', '048_payment_proof_schema.sql',
    '049_multi_branch_and_bin_schema.sql', '050_regulatory_roles_and_clearances.sql',
    '051_atomic_payment_verification.sql', '052_renewal_hub_and_selective_renewal.sql',
    '053_business_amendments.sql', '054_expiry_notifications_and_audit.sql'
  ];

  for (const name of migrations) {
    await db.exec(readFileSync(join(__dirname, '../supabase/migrations', name), 'utf8'));
  }

  await db.query(`INSERT INTO users(user_id, role_id, email) SELECT $1, role_id, 'taxpayer@example.test' FROM roles WHERE role_name='Applicant'`, [taxpayerUser]);
  await db.query(`INSERT INTO users(user_id, role_id, email) SELECT $1, role_id, 'other@example.test' FROM roles WHERE role_name='Applicant'`, [otherUser]);
  await db.query(`INSERT INTO users(user_id, role_id, email) SELECT $1, role_id, 'officer@example.test' FROM roles WHERE role_name='BPLO_Officer'`, [officerUser]);
  await db.query(`INSERT INTO taxpayers VALUES ($1, $1, 'Elena', 'Reyes')`, [taxpayerUser]);
  await db.query(`INSERT INTO taxpayers VALUES ($1, $1, 'Carlos', 'Tan')`, [otherUser]);
});

after(async () => {
  await db?.close();
});

test('054 migration sets up permit_expiry_logs and stored procedures', async () => {
  const { rows: tableCheck } = await db.query(`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'permit_expiry_logs'
  `);
  assert.equal(tableCheck.length, 1, 'permit_expiry_logs table must exist');

  const { rows: procCheck } = await db.query(`
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_name IN ('get_expiring_permits', 'log_permit_expiry_notification')
  `);
  assert.equal(procCheck.length, 2, 'both stored procedures must exist');
});

test('get_expiring_permits correctly categorizes 60, 30, and 15-day tiers based on reference date', async () => {
  // 1. Create a business and completed application with permit expiring Dec 31, 2026
  const { rows: [biz] } = await db.query(`
    INSERT INTO businesses (taxpayer_id, business_name, trade_name, org_type_id, address_line1, barangay, tenancy_type)
    VALUES ($1, 'Liliw Footwear Craft', 'Liliw Shoes', 1, '12 Mabini St', 'Rizal (Poblacion)', 'Owned Commercial')
    RETURNING business_id, bin
  `, [taxpayerUser]);

  const appNo = 'APP-2026-EXP01';
  await db.query(`
    INSERT INTO applications (application_no, business_id, type_id, status)
    VALUES ($1, $2, 1, 'Completed')
  `, [appNo, biz.business_id]);

  const permitNo = 'BP-2026-EXP01';
  await db.query(`
    INSERT INTO permits (permit_no, application_no, issued_at, expires_at, issued_by)
    VALUES ($1, $2, '2026-01-15T00:00:00Z', '2026-12-31T23:59:59+08', $3)
  `, [permitNo, appNo, officerUser]);

  // Test Tier 60: Evaluated on Nov 1, 2026 (~60 days before Dec 31)
  const nov1 = '2026-11-01T08:00:00Z';
  const { rows: tier60Rows } = await db.query(`SELECT * FROM public.get_expiring_permits($1)`, [nov1]);
  const found60 = tier60Rows.find(r => r.permit_no === permitNo);
  assert.ok(found60, 'Permit should be detected on Nov 1');
  assert.equal(found60.warning_tier, 60, 'Should fall into 60-day tier');
  assert.ok(found60.days_remaining <= 60 && found60.days_remaining > 30);
  assert.equal(found60.business_name, 'Liliw Footwear Craft');

  // Test Tier 30: Evaluated on Dec 2, 2026 (~29 days before Dec 31)
  const dec2 = '2026-12-02T08:00:00Z';
  const { rows: tier30Rows } = await db.query(`SELECT * FROM public.get_expiring_permits($1)`, [dec2]);
  const found30 = tier30Rows.find(r => r.permit_no === permitNo);
  assert.ok(found30, 'Permit should be detected on Dec 2');
  assert.equal(found30.warning_tier, 30, 'Should fall into 30-day tier');

  // Test Tier 15: Evaluated on Dec 20, 2026 (~11 days before Dec 31)
  const dec20 = '2026-12-20T08:00:00Z';
  const { rows: tier15Rows } = await db.query(`SELECT * FROM public.get_expiring_permits($1)`, [dec20]);
  const found15 = tier15Rows.find(r => r.permit_no === permitNo);
  assert.ok(found15, 'Permit should be detected on Dec 20');
  assert.equal(found15.warning_tier, 15, 'Should fall into 15-day tier');
});

test('Deduplication guard: logging notification suppresses repeat alerts for the same tier', async () => {
  const permitNo = 'BP-2026-EXP01';
  const { rows: [biz] } = await db.query(`SELECT business_id FROM businesses WHERE business_name = 'Liliw Footwear Craft'`);

  // Reference date in 60-day range
  const nov5 = '2026-11-05T08:00:00Z';
  const { rows: initial } = await db.query(`SELECT * FROM public.get_expiring_permits($1) WHERE permit_no = $2`, [nov5, permitNo]);
  assert.equal(initial.length, 1, 'Should find permit before notification is logged');
  assert.equal(initial[0].warning_tier, 60);

  // Log 60-day notification dispatch
  await db.query(`
    SELECT public.log_permit_expiry_notification($1, $2, 60, 'both')
  `, [permitNo, biz.business_id]);

  // Verify entry in permit_expiry_logs
  const { rows: logs } = await db.query(`SELECT * FROM permit_expiry_logs WHERE permit_no = $1 AND warning_tier = 60`, [permitNo]);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].notification_channel, 'both');

  // Re-run get_expiring_permits on same date (Nov 5) -> Must be excluded (0 rows)
  const { rows: afterLogged } = await db.query(`SELECT * FROM public.get_expiring_permits($1) WHERE permit_no = $2`, [nov5, permitNo]);
  assert.equal(afterLogged.length, 0, 'Permit must not appear again for tier 60 once logged');

  // But when evaluated at Dec 2 (30-day tier), it SHOULD appear for tier 30 because tier 30 is not yet logged!
  const dec2 = '2026-12-02T08:00:00Z';
  const { rows: tier30Check } = await db.query(`SELECT * FROM public.get_expiring_permits($1) WHERE permit_no = $2`, [dec2, permitNo]);
  assert.equal(tier30Check.length, 1, 'Must appear for tier 30');
  assert.equal(tier30Check[0].warning_tier, 30);
});

test('Unique constraint prevents duplicate log insertions for same permit and tier', async () => {
  const permitNo = 'BP-2026-EXP01';
  const { rows: [biz] } = await db.query(`SELECT business_id FROM businesses WHERE business_name = 'Liliw Footwear Craft'`);

  // Calling log_permit_expiry_notification again for tier 60 (already logged)
  // ON CONFLICT (permit_no, warning_tier) DO NOTHING should succeed gracefully and return null
  const { rows: [dupResult] } = await db.query(`
    SELECT public.log_permit_expiry_notification($1, $2, 60, 'both') AS id
  `, [permitNo, biz.business_id]);

  assert.equal(dupResult.id, null, 'Duplicate insertion should return null without throwing error');

  // Total count in log table must still be 1 for tier 60
  const { rows: logs } = await db.query(`SELECT count(*)::integer AS cnt FROM permit_expiry_logs WHERE permit_no = $1 AND warning_tier = 60`, [permitNo]);
  assert.equal(logs[0].cnt, 1, 'Log count must remain strictly 1');
});

test('Permits with >60 days remaining, already expired, or retired businesses are ignored', async () => {
  const permitNo = 'BP-2026-EXP01';
  const { rows: [biz] } = await db.query(`SELECT business_id FROM businesses WHERE business_name = 'Liliw Footwear Craft'`);

  // 1. Evaluated in July 2026 (>60 days before Dec 31) -> 0 rows
  const july1 = '2026-07-01T00:00:00Z';
  const { rows: julyRows } = await db.query(`SELECT * FROM public.get_expiring_permits($1) WHERE permit_no = $2`, [july1, permitNo]);
  assert.equal(julyRows.length, 0, 'Permit with >60 days left should not be flagged');

  // 2. Evaluated in 2027 (already expired) -> 0 rows
  const jan2027 = '2027-01-05T00:00:00Z';
  const { rows: janRows } = await db.query(`SELECT * FROM public.get_expiring_permits($1) WHERE permit_no = $2`, [jan2027, permitNo]);
  assert.equal(janRows.length, 0, 'Expired permit should not be flagged by expiry monitor');

  // 3. If business is marked retired -> 0 rows even within 15-day window
  await db.query(`UPDATE businesses SET is_retired = true WHERE business_id = $1`, [biz.business_id]);
  const dec20 = '2026-12-20T08:00:00Z';
  const { rows: retiredRows } = await db.query(`SELECT * FROM public.get_expiring_permits($1) WHERE permit_no = $2`, [dec20, permitNo]);
  assert.equal(retiredRows.length, 0, 'Retired business permits must be excluded from expiry warnings');
});
