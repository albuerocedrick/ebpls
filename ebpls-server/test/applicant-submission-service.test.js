const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { ApplicantRequirementsQuerySchema } = require('../src/utils/validators');
const owner = '11111111-1111-4111-8111-111111111111';
const definitions = [
  {id:1,name:'Barangay Business Clearance'},
  {id:2,name:'Contract of Lease',condition_type:'tenancy_type',match:'Rented'},
  {id:3,name:'Building Permit',condition_type:'tenancy_type',match:'Owned Commercial'},
  {id:4,name:'Zoning Clearance',condition_type:'tenancy_type',match:'Owned Residential'},
  {id:5,name:'Water Analysis',condition_type:'business_activity',match:'Water Refilling Station'},
  {id:6,name:"Lessor's Permit",condition_type:'rental_status',match:'true'},
].map(r=>({...r,sort_order:r.id,max_files:1,is_conditional:!!r.condition_type,is_active:true,applies_to_new:true,applies_to_renewal:true,requirement_conditions:r.match?[{match_value:r.match}]:[]}));
let rpcCalls, files, rpcError;
const db = {
  from(table) {
    const filters={}; let single=false;
    const builder={
      select(){return this;},eq(key,value){filters[key]=value;return this;},
      single(){single=true;return this;},maybeSingle(){single=true;return this;},
      then(resolve,reject){
        let data = table==='requirement_types'?definitions:
          table==='organization_types'?[{id:1,name:'Sole Proprietorship'}]:
          table==='barangays'?[{id:1,name:'Bayate',latitude:14.1800768,longitude:121.4169645,is_active:true}]:
          table==='business_activities'?[{id:1,name:'Retail',is_active:true}]:[];
        data=data.filter(row=>Object.entries(filters).every(([key,value])=>row[key]===value));
        return Promise.resolve({data:single?(data[0]||null):structuredClone(data),error:null}).then(resolve,reject);
      },
    }; return builder;
  },
  storage:{from(){return{async info(path){files.push(path);return path.includes('missing')?{data:null,error:{message:'Not found'}}:{data:{size:1024,contentType:path.endsWith('.png')?'image/png':path.endsWith('.jpg')?'image/jpeg':'application/pdf'},error:null};}};}},
  async rpc(name,payload){rpcCalls.push({name,payload});return{data:'APP-2026-00001',error:rpcError};},
};
const configPath=require.resolve('../src/config/supabase');
require.cache[configPath]={id:configPath,filename:configPath,loaded:true,exports:{supabaseAdmin:db}};
const {resolveApplicableRequirements}=require('../src/services/requirement.service');
const {submitApplicantApplication}=require('../src/services/applicant-submission.service');
beforeEach(()=>{rpcCalls=[];files=[];rpcError=null;});
function payload(tenancy='Owned Commercial'){
  return{type_id:1,org_type_id:1,business_name:'Test',address_line1:'Test street',barangay:'Bayate',tenancy_type:tenancy,stall_unit_numbers:['12','13'],activities:[{name:'Retail',capitalization:1000}],documents:[{requirement_id:1,file_path:`${owner}/clearance.pdf`},{requirement_id:tenancy==='Rented'?2:tenancy==='Owned Residential'?4:3,file_path:`${owner}/property.pdf`},...(tenancy==='Rented'?[{requirement_id:6,file_path:`${owner}/lessor.pdf`}]:[])]};
}

test('tenancy requirements resolve for New, Renewal and Additional Line without leaking other property documents',async()=>{
  for(const type of [1,2,3])for(const tenancy of ['Rented','Owned Commercial','Owned Residential']){
    const requirements=await resolveApplicableRequirements({application_type_id:type,org_type_id:1,tenancy_type:tenancy});
    const expected=tenancy==='Rented'?[1,2,6]:tenancy==='Owned Commercial'?[1,3]:[1,4];
    assert.deepEqual(requirements.map(r=>r.id),expected);
  }
  const conditional=await resolveApplicableRequirements({application_type_id:1,tenancy_type:'Owned Commercial',activity_names:['Water Refilling Station']});
  assert.ok(conditional.some(r=>r.id===5));
});

test('submission validates uploaded files and sends canonical tenancy, centroid and stalls to the atomic RPC',async()=>{
  for(const tenancy of ['Rented','Owned Commercial','Owned Residential']){
    const p=payload(tenancy);p.latitude=0;p.longitude=0;p.documents.push({requirement_id:999,file_path:`${owner}/obsolete.pdf`});
    assert.equal(await submitApplicantApplication(owner,p),'APP-2026-00001');
    const sent=rpcCalls.at(-1).payload.p_payload;
    assert.equal(sent.latitude,14.1800768);assert.equal(sent.longitude,121.4169645);
    assert.equal(sent.city,'Liliw');assert.equal(sent.province,'Laguna');
    assert.equal(sent.is_renting,tenancy==='Rented');assert.equal(sent.request_barangay_clearance,false);
    assert.deepEqual(sent.stall_unit_numbers,['12','13']);assert.equal(sent.activities[0].activity_id,1);
    assert.ok(!sent.documents.some(d=>d.requirement_id===999));
  }
});

test('missing clearance/property documents and forged or missing uploads are rejected before any database write',async()=>{
  for(const requirementId of [1,3]){
    const p=payload();p.documents=p.documents.filter(d=>d.requirement_id!==requirementId);
    await assert.rejects(submitApplicantApplication(owner,p),{statusCode:400});
  }
  for(const invalidPath of ['another-taxpayer/clearance.pdf',`${owner}/../clearance.pdf`,`${owner}/missing.pdf`,`${owner}/file.exe`]){
    const p=payload();p.documents[0].file_path=invalidPath;
    await assert.rejects(submitApplicantApplication(owner,p),{statusCode:400});
  }
  assert.equal(rpcCalls.length,0);
});

test('invalid barangays, inactive activities, duplicates, and locked applications fail safely',async()=>{
  const unknown=payload();unknown.barangay='Not Liliw';await assert.rejects(submitApplicantApplication(owner,unknown),{statusCode:400});
  const activity=payload();activity.activities[0].name='Inactive';await assert.rejects(submitApplicantApplication(owner,activity),{statusCode:400});
  const duplicate=payload();duplicate.activities.push(duplicate.activities[0]);await assert.rejects(submitApplicantApplication(owner,duplicate),{statusCode:400});
  assert.equal(rpcCalls.length,0);
  rpcError={code:'P0002'};await assert.rejects(submitApplicantApplication(owner,payload()),{statusCode:404});
  rpcError={code:'22023'};await assert.rejects(submitApplicantApplication(owner,payload()),{statusCode:400});
});

test('requirement query preserves activity names with commas and rejects malformed parameters',()=>{
  const name='Personal Services (Salon, Spa, Laundry, etc.)';
  assert.deepEqual(ApplicantRequirementsQuerySchema.parse({type_id:'1',activity_names:JSON.stringify([name])}).activity_names,[name]);
  assert.throws(()=>ApplicantRequirementsQuerySchema.parse({type_id:'1invalid'}));
  assert.throws(()=>ApplicantRequirementsQuerySchema.parse({type_id:'1',tenancy_type:'Other'}));
});
