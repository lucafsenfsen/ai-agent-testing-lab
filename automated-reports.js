(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let report=null, request=0;
  const panel=$('#view-automated');
  panel.innerHTML=`<div class="notice">Automated checks are observed behavior of the preserved application. They do not calculate or change evaluator scores. Experiment 001’s reported 96.8/100 is a subjective assessment of one run, not an official OpenAI benchmark.</div>
    <div class="export-bar"><button class="button" id="load-published">View published Experiment 001</button><button class="button" id="load-evaluation">Load latest app evaluation</button><button class="button" id="load-dashboard">Load latest dashboard QA</button><button class="button" id="import-automated">Open report JSON</button><button class="button" id="download-automated" disabled>Download this report</button></div>
    <input id="automated-file" type="file" accept=".json,application/json" hidden>
    <p id="automated-message" role="status">No automated report loaded. View the published Experiment 001 evidence, load a local run, or open a saved report.json.</p>
    <p class="helper">Reports are kept in memory while this page is open. Original files remain on disk. Published evidence is a fixed reviewed run. Latest reports require locally generated files; Open report JSON also works offline. Imported contents are displayed as supplied, not independently authenticated.</p>
    <div id="automated-output"></div>`;
  function render() {
    const r=report,s=r.summary;
    $('#download-automated').disabled=false;
    $('#automated-output').innerHTML=`<article class="panel prose automated-report">
      <h2>${r.scope==='evaluation'?'Experiment 001 · App evaluation':'Dashboard QA · Software checks'}</h2>
      <p id="automated-summary">${s.passed} passed · ${s.failed} failed · ${s.error} errors · ${s.skipped} skipped / ${s.total} tests</p>
      <p>Run status: <strong>${esc(r.status)}</strong> · Original app matches baseline: <strong>${r.originalAppUnchanged?'yes':'NO'}</strong></p>
      <p>Run: ${esc(r.runId)}<br>Started: ${esc(r.startedAt)}<br>Finished: ${esc(r.finishedAt)}<br>Target: ${esc(r.target)}</p>
      <p>Playwright ${esc(r.environment.playwright)} · Node ${esc(r.environment.node)} · ${esc(r.environment.platform)} ${esc(r.environment.arch)} ${esc(r.environment.osRelease)}<br>Locale ${esc(r.environment.locale)} · Timezone ${esc(r.environment.timezone)}</p>
      ${r.errors.length?`<div class="notice danger">Run errors<pre>${esc(r.errors.map(e=>e.message).join('\n'))}</pre></div>`:''}
      <details><summary>Source hashes and reproduction metadata</summary><pre>${esc(JSON.stringify({command:r.command,protocol:r.protocol,sourceHashes:r.sourceHashes,suiteHashes:r.suiteHashes,limitations:r.limitations},null,2))}</pre></details>
      <div class="table-wrap"><table><thead><tr><th>Test</th><th>Browser</th><th>Result</th><th>Details</th></tr></thead><tbody>${r.tests.map(t=>`<tr><td>${esc(t.title)}</td><td>${esc(t.project)}</td><td>${esc(t.status)}</td><td><details><summary>${t.attempts.length} attempt(s)</summary>${t.attempts.map(a=>`<p>${esc(a.status)} · ${a.durationMs} ms</p>${a.errors.map(e=>`<pre>${esc(e.message)}</pre>`).join('')}${a.attachments.map(v=>`<p>${esc(v.name)}: ${esc(v.path||v.body||'binary attachment in original report folder')}</p>`).join('')}`).join('')}</details></td></tr>`).join('')}</tbody></table></div>
    </article>`;
  }
  function accept(raw,label) {
    const next=AutomatedReport.parse(raw);
    report=next; render(); $('#automated-message').textContent=`Loaded ${label}.`;
  }
  async function latest(scope) {
    const token=++request;
    $('#automated-message').textContent='Loading report…';
    try {
      const response=await fetch(`reports/latest-${scope}.json`,{cache:'no-store'});
      if(!response.ok) throw new Error('No saved run found. Run the tests first, or use Open report JSON.');
      const pointer=await response.json();
      if(!/^reports\/[a-zA-Z0-9-]+\/report\.json$/.test(pointer.report)) throw new Error('Invalid report location.');
      const result=await fetch(pointer.report,{cache:'no-store'});
      if(!result.ok) throw new Error('Saved report could not be read.');
      const raw=await result.text();
      if(raw.length>20*1024*1024) throw new Error('Report is larger than 20 MB.');
      if(token===request) accept(raw,pointer.report);
    } catch(error) {if(token===request) $('#automated-message').textContent=error.message+' You can also open a report.json file.';}
  }
  $('#load-published').addEventListener('click',async()=>{
    const token=++request;
    $('#automated-message').textContent='Loading published evidence…';
    try {
      const response=await fetch('results/experiment-001/evaluation.json',{cache:'no-store'});
      if(!response.ok) throw new Error('Published evidence could not be read.');
      const raw=await response.text();
      if(raw.length>20*1024*1024) throw new Error('Report is larger than 20 MB.');
      if(token===request) accept(raw,'published Experiment 001 evidence');
    } catch(error) {if(token===request) $('#automated-message').textContent=error.message+' Use Open report JSON when opening this dashboard as a file.';}
  });
  $('#load-evaluation').addEventListener('click',()=>latest('evaluation'));
  $('#load-dashboard').addEventListener('click',()=>latest('dashboard'));
  $('#import-automated').addEventListener('click',()=>$('#automated-file').click());
  $('#automated-file').addEventListener('change',async event=>{
    const file=event.target.files[0]; if(!file)return; const token=++request;
    try {
      if(file.size>20*1024*1024) throw new Error('Choose a report smaller than 20 MB.');
      const raw=await file.text(); if(token===request) accept(raw,file.name);
    } catch(error) {if(token===request) $('#automated-message').textContent='Could not open report: '+error.message;}
    finally {event.target.value='';}
  });
  $('#download-automated').addEventListener('click',()=>{
    if(!report)return;
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const link=document.createElement('a'); link.href=url; link.download='automated-report.json'; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();
