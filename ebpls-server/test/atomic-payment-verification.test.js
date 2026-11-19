const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const applicant = '11111111-1111-4111-8111-111111111111';
const cashier = '22222222-2222-4222-8222-222222222222';
const otherApplicant = '33333333-3333-4333-8333-333333333333';
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
  `);
  const migrations = [
    '001_roles.sql', '004_businesses.sql', '005_applications.sql', '008_treasury.sql', '010_permits.sql',
    '011_audit_logs.sql', '012_email_notifications.sql', '021_make_or_nullable.sql',
    '022_fix_paid_at_nullable.sql', '040_notifications.sql', '048_payment_proof_schema.sql',
    '051_atomic_payment_verification.sql',
  ];
  for (const name of migrations) await db.exec(readFileSync(join(__dirname, '../supabase/migrations', name), 'utf8'));
  await db.exec("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'PaymentProcessing'");
  await db.query(`INSERT INTO users(user_id,role_id,email) SELECT $1,role_id,'applicant@example.test' FROM roles WHERE role_name='Applicant'`, [applicant]);
  await db.query(`INSERT INTO users(user_id,role_id,email) SELECT $1,role_id,'cashier@example.test' FROM roles WHERE role_name='Treasury_Officer'`, [cashier]);
  await db.query(`INSERT INTO users(user_id,role_id,email) SELECT $1,role_id,'other@example.test' FROM roles WHERE role_name='Applicant'`, [otherApplicant]);
  await db.query("INSERT INTO taxpayers VALUES ($1,$1,'Sample','Taxpayer')", [applicant]);
});

after(async () => { await db?.close(); });

async function createBill(appNo) {
  const { rows: [business] } = await db.query("INSERT INTO businesses(taxpayer_id,business_name,org_type_id,barangay) VALUES ($1,'Sample Shop',1,'Bayate') RETURNING business_id", [applicant]);
  await db.query("INSERT INTO applications(application_no,business_id,type_id,status) VALUES ($1,$2,1,'For Payment')", [appNo, business.business_id]);
  await db.query('INSERT INTO application_activities(application_no,activity_id,capitalization) VALUES ($1,1,50000)', [appNo]);
  await db.query('INSERT INTO assessments(application_no,total_amount,assessed_by) VALUES ($1,1250,$2)', [appNo, cashier]);
}

async function submit(appNo, suffix = 'original', actor = applicant) {
  const { rows: [{ result }] } = await db.query(
    'SELECT submit_online_payment_proof($1,$2,$3,$4,$5,$6) AS result',
    [appNo, actor, 'GCash', `REF-${suffix}`, '2026-11-19', `${applicant}/${appNo}-${suffix}.png`],
  );
  return result;
}

async function decide(proof, decision = 'Verified', reason = null, actor = cashier) {
  const { rows: [{ result }] } = await db.query(
    'SELECT decide_online_payment_proof($1,$2,$3,$4,$5) AS result',
    [proof.transaction_id, actor, decision, reason, proof.proof_revision],
  );
  return result;
}

async function paymentState(appNo) {
  const { rows: [row] } = await db.query(`SELECT a.status, t.verification_status, t.or_number, p.permit_no
    FROM applications a JOIN assessments s USING(application_no) JOIN transactions t ON t.assessment_id=s.id
    LEFT JOIN permits p ON p.application_no=a.application_no WHERE a.application_no=$1`, [appNo]);
  return row;
}

test('verification issues sequential receipts and a permit, with one audit and notification on retries', async () => {
  await createBill('APP-PAID-ONE');
  await createBill('APP-PAID-TWO');
  const first = await submit('APP-PAID-ONE');
  assert.equal((await submit('APP-PAID-ONE')).transaction_id, first.transaction_id);
  await assert.rejects(submit('APP-PAID-ONE', 'replacement'), { code: '22023' });
  await assert.rejects(decide(first, 'Verified', null, applicant), { code: '42501' });
  const confirmed = await decide(first);
  const second = await decide(await submit('APP-PAID-TWO'));
  assert.match(confirmed.or_number, /^OR-\d{4}-000001$/);
  assert.equal(second.or_number, confirmed.or_number.replace(/000001$/, '000002'));
  assert.equal((await decide(first)).already_decided, true);
  assert.deepEqual(await paymentState('APP-PAID-ONE'), {
    status: 'Completed', verification_status: 'Verified', or_number: confirmed.or_number, permit_no: confirmed.permit.permit_no,
  });
  const { rows: [summary] } = await db.query(`SELECT
    (SELECT count(*)::int FROM audit_logs WHERE entity_id=$1 AND action='PAYMENT_PROOF_SUBMITTED') AS submits,
    (SELECT count(*)::int FROM audit_logs WHERE entity_id=$1 AND action='PAYMENT_PROOF_VERIFIED') AS decisions,
    (SELECT count(*)::int FROM notifications WHERE application_no=$2 AND type='PAYMENT_CONFIRMED') AS notifications,
    (SELECT count(*)::int FROM permit_line_items WHERE permit_id=$3) AS activity_lines`,
  [first.transaction_id, 'APP-PAID-ONE', confirmed.permit.id]);
  assert.deepEqual(summary, { submits: 1, decisions: 1, notifications: 1, activity_lines: 1 });
});

test('rejection returns the applicant to payment and protects a replacement from stale reviews', async () => {
  const appNo = 'APP-RETRY';
  await createBill(appNo);
  await assert.rejects(submit(appNo, 'wrong-owner', otherApplicant), { code: '42501' });
  const original = await submit(appNo);
  await assert.rejects(decide(original, 'Rejected', ' '), { code: '22023' });
  const reason = 'Upload a receipt showing the payment reference.';
  assert.equal((await decide(original, 'Rejected', reason)).transaction.rejection_reason, reason);
  assert.equal((await decide(original, 'Rejected', reason)).already_decided, true);
  assert.deepEqual(await paymentState(appNo), {
    status: 'For Payment', verification_status: 'Rejected', or_number: null, permit_no: null,
  });
  assert.deepEqual((await db.query('SELECT message FROM notifications WHERE application_no=$1', [appNo])).rows, [{ message: reason }]);
  const replacement = await submit(appNo, 'replacement');
  assert.equal(replacement.proof_revision, original.proof_revision + 1);
  await assert.rejects(decide(original), { code: '22023' });
  assert.equal((await decide(replacement)).transaction.verification_status, 'Verified');
});

test('failure in the decision logs rolls back the receipt, permit, and applicant notification', async () => {
  const appNo = 'APP-ROLLBACK';
  await createBill(appNo);
  const proof = await submit(appNo);
  await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT simulated_audit_failure CHECK (action <> 'PAYMENT_PROOF_VERIFIED') NOT VALID");
  try {
    await assert.rejects(decide(proof), { code: '23514' });
    assert.deepEqual(await paymentState(appNo), {
      status: 'PaymentVerificationPending', verification_status: 'Pending', or_number: null, permit_no: null,
    });
    assert.deepEqual((await db.query('SELECT message FROM notifications WHERE application_no=$1', [appNo])).rows, []);
  } finally {
    await db.exec('ALTER TABLE audit_logs DROP CONSTRAINT simulated_audit_failure');
  }
});
