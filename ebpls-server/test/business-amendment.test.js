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
    '053_business_amendments.sql'
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

test('053 sets up business_amendments table and registers Amendment application type', async () => {
  const { rows: types } = await db.query(`SELECT id, name FROM application_types WHERE name = 'Amendment'`);
  assert.equal(types.length, 1);
  assert.equal(types[0].name, 'Amendment');

  const { rows: tableCheck } = await db.query(`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'business_amendments'
  `);
  assert.equal(tableCheck.length, 1, 'business_amendments table must exist');
});

test('Address Amendment submission records old vs new address, creates application and links clearances', async () => {
  // 1. Setup active business and branch for Elena Reyes
  const { rows: [biz] } = await db.query(`
    INSERT INTO businesses (taxpayer_id, business_name, trade_name, org_type_id, address_line1, barangay, tenancy_type, dti_sec_cda_reg_no)
    VALUES ($1, 'Reyes Footwear & Leather', 'Reyes Shoes', 1, '120 J. Rizal St', 'Rizal (Poblacion)', 'Owned Commercial', 'DTI-2026-88899')
    RETURNING business_id, bin
  `, [taxpayerUser]);

  const { rows: [branch] } = await db.query(`
    SELECT branch_id, branch_name, address_line1, barangay, tenancy_type
    FROM business_branches WHERE business_id = $1 AND is_main = true
  `, [biz.business_id]);

  assert.ok(branch, 'Main branch should exist from backfill trigger');

  // Initial application & permit
  const initialAppNo = 'APP-2026-00088';
  await db.query(`
    INSERT INTO applications (application_no, business_id, type_id, status)
    VALUES ($1, $2, 1, 'Completed')
  `, [initialAppNo, biz.business_id]);
  await db.query(`
    INSERT INTO application_activities (application_no, activity_id, capitalization, gross_sales_prev_year, branch_id)
    VALUES ($1, 1, 100000, 0, $2)
  `, [initialAppNo, branch.branch_id]);
  await db.query(`
    INSERT INTO permits (application_no, permit_no, expires_at, issued_by)
    VALUES ($1, 'BP-2026-00088', '2026-12-31 23:59:59+08', $2)
  `, [initialAppNo, officerUser]);

  // 2. Submit Address Amendment via RPC
  const amendmentPayload = {
    business_id: biz.business_id,
    branch_id: branch.branch_id,
    new_address_line1: '400 Gat Tayaw Commercial Strip, Unit 2B',
    new_barangay: 'Bayate',
    new_tenancy_type: 'Rented',
    new_stall_unit_numbers: ['Stall 2B'],
    documents: [
      { requirement_id: 1, file_path: `${taxpayerUser}/brgy_bayate.pdf`, file_name: 'brgy_bayate.pdf', file_size: 1024 },
      { requirement_id: 2, file_path: `${taxpayerUser}/fire_cert.pdf`, file_name: 'fire_cert.pdf', file_size: 2048 }
    ]
  };

  const { rows: [{ submit_address_amendment: appNo }] } = await db.query(`
    SELECT submit_address_amendment($1, $2::jsonb)
  `, [taxpayerUser, JSON.stringify(amendmentPayload)]);

  assert.ok(appNo.startsWith('APP-'), 'Generated application number expected');

  // 3. Verify applications row
  const { rows: [appRow] } = await db.query(`
    SELECT * FROM applications WHERE application_no = $1
  `, [appNo]);
  assert.equal(appRow.business_id, biz.business_id, 'Must link to original business (Zero Duplicate BIN)');
  assert.equal(appRow.status, 'Pending');

  // 4. Verify business_amendments row
  const { rows: [amendRow] } = await db.query(`
    SELECT * FROM business_amendments WHERE application_no = $1
  `, [appNo]);
  assert.ok(amendRow);
  assert.equal(amendRow.amendment_type, 'Change of Address');
  assert.equal(amendRow.status, 'Pending');
  assert.equal(amendRow.old_data.barangay, 'Rizal (Poblacion)');
  assert.equal(amendRow.new_data.barangay, 'Bayate');
  assert.equal(amendRow.new_data.tenancy_type, 'Rented');

  // 5. Verify Zero Duplicate Businesses
  const { rows: bizCount } = await db.query(`
    SELECT count(*)::int as count FROM businesses WHERE business_id = $1
  `, [biz.business_id]);
  assert.equal(bizCount[0].count, 1, 'Businesses table must retain strictly 1 row per legal entity');

  // 6. Verify regulatory clearances seeded
  const { rows: clearances } = await db.query(`
    SELECT agency_code, status FROM regulatory_clearances WHERE application_no = $1
  `, [appNo]);
  assert.ok(clearances.length >= 1, 'Clearances should be initialized');
});

test('Prevent duplicate pending amendments for the same branch', async () => {
  const { rows: [biz] } = await db.query(`
    SELECT business_id FROM businesses WHERE business_name = 'Reyes Footwear & Leather'
  `);
  const { rows: [branch] } = await db.query(`
    SELECT branch_id FROM business_branches WHERE business_id = $1 AND is_main = true
  `, [biz.business_id]);

  const duplicatePayload = {
    business_id: biz.business_id,
    branch_id: branch.branch_id,
    new_address_line1: '999 Another Rd',
    new_barangay: 'Mojon',
    new_tenancy_type: 'Owned Commercial',
    documents: []
  };

  await assert.rejects(
    async () => {
      await db.query(`SELECT submit_address_amendment($1, $2::jsonb)`, [taxpayerUser, JSON.stringify(duplicatePayload)]);
    },
    (err) => {
      assert.match(err.message, /already pending review/i);
      return true;
    }
  );
});

