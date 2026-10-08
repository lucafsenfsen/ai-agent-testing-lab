/* Automated evidence has its own schema and never enters Lab's score records. */
(function(root,factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api; else root.AutomatedReport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const statuses=['passed','failed','error','skipped'];
  function validate(data) {
    const bad=()=>{throw new Error('Invalid or unsupported automated report. Choose a Phase 1 report.json file.');};
    const str=v=>typeof v==='string' && v.length<=100000;
    const date=v=>str(v) && Number.isFinite(Date.parse(v));
    if(!data || data.schemaVersion!==1 || data.kind!=='ai-agent-lab-automated' ||
      !['evaluation','dashboard'].includes(data.scope) || !str(data.runId) || !str(data.target) ||
      !date(data.startedAt) || !date(data.finishedAt) || !['passed','failed','error','timedout','interrupted'].includes(data.status) ||
      typeof data.originalAppUnchanged!=='boolean' || !Array.isArray(data.tests) || data.tests.length>10000 ||
      !Array.isArray(data.errors) || !data.errors.every(e=>e && str(e.message)) || !data.environment ||
      !['node','platform','arch','osRelease','playwright','locale','timezone'].every(k=>str(data.environment[k])) ||
      !data.sourceHashes || !Object.entries(data.sourceHashes).every(([k,v])=>str(k) && /^[a-f0-9]{64}$/.test(v))) bad();
    const counts={total:data.tests.length,passed:0,failed:0,error:0,skipped:0};
    const ids=new Set();
    for(const t of data.tests) {
      if(!t || !str(t.id) || ids.has(t.id) || !str(t.title) || !str(t.project) || !statuses.includes(t.status) || !Array.isArray(t.attempts)) bad();
      ids.add(t.id); counts[t.status]++;
      if(t.status!=='skipped' && t.attempts.length===0) bad();
      for(const a of t.attempts) {
        if(!a || !str(a.status) || !Number.isFinite(a.durationMs) || a.durationMs<0 || !Array.isArray(a.errors) || !a.errors.every(e=>e && str(e.message)) ||
          !Array.isArray(a.attachments) || !a.attachments.every(v=>v && str(v.name) && str(v.contentType) && (v.path===undefined || str(v.path)) && (v.body===undefined || str(v.body)))) bad();
      }
    }
    if(!data.summary || !Object.keys(counts).every(k=>data.summary[k]===counts[k])) bad();
    if(data.status==='passed' && (counts.failed || counts.error || data.errors.length || !counts.passed || !data.originalAppUnchanged)) bad();
    return data;
  }
  function parse(raw) {return validate(JSON.parse(raw));}
  return {parse,validate};
});
