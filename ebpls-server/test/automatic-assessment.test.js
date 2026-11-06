const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {computeAssessment}=require('../src/utils/assessment-engine');
const sql=name=>fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8');
const bplo='11111111-1111-4111-8111-111111111111';
const treasury='22222222-2222-4222-8222-222222222222';
const applicant='33333333-3333-4333-8333-333333333333';
let db,sequence=0;
before(async()=>{
 db=new PGlite();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
  CREATE TABLE roles(role_id SERIAL PRIMARY KEY,role_name TEXT UNIQUE);
  INSERT INTO roles(role_name) VALUES('BPLO_Officer'),('Treasury_Officer'),('Applicant');
  CREATE TABLE users(user_id UUID PRIMARY KEY,role_id INTEGER REFERENCES roles(role_id),is_active BOOLEAN DEFAULT true);
  INSERT INTO users VALUES('${bplo}',1,true),('${treasury}',2,true),('${applicant}',3,true);
  CREATE TABLE taxpayers(taxpayer_id UUID PRIMARY KEY);INSERT INTO taxpayers VALUES('${applicant}');
  CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE FUNCTION public.auth_taxpayer_id() RETURNS uuid LANGUAGE sql AS $$ SELECT '${applicant}'::uuid $$;
  CREATE FUNCTION public.auth_user_role() RETURNS text LANGUAGE sql AS $$ SELECT 'Admin'::text $$;
  CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now();RETURN NEW;END $$;`);
 for(const name of ['004_businesses.sql','005_applications.sql','006_verifications.sql','008_treasury.sql'])await db.exec(sql(name));
 await db.exec(sql('010_permits.sql').split('CREATE TABLE IF NOT EXISTS public.permits (')[0]);
 for(const name of ['011_audit_logs.sql','012_email_notifications.sql','015_design_gaps_fix.sql','018_doc_verifications_file_path.sql','030_barangays_lookup.sql','032_add_fixed_amount_to_fees.sql','036_fee_schedule.sql','037_fix_tiered_activity_match.sql','038_activity_metric_count.sql','039_fix_activity_matches.sql','043_location_mismatch.sql','044_location_zones_and_centroids.sql'])await db.exec(sql(name));
 // Reproduce client privileges that the Phase 3 migration must remove.
 await db.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON assessments,assessment_line_items TO authenticated');
 await db.exec(sql('047_automatic_assessment.sql'));
});
after(async()=>{await db?.close();});
async function makeApplication({capital=20000,barangay='Bayate',resolved=true}={}){
 const appNo=`APP-TEST-${String(++sequence).padStart(5,'0')}`;
 const {rows:[business]}=await db.query('INSERT INTO businesses(taxpayer_id,business_name,org_type_id,barangay) VALUES($1,$2,1,$3) RETURNING business_id',[applicant,'Assessment test',barangay]);
 await db.query("INSERT INTO applications(application_no,business_id,type_id,status) VALUES($1,$2,1,'Under Review')",[appNo,business.business_id]);
 await db.query('INSERT INTO application_activities(application_no,activity_id,capitalization) VALUES($1,1,$2)',[appNo,capital]);
 await db.query("INSERT INTO doc_verifications(application_no,requirement_id,status) VALUES($1,2,$2)",[appNo,resolved?'Verified':'Pending']);
 for(const section of ['business_details','location','activities','financials'])await db.query("INSERT INTO application_data_reviews(application_no,section,status) VALUES($1,$2,'Verified')",[appNo,section]);
 return appNo;
}
async function calculation(appNo){return computeAssessment((await db.query('SELECT get_assessment_inputs($1) AS source',[appNo])).rows[0].source);}
async function approve(appNo,data,officer=bplo){return(await db.query('SELECT approve_and_assess_application($1,$2,$3::jsonb,$4) AS result',[appNo,officer,JSON.stringify(data),'127.0.0.1'])).rows[0].result;}
async function bill(appNo){return(await db.query('SELECT * FROM assessments WHERE application_no=$1',[appNo])).rows[0];}
async function exemption(appNo,enabled,remarks='Approved local relief'){return(await db.query('SELECT set_assessment_bmbe_exemption($1,$2,$3,$4,$5,$6) AS result',[appNo,treasury,enabled,enabled?`${treasury}/dti.pdf`:null,enabled?'LGU-TEST-ORDINANCE':null,remarks])).rows[0].result;}

test('BPLO approval atomically creates an itemized assessment, status and mandatory audits',async()=>{
 const appNo=await makeApplication();const calculated=await calculation(appNo);const result=await approve(appNo,calculated);
 assert.equal(result.status,'Assessed');assert.equal(result.total_amount,calculated.totalAmount);
 const saved=await bill(appNo);assert.equal(Number(saved.total_amount),calculated.totalAmount);
 const {rows:items}=await db.query('SELECT amount,is_override FROM assessment_line_items WHERE assessment_id=$1',[saved.id]);
 assert.equal(items.length,8);assert.ok(items.every(i=>!i.is_override));
 assert.equal((await db.query('SELECT status FROM applications WHERE application_no=$1',[appNo])).rows[0].status,'Assessed');
 assert.equal((await db.query("SELECT count(*)::int AS n FROM audit_logs WHERE entity_id IN ($1,$2)",[appNo,saved.id])).rows[0].n,2);
 const repeated=await approve(appNo,calculated);assert.equal(repeated.already_assessed,true);assert.equal(repeated.assessment_id,saved.id);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM assessments WHERE application_no=$1',[appNo])).rows[0].n,1);
});

test('Zone 1 and Zone 3 produce different regulatory fees while Business Tax is not zone-multiplied',async()=>{
 const high=await calculation(await makeApplication({barangay:'Rizal (Poblacion)'}));const low=await calculation(await makeApplication());
 const fee=(c,name)=>c.lineItems.find(i=>i.name===name).amount;
 assert.equal(fee(high,"Mayor's Permit Fee"),625);assert.equal(fee(low,"Mayor's Permit Fee"),400);
 assert.equal(fee(high,'Fire Safety Inspection Fee'),62.5);assert.equal(fee(low,'Fire Safety Inspection Fee'),40);
 assert.equal(fee(high,'Business Tax'),400);assert.equal(fee(low,'Business Tax'),400);
 assert.equal(high.context.capital_below_floor,true);
});

test('failed fee or audit writes leave no assessment header, status change or partial items',async()=>{
 for(const kind of ['line','audit','total']){
  const appNo=await makeApplication();const c=await calculation(appNo);
  if(kind==='line')c.lineItems[0].fee_type_id=999999;
  if(kind==='total')c.totalAmount+=1;
  if(kind==='audit')await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT test_block_assessment CHECK(action<>'FEE_ASSESSED') NOT VALID");
  try{await assert.rejects(approve(appNo,c));}finally{if(kind==='audit')await db.exec('ALTER TABLE audit_logs DROP CONSTRAINT test_block_assessment');}
  assert.equal(await bill(appNo),undefined);
  assert.equal((await db.query('SELECT status FROM applications WHERE application_no=$1',[appNo])).rows[0].status,'Under Review');
 }
});

test('changed configuration, unresolved checks and unauthorized actors prevent approval',async()=>{
 const appNo=await makeApplication();const c=await calculation(appNo);
 await db.exec('UPDATE location_zones SET fee_multiplier=0.9 WHERE id=3');
 try{await assert.rejects(approve(appNo,c),{code:'40001'});}finally{await db.exec('UPDATE location_zones SET fee_multiplier=0.8 WHERE id=3');}
 assert.equal(await bill(appNo),undefined);
 const unresolved=await makeApplication({resolved:false});await assert.rejects(approve(unresolved,await calculation(unresolved)),{code:'22023'});
 await assert.rejects(approve(appNo,await calculation(appNo),treasury),{code:'42501'});
});

test('BMBE requires evidence and LGU authority, changes only Business Tax, and restores its frozen amount',async()=>{
 const appNo=await makeApplication();await approve(appNo,await calculation(appNo));const saved=await bill(appNo);
 const original=(await db.query('SELECT fee_type_id,amount,base_amount,is_business_tax FROM assessment_line_items WHERE assessment_id=$1 ORDER BY fee_type_id',[saved.id])).rows;
 await assert.rejects(db.query('SELECT set_assessment_bmbe_exemption($1,$2,true,NULL,NULL,$3)',[appNo,treasury,'test']),{code:'22023'});
 const enabled=await exemption(appNo,true);assert.equal(enabled.bmbe_exempt,true);
 const exempt=(await db.query('SELECT fee_type_id,amount,base_amount,is_business_tax FROM assessment_line_items WHERE assessment_id=$1 ORDER BY fee_type_id',[saved.id])).rows;
 for(let i=0;i<original.length;i++)assert.equal(Number(exempt[i].amount),original[i].is_business_tax?0:Number(original[i].amount));
 assert.equal(Number(enabled.total_amount),Number(saved.total_amount)-400);
 const restored=await exemption(appNo,false,'Certificate no longer qualifies');assert.equal(Number(restored.total_amount),Number(saved.total_amount));
 const logs=(await db.query("SELECT old_value,new_value FROM audit_logs WHERE entity_id=$1 AND action='BMBE_EXEMPTION_UPDATED'",[saved.id])).rows;
 assert.equal(logs.length,2);assert.ok(logs.some(l=>l.new_value.authority_reference==='LGU-TEST-ORDINANCE'));
});

test('BMBE audit failures roll back tax relief and finalized bills cannot be changed',async()=>{
 const appNo=await makeApplication();await approve(appNo,await calculation(appNo));const original=await bill(appNo);
 await db.exec("ALTER TABLE audit_logs ADD CONSTRAINT test_block_bmbe CHECK(action<>'BMBE_EXEMPTION_UPDATED') NOT VALID");
 try{await assert.rejects(exemption(appNo,true),{code:'23514'});}finally{await db.exec('ALTER TABLE audit_logs DROP CONSTRAINT test_block_bmbe');}
 assert.equal((await bill(appNo)).bmbe_exempt,false);assert.equal((await bill(appNo)).total_amount,original.total_amount);
 const {rows:[finalized]}=await db.query('SELECT finalize_automatic_assessment($1,$2) AS result',[appNo,treasury]);assert.equal(finalized.result.already_finalized,false);
 await assert.rejects(exemption(appNo,true),{code:'22023'});
 assert.equal((await db.query('SELECT finalize_automatic_assessment($1,$2) AS result',[appNo,treasury])).rows[0].result.already_finalized,true);
});

test('client roles cannot change fee amounts or call service-only assessment functions',async()=>{
 const {rows:[rights]}=await db.query("SELECT has_table_privilege('authenticated','assessment_line_items','UPDATE') AS amount_update,has_function_privilege('authenticated','approve_and_assess_application(varchar,uuid,jsonb,text)','EXECUTE') AS approve,has_function_privilege('anon','set_assessment_bmbe_exemption(varchar,uuid,boolean,text,text,text)','EXECUTE') AS exempt");
 assert.deepEqual(rights,{amount_update:false,approve:false,exempt:false});
});

test('engine preserves zero fees, validates tiers and rejects circular percentage dependencies',()=>{
 const source={application:{},barangay_active:true,zone:{is_active:true,fee_multiplier:1.25,min_capital_floor:10000},activities:[{name:'Piggery',capitalization:10000,gross_sales_prev_year:0,metric_count:12}],fee_types:[{id:1,name:"Mayor's Permit Fee",computation_basis:'Gross_Sales'},{id:2,name:'Zero fee',computation_basis:'Fixed',fixed_amount:0}],fee_schedule:[{activity_match:'Piggery',business_type:'Piggery',tier_min:10,tier_max:14,tier_unit:'heads',amount:100}],rules:[]};
 assert.equal(computeAssessment(source).lineItems[0].amount,125);assert.equal(computeAssessment(source).lineItems[1].amount,0);
 const invalid=structuredClone(source);invalid.activities[0].metric_count=null;assert.throws(()=>computeAssessment(invalid),/metric count/);
 const circular=structuredClone(source);circular.fee_types=[{id:1,name:'A',computation_basis:'Percentage',percentage_of_id:2,percentage_value:.1},{id:2,name:'B',computation_basis:'Percentage',percentage_of_id:1,percentage_value:.1}];assert.throws(()=>computeAssessment(circular),/Circular/);
});