test('BPLO approval updates branch master record and completes application', async () => {
  const { rows: [pendingAmend] } = await db.query(`
    SELECT application_no, branch_id, business_id FROM business_amendments WHERE status = 'Pending' LIMIT 1
  `);
  assert.ok(pendingAmend);

  // Mark all clearances as Verified so BPLO can approve
  await db.query(`
    UPDATE regulatory_clearances SET status = 'Verified' WHERE application_no = $1
  `, [pendingAmend.application_no]);

  // Execute approval RPC
  const { rows: [{ approve_address_amendment: result }] } = await db.query(`
    SELECT approve_address_amendment($1, $2, 'Relocation premises verified and approved by BPLO')
  `, [pendingAmend.application_no, officerUser]);

  assert.equal(result.status, 'Approved');

  // Verify branch master record was updated
  const { rows: [updatedBranch] } = await db.query(`
    SELECT address_line1, barangay, tenancy_type FROM business_branches WHERE branch_id = $1
  `, [pendingAmend.branch_id]);
  assert.equal(updatedBranch.barangay, 'Bayate');
  assert.equal(updatedBranch.address_line1, '400 Gat Tayaw Commercial Strip, Unit 2B');
  assert.equal(updatedBranch.tenancy_type, 'Rented');

  // Main branch also updates businesses header
  const { rows: [updatedBiz] } = await db.query(`
    SELECT address_line1, barangay, tenancy_type FROM businesses WHERE business_id = $1
  `, [pendingAmend.business_id]);
  assert.equal(updatedBiz.barangay, 'Bayate');
  assert.equal(updatedBiz.address_line1, '400 Gat Tayaw Commercial Strip, Unit 2B');

  // Verify application marked Completed
  const { rows: [app] } = await db.query(`
    SELECT status FROM applications WHERE application_no = $1
  `, [pendingAmend.application_no]);
  assert.equal(app.status, 'Completed');

  // Verify amendment marked Approved
  const { rows: [amend] } = await db.query(`
    SELECT status, review_remarks FROM business_amendments WHERE application_no = $1
  `, [pendingAmend.application_no]);
  assert.equal(amend.status, 'Approved');
  assert.match(amend.review_remarks, /verified and approved/i);
});

test('BPLO rejection marks amendment as Rejected and application as Returned', async () => {
  const { rows: [biz] } = await db.query(`
    SELECT business_id FROM businesses WHERE business_name = 'Reyes Footwear & Leather'
  `);
  const { rows: [branch] } = await db.query(`
    SELECT branch_id FROM business_branches WHERE business_id = $1 AND is_main = true
  `, [biz.business_id]);

  // Submit another amendment now that the previous one is approved
  const payload = {
    business_id: biz.business_id,
    branch_id: branch.branch_id,
    new_address_line1: 'Invalid Location 123',
    new_barangay: 'Daniw',
    new_tenancy_type: 'Owned Commercial',
    documents: []
  };

  const { rows: [{ submit_address_amendment: appNo }] } = await db.query(`
    SELECT submit_address_amendment($1, $2::jsonb)
  `, [taxpayerUser, JSON.stringify(payload)]);

  // Officer rejects with remarks
  const { rows: [{ reject_address_amendment: rejectResult }] } = await db.query(`
    SELECT reject_address_amendment($1, $2, 'Missing updated locational zoning clearance')
  `, [appNo, officerUser]);

  assert.equal(rejectResult.status, 'Rejected');

  const { rows: [amend] } = await db.query(`
    SELECT status, review_remarks FROM business_amendments WHERE application_no = $1
  `, [appNo]);
  assert.equal(amend.status, 'Rejected');
  assert.equal(amend.review_remarks, 'Missing updated locational zoning clearance');

  const { rows: [app] } = await db.query(`
    SELECT status FROM applications WHERE application_no = $1
  `, [appNo]);
  assert.equal(app.status, 'Returned');
});

test('Reject relocation to an inactive or non-existent barangay', async () => {
  const { rows: [biz] } = await db.query(`
    SELECT business_id FROM businesses WHERE business_name = 'Reyes Footwear & Leather'
  `);
  const { rows: [branch] } = await db.query(`
    SELECT branch_id FROM business_branches WHERE business_id = $1 AND is_main = true
  `, [biz.business_id]);

  const invalidBgyPayload = {
    business_id: biz.business_id,
    branch_id: branch.branch_id,
    new_address_line1: '50 Makati Ave',
    new_barangay: 'Makati CBD (Not Liliw)',
    new_tenancy_type: 'Rented',
    documents: []
  };

  await assert.rejects(
    async () => {
      await db.query(`SELECT submit_address_amendment($1, $2::jsonb)`, [taxpayerUser, JSON.stringify(invalidBgyPayload)]);
    },
    (err) => {
      assert.match(err.message, /not active in the Municipality of Liliw/i);
      return true;
    }
  );
});

