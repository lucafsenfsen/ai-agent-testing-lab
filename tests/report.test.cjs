'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {classify,summarize}=require('../automation/report.cjs');
const {validate}=require('../report-format.js');
const fixture=()=>({schemaVersion:1,kind:'ai-agent-lab-automated',scope:'evaluation',runId:'QA-FIXTURE',target:'test-only',startedAt:'2026-10-08T00:00:00Z',finishedAt:'2026-10-08T00:00:01Z',status:'passed',originalAppUnchanged:true,
 environment:{node:'test',platform:'test',arch:'test',osRelease:'test',playwright:'test',locale:'test',timezone:'test'},sourceHashes:{},errors:[],
 tests:[{id:'qa',title:'Synthetic parser fixture only',project:'qa',status:'passed',attempts:[{status:'passed',durationMs:1,errors:[],attachments:[]}]}],summary:{total:1,passed:1,failed:0,error:0,skipped:0}});
test('reporter separates assertion failures, execution errors and interruptions',()=>{
 assert.equal(classify({status:'passed'}),'passed');
 assert.equal(classify({status:'failed',errors:[{message:'Error: expect(locator).toHaveText(expected)'}]}),'failed');
 for(const status of ['failed','timedOut','interrupted']) assert.equal(classify({status,errors:[{message:'Browser launch failed'}]}),'error');
 assert.equal(classify({status:'skipped'}),'skipped');
});
test('report totals retain skips and errors without converting to weighted scores',()=>{
 assert.deepEqual(summarize(['passed','failed','error','skipped'].map(status=>({status}))),{total:4,passed:1,failed:1,error:1,skipped:1});
});
test('report viewer accepts valid evidence and rejects malformed counts and schema',()=>{
 assert.equal(validate(fixture()).summary.passed,1);
 for(const mutate of [r=>r.schemaVersion=2,r=>r.summary.passed=2,r=>r.tests[0].status='invented',r=>r.tests[0].attempts=[],r=>r.tests[0].attempts[0].errors=[{}],r=>r.environment=null,r=>r.tests.push(r.tests[0]),r=>r.errors=[{message:'run failed'}],r=>r.originalAppUnchanged=false]) {
  const r=fixture(); mutate(r); assert.throws(()=>validate(r));
 }
});
test('fatal setup errors with zero tests are valid failed-run evidence',()=>{
 const r=fixture();r.status='error';r.tests=[];r.summary={total:0,passed:0,failed:0,error:0,skipped:0};r.errors=[{message:'Setup failed'}];
 assert.equal(validate(r).errors.length,1);
});
const {publicReport}=require('../automation/export-public.cjs');
function completeReport() {
 const r=fixture(); r.command=['node','automation/run.cjs','evaluation'];
 r.baseURL='http://127.0.0.1:12345/';
 r.tests=['chromium','webkit'].flatMap(project=>Array.from({length:25},(_,i)=>({...structuredClone(r.tests[0]),id:`${project}-${i}`,project})));
 r.summary={total:50,passed:50,failed:0,error:0,skipped:0};
 r.tests[0].attempts[0].attachments=[{name:'screenshot',contentType:'image/png',path:'/private/test-only.png'},{name:'browser-environment',contentType:'application/json',body:'{"version":"QA-only"}'}];
 return r;
}
test('public export preserves individual outcomes and omits local artifact locations',()=>{
 const raw=JSON.stringify(completeReport()); const r=JSON.parse(publicReport(raw));
 assert.equal(r.tests.length,50); assert.equal(r.tests[0].attempts[0].durationMs,1);
 assert.equal(r.baseURL,undefined); assert.equal(r.tests[0].attempts[0].attachments.length,1);
 assert.equal(r.publicExport.sourceReportSha256,require('node:crypto').createHash('sha256').update(raw).digest('hex'));
});
test('public export refuses partial or unsuccessful runs',()=>{
 for(const mutate of [r=>r.command.push('--grep=T01'),r=>r.tests[0].project='firefox',r=>{r.status='error';r.errors=[{message:'QA error'}];}]) {
  const r=completeReport(); mutate(r); assert.throws(()=>publicReport(JSON.stringify(r)));
 }
});
test('public export blocks accidental personal paths in retained metadata',()=>{
 const r=completeReport();r.tests[0].title='/Users/QA_ONLY/private';
 assert.throws(()=>publicReport(JSON.stringify(r)),/private path/);
});
