const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const applicant = '11111111-1111-4111-8111-111111111111';
const mho = '22222222-2222-4222-8222-222222222222';
const bfb = '33333333-3333-4333-8333-333333333333';
const amilyar = '44444444-4444-4444-8444-444444444444';
const bplo = '55555555-5555-4555-8555-555555555555';
const sql = file => readFileSync(path.join(__dirname, '../supabase/migrations', file), 'utf8');
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
    CREATE TABLE taxpayers (taxpayer_id UUID PRIMARY KEY, user_id UUID UNIQUE REFERENCES users(user_id));
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.auth_taxpayer_id() RETURNS uuid LANGUAGE sql AS $$ SELECT auth.uid() $$;
    CREATE FUNCTION public.auth_user_role() RETURNS text LANGUAGE sql AS $$ SELECT 'Applicant'::text $$;
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now();RETURN NEW;END $$;
  `);
  for (const name of ['001_roles.sql','004_businesses.sql','005_applications.sql','006_verifications.sql','008_treasury.sql']) await db.exec(sql(name));
  await db.exec(sql('010_permits.sql').split('CREATE TABLE IF NOT EXISTS public.permits (')[0]);
  for (const name of ['011_audit_logs.sql','012_email_notifications.sql','015_design_gaps_fix.sql','016_align_doc_status.sql',
    '018_doc_verifications_file_path.sql','030_barangays_lookup.sql','032_add_fixed_amount_to_fees.sql',
    '034_requirements_revision.sql','035_requirements_revision_updates.sql','036_fee_schedule.sql','038_activity_metric_count.sql',
    '040_notifications.sql','043_location_mismatch.sql','044_location_zones_and_centroids.sql','045_applicant_fields_and_tenancy.sql',
    '046_applicant_submission_permissions.sql','047_automatic_assessment.sql','048_payment_proof_schema.sql',
    '049_multi_branch_and_bin_schema.sql']) await db.exec(sql(name));
  await db.exec(`INSERT INTO users(user_id,role_id,email)
      SELECT '${applicant}'::uuid,role_id,'applicant@example.test' FROM roles WHERE role_name='Applicant'
      UNION ALL SELECT '${bplo}'::uuid,role_id,'bplo@example.test' FROM roles WHERE role_name='BPLO_Officer';
    INSERT INTO taxpayers VALUES ('${applicant}','${applicant}');`);
  await insertApplication('APP-EXISTING');
  await db.exec(sql('050_regulatory_roles_and_clearances.sql'));
  for (const [id, role] of [[mho,'MHO_Officer'],[bfb,'BFB_Officer'],[amilyar,'Amilyar_Officer']]) {
    await db.query('INSERT INTO users(user_id,role_id,email) SELECT $1,role_id,$2 FROM roles WHERE role_name=$3',[id,`${role}@example.test`,role]);
  }
});
after(async () => { await db?.close(); });

async function insertApplication(appNo, documentStatus = 'Pending') {
  await db.transaction(async tx => {
    const { rows: [business] } = await tx.query("INSERT INTO businesses(taxpayer_id,business_name,org_type_id,barangay) VALUES ($1,'Sample',1,'Bayate') RETURNING business_id",[applicant]);
    await tx.query("INSERT INTO applications(application_no,business_id,type_id,status) VALUES ($1,$2,1,'Pending')",[appNo,business.business_id]);
    await tx.query(`INSERT INTO doc_verifications(application_no,requirement_id,file_path,status)
      SELECT $1,id,'sample/document.pdf',$2 FROM requirement_types WHERE name IN ('Sanitary Permit','Fire Safety Inspection Certificate','Realty Tax (OR-Amilyar)')`,[appNo,documentStatus]);
    await tx.query('INSERT INTO application_activities(application_no,activity_id,capitalization) VALUES ($1,1,50000)',[appNo]);
    for (const section of ['business_details','location','business_activities','financial_declaration']) {
      await tx.query('INSERT INTO application_data_reviews(application_no,section,status) VALUES ($1,$2,$3)',[appNo,section,'Verified']);
    }
  });
}

async function statuses(appNo) {
  const { rows } = await db.query('SELECT agency_code,status FROM regulatory_clearances WHERE application_no=$1 ORDER BY agency_code',[appNo]);
  return Object.fromEntries(rows.map(row => [row.agency_code,row.status]));
}

async function decide(appNo, agency, officer, status, remarks = null) {
  return (await db.query('SELECT review_regulatory_clearance($1,$2,$3,$4,$5) AS clearance',[appNo,agency,officer,status,remarks])).rows[0].clearance;
}

test('050 backfills open applications and routes new submissions once their upload rows exist', async () => {
  await insertApplication('APP-NEW');
  for (const appNo of ['APP-EXISTING','APP-NEW']) {
    assert.deepEqual(await statuses(appNo), { MHO:'Pending', BFB:'Pending', AMILYAR:'Pending' });
  }
  await db.query("UPDATE applications SET status='Under Review' WHERE application_no='APP-NEW'");
  assert.deepEqual(await statuses('APP-NEW'), { MHO:'Pending', BFB:'Pending', AMILYAR:'Pending' });
  const { rows: [permissions] } = await db.query(`SELECT
    has_table_privilege('authenticated','public.regulatory_clearances','UPDATE') AS client_write,
    has_function_privilege('authenticated','public.review_regulatory_clearance(varchar,text,uuid,text,text)','EXECUTE') AS client_review`);
  assert.deepEqual(permissions, { client_write:false, client_review:false });
});

test('only the assigned agency can act and the approval gate holds inside the assessment transaction', async () => {
  const appNo = 'APP-SIGNOFF';
  await insertApplication(appNo, 'Verified');
  await assert.rejects(decide(appNo,'MHO',bfb,'Verified'), { code:'42501' });
  await assert.rejects(db.query(`UPDATE doc_verifications SET status='Not Needed' WHERE application_no=$1`,[appNo]), { code:'42501' });
  const health = await decide(appNo,'MHO',mho,'Verified');
  assert.equal(health.verified_by,mho);
  assert.ok(health.verified_at);
  assert.deepEqual(await statuses(appNo), { MHO:'Verified', BFB:'Pending', AMILYAR:'Pending' });
  await assert.rejects(db.query("UPDATE applications SET status='Assessed' WHERE application_no=$1",[appNo]), { code:'22023' });
  const calculate = async () => {
    const { rows:[{ source }] } = await db.query('SELECT get_assessment_inputs($1) AS source',[appNo]);
    return JSON.stringify(require('../src/utils/assessment-engine').computeAssessment(source));
  };
  await assert.rejects(db.query('SELECT approve_and_assess_application($1,$2,$3::jsonb,$4)',[appNo,bplo,await calculate(),null]), { code:'22023' });
  assert.equal((await db.query('SELECT 1 FROM assessments WHERE application_no=$1',[appNo])).rows.length,0);
  await decide(appNo,'BFB',bfb,'Verified');
  await decide(appNo,'AMILYAR',amilyar,'Verified');
  const { rows:[{ result }] } = await db.query('SELECT approve_and_assess_application($1,$2,$3::jsonb,$4) AS result',[appNo,bplo,await calculate(),null]);
  assert.equal(result.status,'Assessed');
});

test('an agency return records remarks and notifies the applicant once, and resubmission requires fresh checks', async () => {
  const appNo = 'APP-FIX';
  await insertApplication(appNo);
  await decide(appNo,'MHO',mho,'Verified');
  await assert.rejects(decide(appNo,'BFB',bfb,'Returned',' '), { code:'22023' });
  const returned = await decide(appNo,'BFB',bfb,'Returned','Upload the updated fire certificate.');
  assert.equal(returned.verified_by,bfb);
  assert.equal((await decide(appNo,'BFB',bfb,'Returned','Retry')).remarks,returned.remarks);
  const { rows: [app] } = await db.query('SELECT status,return_remarks FROM applications WHERE application_no=$1',[appNo]);
  assert.deepEqual(app,{ status:'Returned',return_remarks:'BFB: Upload the updated fire certificate.' });
  const { rows: notifications } = await db.query('SELECT message FROM notifications WHERE application_no=$1',[appNo]);
  assert.equal(notifications.length,1);
  assert.match(notifications[0].message,/updated fire certificate/);
  const { rows: documents } = await db.query('SELECT requirement_id,file_path FROM doc_verifications WHERE application_no=$1',[appNo]);
  await db.query('SELECT submit_applicant_application($1,$2::jsonb)',[applicant,JSON.stringify({
    application_no: appNo, business_name:'Sample', type_id:1, org_type_id:1, address_line1:'Test Street',
    barangay:'Bayate', tenancy_type:'Owned Commercial', activities:[{activity_id:1,capitalization:50000}], documents,
  })]);
  assert.deepEqual(await statuses(appNo), { MHO:'Pending', BFB:'Pending', AMILYAR:'Pending' });
  assert.equal((await db.query('SELECT 1 FROM application_data_reviews WHERE application_no=$1',[appNo])).rows.length,0);
});
