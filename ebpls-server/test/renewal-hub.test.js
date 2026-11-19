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
    '051_atomic_payment_verification.sql', '052_renewal_hub_and_selective_renewal.sql'
  ];

  for (const name of migrations) {
    await db.exec(readFileSync(join(__dirname, '../supabase/migrations', name), 'utf8'));
  }

  await db.query(`INSERT INTO users(user_id, role_id, email) SELECT $1, role_id, 'taxpayer@example.test' FROM roles WHERE role_name='Applicant'`, [taxpayerUser]);
  await db.query(`INSERT INTO users(user_id, role_id, email) SELECT $1, role_id, 'other@example.test' FROM roles WHERE role_name='Applicant'`, [otherUser]);
  await db.query(`INSERT INTO users(user_id, role_id, email) SELECT $1, role_id, 'officer@example.test' FROM roles WHERE role_name='BPLO_Officer'`, [officerUser]);
  await db.query(`INSERT INTO taxpayers VALUES ($1, $1, 'Maria', 'Santos')`, [taxpayerUser]);
  await db.query(`INSERT INTO taxpayers VALUES ($1, $1, 'Juan', 'Dela Cruz')`, [otherUser]);
});

after(async () => {
  await db?.close();
});

test('Approved businesses hub returns active businesses with BIN, permit info, and registered branches', async () => {
  // 1. Create a business with main branch and secondary branch for taxpayerUser
  const { rows: [biz] } = await db.query(`
    INSERT INTO businesses (taxpayer_id, business_name, trade_name, org_type_id, address_line1, barangay, tenancy_type)
    VALUES ($1, 'Santos Bakery & Cafe', 'Santos Bakes', 1, '10 Rizal St', 'Rizal (Poblacion)', 'Owned Commercial')
    RETURNING business_id, bin
  `, [taxpayerUser]);

  assert.ok(biz.bin.startsWith('BIN-'), 'BIN should be generated');

  // Insert a secondary branch
  const { rows: [branch2] } = await db.query(`
    INSERT INTO business_branches (business_id, branch_key, branch_name, address_line1, barangay, tenancy_type, is_main, is_active)
    VALUES ($1, 'branch-2', 'Bayate Outlet', '45 Bayate Rd', 'Bayate', 'Rented', false, true)
    RETURNING branch_id
  `, [biz.business_id]);

  // Insert initial application & issued permit
  const appNo = 'APP-2026-00010';
  await db.query(`
    INSERT INTO applications (application_no, business_id, type_id, status)
    VALUES ($1, $2, 1, 'Completed')
  `, [appNo, biz.business_id]);

  // Link activities
  await db.query(`
    INSERT INTO application_activities (application_no, activity_id, capitalization, gross_sales_prev_year)
    VALUES ($1, 1, 50000, 0)
  `, [appNo]);

  // Issue permit
  await db.query(`
    INSERT INTO permits (application_no, permit_no, expires_at, issued_by)
    VALUES ($1, 'BP-2026-00010', '2026-12-31 23:59:59+08', $2)
  `, [appNo, officerUser]);

  // 2. Query approved businesses via RPC
  const { rows: [{ get_taxpayer_approved_businesses: approvedList }] } = await db.query(`
    SELECT get_taxpayer_approved_businesses($1)
  `, [taxpayerUser]);

  assert.equal(approvedList.length, 1);
  const found = approvedList[0];
  assert.equal(found.business_name, 'Santos Bakery & Cafe');
  assert.equal(found.bin, biz.bin);
  assert.equal(found.permit_no, 'BP-2026-00010');
  assert.equal(found.is_expired, false);
  assert.ok(found.days_until_expiry >= 0);
  assert.equal(found.has_pending_renewal, false);
  assert.equal(found.branches.length, 2, 'Both registered branches should be returned');
});

