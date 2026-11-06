const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { PGlite } = require('@electric-sql/pglite');
const { UAFSubmissionPayloadSchema, DraftPayloadSchema } = require('../src/utils/validators');
const migration = name => fs.readFileSync(path.join(__dirname, '../supabase/migrations', name), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
let db, formUtils, uploadUtils, legacyBusiness;

before(async () => {
  formUtils = await import(pathToFileURL(path.join(__dirname, '../../ebpls-frontend/src/utils/uafForm.js')));
  uploadUtils = await import(pathToFileURL(path.join(__dirname, '../../ebpls-frontend/src/utils/uploadValidation.js')));
  db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE users(user_id UUID PRIMARY KEY);
    CREATE TABLE taxpayers(taxpayer_id UUID PRIMARY KEY);
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    INSERT INTO taxpayers VALUES ('${owner}'), ('${other}');`);
  for (const name of ['004_businesses.sql', '005_applications.sql', '006_verifications.sql']) await db.exec(migration(name));
  await db.exec(migration('010_permits.sql').split('CREATE TABLE IF NOT EXISTS public.permits (')[0]);
  for (const name of ['018_doc_verifications_file_path.sql', '030_barangays_lookup.sql', '034_requirements_revision.sql', '035_requirements_revision_updates.sql', '038_activity_metric_count.sql', '043_location_mismatch.sql', '044_location_zones_and_centroids.sql']) await db.exec(migration(name));
  const inserted = await db.query("INSERT INTO businesses(taxpayer_id,business_name,org_type_id,is_renting) VALUES ($1,'Legacy rented business',1,true) RETURNING business_id", [owner]);
  legacyBusiness = inserted.rows[0].business_id;
  await db.exec(migration('045_applicant_fields_and_tenancy.sql'));
  // Reproduce Supabase's default function grants before the follow-up fix.
  await db.exec('GRANT EXECUTE ON FUNCTION public.submit_applicant_application(UUID,JSONB) TO anon,authenticated');
  await db.exec(migration('046_applicant_submission_permissions.sql'));
});
after(async () => { await db?.close(); });

async function requirement(name) { return (await db.query('SELECT id FROM requirement_types WHERE name=$1', [name])).rows[0].id; }
async function payload(tenancy = 'Rented') {
  const property = { Rented: 'Contract of Lease', 'Owned Commercial': 'Building Permit', 'Owned Residential': 'Zoning Clearance' }[tenancy];
  return { business_name: 'Phase 2 test business', org_type_id: 1, type_id: 1, tenancy_type: tenancy,
    address_line1: 'Test street', barangay: 'Bayate', city: 'Wrong city', province: 'Wrong province', latitude: 0, longitude: 0,
    stall_unit_numbers: ['12', '13', '14'], activities: [{activity_id: 1, capitalization: 20000, gross_sales_prev_year: 0, metric_count: null}],
    documents: [{requirement_id: await requirement('Barangay Business Clearance'),file_path:'test/clearance.pdf'}, {requirement_id:await requirement(property),file_path:'test/property.pdf'}] };
}
async function submit(p, taxpayer = owner) { return (await db.query('SELECT submit_applicant_application($1,$2::jsonb) AS app_no', [taxpayer,JSON.stringify(p)])).rows[0].app_no; }

test('migration backfills existing rentals and preserves legacy flag compatibility', async () => {
  let record = (await db.query('SELECT tenancy_type,stall_unit_numbers FROM businesses WHERE business_id=$1',[legacyBusiness])).rows[0];
  assert.equal(record.tenancy_type,'Rented');
  assert.deepEqual(record.stall_unit_numbers,[]);
  await db.query("UPDATE businesses SET tenancy_type='Owned Residential' WHERE business_id=$1",[legacyBusiness]);
  record = (await db.query('SELECT tenancy_type,is_renting FROM businesses WHERE business_id=$1',[legacyBusiness])).rows[0];
  assert.deepEqual(record,{tenancy_type:'Owned Residential',is_renting:false});
  await db.query('UPDATE businesses SET is_renting=true WHERE business_id=$1',[legacyBusiness]);
  assert.equal((await db.query('SELECT tenancy_type FROM businesses WHERE business_id=$1',[legacyBusiness])).rows[0].tenancy_type,'Rented');
  await assert.rejects(db.query("UPDATE businesses SET tenancy_type='Other' WHERE business_id=$1",[legacyBusiness]),{code:'23514'});
});

test('migration configures the three tenancy documents and standard clearance upload', async () => {
  const {rows} = await db.query("SELECT r.name,r.condition_type,r.applies_to_new,r.applies_to_renewal,c.match_value FROM requirement_types r JOIN requirement_conditions c ON c.requirement_id=r.id WHERE r.condition_type='tenancy_type' ORDER BY r.name");
  assert.deepEqual(rows.map(r=>[r.name,r.match_value]),[['Building Permit','Owned Commercial'],['Contract of Lease','Rented'],['Zoning Clearance','Owned Residential']]);
  assert.ok(rows.every(r=>r.applies_to_new && r.applies_to_renewal));
  const {rows:[clearance]} = await db.query("SELECT is_active,is_conditional,max_files FROM requirement_types WHERE name='Barangay Business Clearance'");
  assert.deepEqual(clearance,{is_active:true,is_conditional:false,max_files:1});
});

test('submission stores tenancy/stalls and uses trusted barangay coordinates and Liliw address', async () => {
  for (const tenancy of ['Rented','Owned Commercial','Owned Residential']) {
    const appNo = await submit(await payload(tenancy));
    const {rows:[saved]}=await db.query('SELECT b.*,a.location_mismatch FROM applications a JOIN businesses b USING(business_id) WHERE application_no=$1',[appNo]);
    const {rows:[barangay]}=await db.query("SELECT latitude,longitude FROM barangays WHERE name='Bayate'");
    assert.equal(saved.tenancy_type,tenancy);
    assert.equal(saved.is_renting,tenancy==='Rented');
    assert.equal(saved.city,'Liliw'); assert.equal(saved.province,'Laguna');
    assert.equal(saved.latitude,barangay.latitude); assert.equal(saved.longitude,barangay.longitude);
    assert.deepEqual(saved.stall_unit_numbers,['12','13','14']);
    assert.equal(saved.location_mismatch,false);
  }
});

test('returned-app resubmission replaces stale activities and tenancy documents without duplicates', async () => {
  const appNo=await submit(await payload());
  await db.query("UPDATE applications SET status='Returned' WHERE application_no=$1",[appNo]);
  const next=await payload('Owned Residential'); next.application_no=appNo;
  next.stall_unit_numbers=['Unit A','Unit B']; next.activities=[{activity_id:2,capitalization:30000}];
  await submit(next);
  const {rows:activities}=await db.query('SELECT activity_id FROM application_activities WHERE application_no=$1',[appNo]);
  assert.deepEqual(activities,[{activity_id:2}]);
  const {rows:docs}=await db.query('SELECT requirement_id FROM doc_verifications WHERE application_no=$1 ORDER BY requirement_id',[appNo]);
  assert.deepEqual(docs.map(d=>d.requirement_id),next.documents.map(d=>d.requirement_id).sort((a,b)=>a-b));
  const {rows:[business]}=await db.query('SELECT b.stall_unit_numbers FROM applications a JOIN businesses b USING(business_id) WHERE application_no=$1',[appNo]);
  assert.deepEqual(business.stall_unit_numbers,['Unit A','Unit B']);
});

test('failed document or activity writes roll back business/application changes and retain drafts', async () => {
  await db.query("INSERT INTO application_drafts(taxpayer_id,current_step,form_data) VALUES ($1,4,'{}') ON CONFLICT(taxpayer_id) DO NOTHING",[other]);
  const {rows:[before]}=await db.query('SELECT count(*)::integer AS count FROM businesses');
  for (const kind of ['activity','document']) {
    const p=await payload();
    if(kind==='activity') p.activities[0].activity_id=999999; else p.documents[0].requirement_id=999999;
    await assert.rejects(submit(p,other),{code:'23503'});
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM businesses')).rows[0].count,before.count);
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM application_drafts WHERE taxpayer_id=$1',[other])).rows[0].count,1);
  }
});

test('returned-app resubmission persists the gross sales retained by the wizard', async () => {
  const original = await payload('Owned Commercial');
  original.type_id = 2;
  original.activities[0].gross_sales_prev_year = 500000;
  const appNo = await submit(original);
  await db.query("UPDATE applications SET status='Returned' WHERE application_no=$1", [appNo]);
  const { rows: [saved] } = await db.query('SELECT capitalization,gross_sales_prev_year FROM application_activities WHERE application_no=$1', [appNo]);
  const form = formUtils.normalizeDraftFormData({
    step3: { lineOfBusinesses: [{ name: 'Retail', capital_investment: String(saved.capitalization), gross_sales_prev_year: String(saved.gross_sales_prev_year) }] },
  });
  const next = formUtils.buildSubmissionPayload(form, [], appNo);
  await submit({ ...original, application_no: appNo, activities: [{ ...next.activities[0], activity_id: original.activities[0].activity_id }] });
  const { rows: activities } = await db.query('SELECT capitalization,gross_sales_prev_year FROM application_activities WHERE application_no=$1', [appNo]);
  assert.equal(activities.length, 1);
  assert.equal(Number(activities[0].gross_sales_prev_year), 500000);
  assert.equal(Number(activities[0].capitalization), 20000);
});

test('gross sales validation allows zero and positive amounts and rejects invalid declarations', () => {
  const form = formUtils.normalizeDraftFormData({ step3: { lineOfBusinesses: [{ name: 'Retail', capital_investment: '20000' }] } });
  for (const amount of ['', '0', '500000.25']) {
    form.step3.lineOfBusinesses[0].gross_sales_prev_year = amount;
    assert.deepEqual(formUtils.validateWizardStep(3, form), []);
  }
  for (const amount of ['-1', 'invalid', 'Infinity']) {
    form.step3.lineOfBusinesses[0].gross_sales_prev_year = amount;
    assert.ok(formUtils.validateWizardStep(3, form).some(message => message.includes('gross sales')));
  }
});

test('resubmission enforces ownership and locks submitted applications', async () => {
  const p=await payload(); const appNo=await submit(p); p.application_no=appNo;
  await assert.rejects(submit(p,other),{code:'P0002'});
  await assert.rejects(submit(p),{code:'22023'});
  const unauthorizedPayload = await payload();
  await db.exec('SET ROLE authenticated');
  try { await assert.rejects(submit(unauthorizedPayload),{code:'42501'}); }
  finally { await db.exec('RESET ROLE'); }
});

test('legacy drafts migrate safely and retain multi-file uploads', () => {
  const form=formUtils.normalizeDraftFormData({step2:{is_renting:true,city:'Elsewhere'},step4:{request_barangay_clearance:true,documents:[{requirement_id:8,file_path:'front.jpg'},{requirement_id:8,file_path:'back.jpg'}]}});
  assert.equal(form.step2.tenancy_type,'Rented'); assert.equal(form.step2.city,'Liliw'); assert.equal(form.step2.province,'Laguna');
  assert.equal(form.step4.request_barangay_clearance,false);
  assert.equal(form.step4.documents[0].files.length,2);
  assert.deepEqual(form.step3.stall_unit_numbers,[]);
  assert.equal(formUtils.normalizeDraftFormData({}).step2.tenancy_type,'Owned Commercial');
});

test('client validation requires clearance/property uploads and rejects duplicate stalls', () => {
  const form=formUtils.normalizeDraftFormData({step3:{stall_unit_numbers:['12','12']}});
  assert.ok(formUtils.validateWizardStep(3,form).some(e=>e.includes('unique')));
  const requirements=[{id:1,name:'Barangay Business Clearance',max_files:1},{id:2,name:'Contract of Lease',max_files:1}];
  assert.equal(formUtils.validateWizardStep(4,form,requirements).length,2);
  form.step4.documents=[{requirement_id:1,file_path:'clearance.pdf'},{requirement_id:2,file_path:'lease.pdf'},{requirement_id:3,file_path:'obsolete.pdf'}];
  assert.deepEqual(formUtils.validateWizardStep(4,form,requirements),[]);
  assert.equal(formUtils.buildSubmissionPayload(form,requirements).documents.length,2);
});

test('server and upload validation reject unsupported tenancy, municipality requests, and bad files', () => {
  const valid={type_id:1,business_name:'Business',org_type_id:1,address_line1:'Street',barangay:'Bayate',tenancy_type:'Rented',attestation_agreed:true,activities:[{name:'Retail',capitalization:100}],stall_unit_numbers:['12']};
  assert.equal(UAFSubmissionPayloadSchema.parse(valid).tenancy_type,'Rented');
  for(const patch of [{tenancy_type:'Other'},{request_barangay_clearance:true},{city:'Manila'},{stall_unit_numbers:['A','a']},{activities:[]},{attestation_agreed:false}]) assert.throws(()=>UAFSubmissionPayloadSchema.parse({...valid,...patch}));
  assert.ok(DraftPayloadSchema.parse({current_step:3,form_data:{step2:{tenancy_type:'Rented'}}}));
  for(const type of ['application/pdf','image/jpeg','image/png']) assert.equal(uploadUtils.validateDocumentFile({name:type==='application/pdf'?'file.pdf':type==='image/jpeg'?'file.jpg':'file.png',type,size:1024}),null);
  assert.ok(uploadUtils.validateDocumentFile({name:'bad.exe',type:'application/octet-stream',size:1024}));
  assert.ok(uploadUtils.validateDocumentFile({name:'large.pdf',type:'application/pdf',size:6*1024*1024}));
});
