const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const express=require('express');
const officer='11111111-1111-4111-8111-111111111111';
let rpcCalls,source,storageResult,alreadyAssessed,unresolved;
const database={
 from(table){let updating=false;const builder={select(){return this;},update(){updating=true;return this;},eq(){return this;},single(){return this;},maybeSingle(){return this;},then(resolve,reject){
  let data=null;
  if(table==='doc_verifications')data=updating?null:[{status:unresolved?'Pending':'Verified'}];
  if(table==='application_data_reviews')data=Array.from({length:4},()=>({status:'Verified'}));
  if(table==='assessments')data={id:'assessment',calculation_context:{version:3},applications:{status:'Assessed'},assessment_line_items:[]};
  return Promise.resolve({data,error:null}).then(resolve,reject);
 }};return builder;},
 storage:{from(){return{async info(){return storageResult;}};}},
 async rpc(name,payload){rpcCalls.push({name,payload});
  if(name==='get_assessment_inputs')return{data:source,error:null};
  if(name==='approve_and_assess_application')return{data:{assessment_id:'assessment',status:'Assessed',already_assessed:alreadyAssessed,total_amount:100},error:null};
  return{data:{bmbe_exempt:payload.p_enabled},error:null};
 },
};
function stub(name,exports){const id=require.resolve(name);require.cache[id]={id,filename:id,loaded:true,exports};}
stub('../src/config/supabase',{supabaseAdmin:database});
stub('../src/services/application.service',{});stub('../src/services/pdf.service',{});
stub('../src/services/email.service',{dispatchEmail(){},EMAIL_TRIGGERS:{}});
stub('../src/services/audit.service',{logAction:async()=>{},AUDIT_ACTIONS:require('../src/utils/constants').AUDIT_ACTIONS});
stub('../src/services/storage.service',{generatePresignedDownloadUrl:async()=> 'https://example.test/private',generatePresignedUploadUrl:async()=>({signedUrl:'https://example.test/upload',path:`${officer}/certificate.pdf`})});
stub('../src/controllers/correction.controller',Object.fromEntries(['listPendingCorrectionRequests','getCorrectionRequestDetail','approveCorrectionRequest','rejectCorrectionRequest'].map(name=>[name,()=>{}])));
stub('../src/middlewares/auth.middleware',{authenticate(req,res,next){if(!req.headers['x-test-role'])return res.status(401).json({success:false});req.user={userId:officer,roleName:req.headers['x-test-role']};next();}});
const {errorHandler}=require('../src/middlewares/error.middleware');
const app=express();app.use(express.json());
app.use('/api/treasury',require('../src/routes/treasury.routes'));app.use('/api/bplo',require('../src/routes/bplo.routes'));app.use(errorHandler);
let server,base;
before(async()=>{server=app.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
beforeEach(()=>{rpcCalls=[];alreadyAssessed=false;unresolved=false;storageResult={data:{size:1024,contentType:'application/pdf'},error:null};source={application:{application_no:'APP-TEST'},barangay_active:true,zone:{is_active:true,fee_multiplier:1,min_capital_floor:10000},activities:[{name:'Retail',capitalization:10000,gross_sales_prev_year:0}],fee_types:[{id:1,name:'Fixed fee',computation_basis:'Fixed',fixed_amount:100}],fee_schedule:[],rules:[]};});
async function request(url,method='GET',body,role='Treasury_Officer'){
 const res=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(role?{'x-test-role':role}:{})},body:body?JSON.stringify(body):undefined});return{status:res.status,body:await res.json()};
}

test('manual generation, arbitrary overrides and resets are disabled even for Treasury',async()=>{
 assert.equal((await request('/api/treasury/assess','POST',{application_no:'APP-TEST'})).status,410);
 for(const action of ['override','reset'])assert.equal((await request(`/api/treasury/assess/item/${action}`,'PUT',{new_amount:1,reason:'test'})).status,410);
 assert.equal(rpcCalls.length,0);
});
test('BPLO approval invokes calculation and atomic assessment and returns Assessed',async()=>{
 const res=await request('/api/bplo/applications/verify/APP-TEST','PUT',{checklist:[{requirementId:2,status:'Verified'}]},'BPLO_Officer');
 assert.equal(res.status,200);assert.equal(res.body.data.status,'Assessed');
 assert.deepEqual(rpcCalls.map(c=>c.name),['get_assessment_inputs','approve_and_assess_application']);
 assert.equal(rpcCalls[1].payload.p_calculation.totalAmount,100);
 unresolved=true;rpcCalls=[];
 assert.equal((await request('/api/bplo/applications/verify/APP-TEST','PUT',{checklist:[{requirementId:2,status:'Verified'}]},'BPLO_Officer')).status,400);
 assert.equal(rpcCalls.length,0);
});
test('BMBE updates reject missing evidence, invalid files and arbitrary amount fields',async()=>{
 const body={enabled:true,certificate_path:`${officer}/certificate.pdf`,authority_reference:'LGU TEST AUTHORITY',remarks:'Valid certificate verified',certificate_verified:true};
 assert.equal((await request('/api/treasury/assess/APP-TEST/bmbe','PUT',{enabled:true,remarks:'test'})).status,400);
 assert.equal((await request('/api/treasury/assess/APP-TEST/bmbe','PUT',{...body,new_amount:0})).status,400);
 storageResult={data:null,error:{message:'missing'}};
 assert.equal((await request('/api/treasury/assess/APP-TEST/bmbe','PUT',body)).status,400);
 storageResult={data:{size:1024,contentType:'application/pdf'},error:null};
 assert.equal((await request('/api/treasury/assess/APP-TEST/bmbe','PUT',body)).status,200);
 assert.equal(rpcCalls.at(-1).name,'set_assessment_bmbe_exemption');
});
test('assessment routes enforce role boundaries and certificate upload type validation',async()=>{
 for(const role of [null,'Applicant','BPLO_Officer'])assert.equal((await request('/api/treasury/assess/APP-TEST','GET',undefined,role)).status,role?403:401);
 assert.equal((await request('/api/treasury/assess/APP-TEST/bmbe-certificate','POST',{fileName:'bad.exe',mimeType:'application/octet-stream'})).status,400);
 assert.equal((await request('/api/treasury/assess/APP-TEST/bmbe-certificate','POST',{fileName:'certificate.pdf',mimeType:'application/pdf'})).status,200);
});