test('Selective multi-branch renewal creates renewal application without creating duplicate business', async () => {
  // Fetch existing business
  const { rows: [biz] } = await db.query(`
    SELECT business_id, bin FROM businesses WHERE business_name = 'Santos Bakery & Cafe'
  `);
  const { rows: branches } = await db.query(`
    SELECT branch_id, branch_key, branch_name, address_line1, barangay, tenancy_type, is_main
    FROM business_branches WHERE business_id = $1 ORDER BY is_main DESC
  `, [biz.business_id]);

  assert.equal(branches.length, 2);
  const mainBranch = branches[0];
  const branch2 = branches[1];

  // Selective renewal payload: Renew Main branch only, exclude branch 2
  const renewalPayload = {
    business_id: biz.business_id,
    selected_branch_ids: [mainBranch.branch_id],
    unselected_branch_ids: [branch2.branch_id],
    branches: [
      {
        branch_id: mainBranch.branch_id,
        branch_key: mainBranch.branch_key,
        branch_name: mainBranch.branch_name,
        address_line1: mainBranch.address_line1,
        barangay: mainBranch.barangay,
        tenancy_type: mainBranch.tenancy_type,
        stall_unit_numbers: [],
        is_main: true,
        activities: [
          {
            activity_id: 1,
            gross_sales_prev_year: 450000.00,
            capitalization: 50000,
            metric_count: null,
          }
        ]
      }
    ],
    documents: [
      {
        requirement_id: 1, // Standard document
        file_path: `${taxpayerUser}/permit-2026.pdf`,
        branch_key: null,
      }
    ]
  };

  const { rows: [{ submit_renewal_application: renewalAppNo }] } = await db.query(`
    SELECT submit_renewal_application($1, $2::jsonb)
  `, [taxpayerUser, JSON.stringify(renewalPayload)]);

  assert.ok(renewalAppNo.startsWith('APP-'), 'Renewal application number should be generated');

  // Verify that NO new business row was created (Zero Duplicate BIN Policy)
  const { rows: [bizCount] } = await db.query(`
    SELECT count(*)::integer AS total FROM businesses WHERE bin = $1
  `, [biz.bin]);
  assert.equal(bizCount.total, 1, 'Only one row in businesses table for this BIN');

  // Verify application properties
  const { rows: [renApp] } = await db.query(`
    SELECT application_no, business_id, type_id, status FROM applications WHERE application_no = $1
  `, [renewalAppNo]);
  assert.equal(renApp.business_id, biz.business_id);
  assert.equal(renApp.type_id, 2, 'Type ID must be 2 (Renewal)');
  assert.equal(renApp.status, 'Pending');

  // Verify unselected branch is marked inactive
  const { rows: [b2Status] } = await db.query(`
    SELECT is_active FROM business_branches WHERE branch_id = $1
  `, [branch2.branch_id]);
  assert.equal(b2Status.is_active, false, 'Unrenewed branch must be flagged inactive');

  // Verify declared activities are recorded with gross sales
  const { rows: activities } = await db.query(`
    SELECT activity_id, branch_id, gross_sales_prev_year
    FROM application_activities WHERE application_no = $1
  `, [renewalAppNo]);
  assert.equal(activities.length, 1);
  assert.equal(Number(activities[0].gross_sales_prev_year), 450000.00);

  // Verify approved businesses hub now reports pending renewal in flight
  const { rows: [{ get_taxpayer_approved_businesses: updatedList }] } = await db.query(`
    SELECT get_taxpayer_approved_businesses($1)
  `, [taxpayerUser]);
  assert.equal(updatedList[0].has_pending_renewal, true);
  assert.equal(updatedList[0].pending_renewal_app_no, renewalAppNo);
});

test('Prevent double renewals while a renewal application is already in progress', async () => {
  const { rows: [biz] } = await db.query(`
    SELECT business_id FROM businesses WHERE business_name = 'Santos Bakery & Cafe'
  `);

  const duplicatePayload = {
    business_id: biz.business_id,
    branches: [
      {
        branch_name: 'Main branch',
        address_line1: '10 Rizal St',
        barangay: 'Rizal (Poblacion)',
        tenancy_type: 'Owned Commercial',
        activities: [{ activity_id: 1, gross_sales_prev_year: 100000 }]
      }
    ]
  };

  await assert.rejects(
    async () => {
      await db.query(`SELECT submit_renewal_application($1, $2::jsonb)`, [taxpayerUser, JSON.stringify(duplicatePayload)]);
    },
    (err) => {
      assert.match(err.message, /already in progress/);
      return true;
    }
  );
});

test('Reject renewal if business is not owned by caller or is retired', async () => {
  const { rows: [biz] } = await db.query(`
    SELECT business_id FROM businesses WHERE business_name = 'Santos Bakery & Cafe'
  `);

  const payload = {
    business_id: biz.business_id,
    branches: [
      {
        branch_name: 'Main branch',
        address_line1: '10 Rizal St',
        barangay: 'Rizal (Poblacion)',
        tenancy_type: 'Owned Commercial',
        activities: [{ activity_id: 1, gross_sales_prev_year: 100000 }]
      }
    ]
  };

  // Other user attempts to renew Santos Bakery
  await assert.rejects(
    async () => {
      await db.query(`SELECT submit_renewal_application($1, $2::jsonb)`, [otherUser, JSON.stringify(payload)]);
    },
    (err) => {
      assert.match(err.message, /Business not found or not owned by taxpayer/);
      return true;
    }
  );

  // Mark business as retired
  await db.query(`UPDATE businesses SET is_retired = true WHERE business_id = $1`, [biz.business_id]);

  await assert.rejects(
    async () => {
      await db.query(`SELECT submit_renewal_application($1, $2::jsonb)`, [taxpayerUser, JSON.stringify(payload)]);
    },
    (err) => {
      assert.match(err.message, /Cannot renew a retired business/);
      return true;
    }
  );

  // Restore active status
  await db.query(`UPDATE businesses SET is_retired = false WHERE business_id = $1`, [biz.business_id]);
});
