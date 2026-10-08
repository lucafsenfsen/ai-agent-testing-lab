/* UI controller: all result data remains in this browser unless explicitly exported. */
(() => {
  'use strict';
  const { CRITERIA, CHALLENGES, STORAGE_KEY } = Lab;
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const fmt = value => value.toFixed(1);
  const challenge = id => CHALLENGES.find(c => c.id === id);
  const form = $('#result-form');
  let results = [], storedRaw = null, storageBlocked = false, editingId = null, deletingId = null, toastTimer;
  let resultFilters = { search: '', challenge: '', protocol: '' }, comparisonSelection = ['', ''];
  const views = {
    overview: ['Experiment overview', 'The evidence behind better AI coding decisions.', 'Overview'],
    challenges: ['The challenge suite', 'Five real-world tasks. One consistent evaluation framework.', 'Challenges'],
    results: ['Test results', 'Every run, its evidence, and the reasoning behind its score.', 'Test results'],
    automated: ['Automated test reports', 'Reproducible browser checks, separate from evaluator scores.', 'Automated tests'],
    compare: ['Compare models', 'Compare observed performance on the same challenges and protocol.', 'Compare models'],
    methodology: ['Research methodology', 'Make each experiment repeatable, inspectable, and honest.', 'Methodology']
  };
  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
  }
  function storageWarning(message, recoverable = false) {
    storageBlocked = true;
    $('#storage-status').textContent = 'Storage needs attention';
    $('#storage-warning').hidden = false;
    $('#storage-warning').innerHTML = esc(message) + (recoverable ? ' <button class="button small" data-action="recover">Download stored data</button>' : '');
  }
  function load() {
    try {
      storedRaw = localStorage.getItem(STORAGE_KEY);
      results = storedRaw ? Lab.parseBackup(storedRaw) : [];
      storageBlocked = false; $('#storage-warning').hidden = true;
      $('#storage-status').textContent = 'Saved in this browser';
    } catch (error) {
      storageWarning(storedRaw ? 'Saved data could not be read. It has been preserved. Download it for recovery; saving is disabled to prevent overwriting it.' : 'Browser storage is unavailable. Enable local storage or open the app using the local server in README.md.', !!storedRaw);
    }
  }
  function persist(next) {
    if (storageBlocked) throw new Error('Saving is disabled while browser storage needs attention.');
    if (next.length > 10000) throw new Error('This workspace supports up to 10,000 results. Export a backup before removing old records.');
    if (localStorage.getItem(STORAGE_KEY) !== storedRaw) throw new Error('Another tab changed the saved results. Reload this page before saving.');
    const raw = Lab.backup(next);
    try { localStorage.setItem(STORAGE_KEY, raw); } catch { throw new Error('Could not save: browser storage is unavailable or full. Your existing results are unchanged. Export a backup and free space.'); }
    storedRaw = raw; results = next;
    render();
  }
  function download(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function empty(title, body, action = true, symbol = '⌁') {
    return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">${symbol}</div><h3>${title}</h3><p>${body}</p>${action ? '<button class="button primary small" data-action="record">Record your first result</button>' : ''}</div>`;
  }
  function weights() {
    return `<div class="weight-list">${CRITERIA.map(c => `<div class="weight-row"><div><span>${c.name}</span><strong>${c.weight}%</strong></div><div class="bar"><span style="width:${c.weight}%"></span></div></div>`).join('')}</div>`;
  }
  function protocols() { return [...new Set(results.map(r => r.protocol))].sort(); }
  function options(values, selected = '') { return values.map(v => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v)}</option>`).join(''); }
  function modelName(g) { return `${g.model} · ${g.version} · ${g.protocol}`; }
  function leaderboard() {
    const groups = Lab.summarize(results);
    if (!groups.length) return empty('Your leaderboard starts with evidence', 'Run a challenge with an AI model, verify its output, then record what happened. No demo scores. No assumed winners.');
    return `<div class="table-wrap"><table><thead><tr><th scope="col">#</th><th scope="col">Model / version</th><th scope="col">Coverage</th><th scope="col">Runs</th><th scope="col">Score</th></tr></thead><tbody>${groups.map((g, i) => `<tr><td class="muted number">${String(groups.findIndex(x => (x.coverage === 5) === (g.coverage === 5) && Math.abs(x.score - g.score) < 1e-9) + 1).padStart(2, '0')}</td><td class="name-cell"><strong>${esc(g.model)}</strong><small>${esc(g.version)} <span class="subtle-divider">/</span> ${esc(g.protocol)}</small></td><td><span class="badge ${g.coverage < 5 ? 'neutral' : ''}">${g.coverage}/5 ${g.coverage < 5 ? 'provisional' : 'complete'}</span></td><td class="number">${g.runs.length}</td><td class="score-number number">${fmt(g.score)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderOverview() {
    const groups = Lab.summarize(results), tested = new Set(results.map(r => r.challenge)).size;
    const complete = groups.filter(g => g.coverage === 5);
    const models = new Set(results.map(r => JSON.stringify([r.model, r.version]))).size;
    $('#view-overview').innerHTML = `<div class="stats">
      <div class="stat"><span class="stat-symbol" aria-hidden="true">⌘</span><div class="stat-label">Models tested</div><div class="stat-value">${models.toString().padStart(2, '0')}</div><div class="stat-foot">Unique model versions</div></div>
      <div class="stat"><span class="stat-symbol" aria-hidden="true">≡</span><div class="stat-label">Recorded runs</div><div class="stat-value">${results.length.toString().padStart(2, '0')}</div><div class="stat-foot">Real, manually recorded results</div></div>
      <div class="stat"><span class="stat-symbol" aria-hidden="true">◈</span><div class="stat-label">Challenges tested</div><div class="stat-value">${tested.toString().padStart(2, '0')} <small>/ 05</small></div><div class="stat-foot">Across the challenge suite</div></div>
      <div class="stat"><span class="stat-symbol" aria-hidden="true">◎</span><div class="stat-label">Complete model suites</div><div class="stat-value">${complete.length.toString().padStart(2, '0')}</div><div class="stat-foot">All five tasks in one protocol</div></div>
    </div><div class="dashboard-grid"><div class="panel"><div class="panel-heading"><div><h2>Model leaderboard</h2><p>Challenge-balanced weighted scores</p></div><span class="badge neutral">${results.length ? 'RECORDED EVIDENCE' : 'AWAITING RESULTS'}</span></div>${leaderboard()}<div class="table-note">Complete suites rank first. Repeats are averaged per challenge; each challenge counts equally. Protocols are listed separately and may not be comparable.</div></div><div class="dashboard-aside"><div class="panel"><div class="panel-heading"><h2>Scoring framework</h2><span class="badge neutral">100%</span></div><div class="panel-body">${weights()}<div class="formula">Each criterion is rated 0–100.<br>Weighted total = Σ(score × weight).</div></div></div><div class="callout"><h3>Evidence before conclusions</h3><p>Preserve the prompt, generated code, and test output. Separate what you measured from how you rated it.</p><button class="text-button" data-action="methodology">Read the methodology</button></div></div></div>
    <div class="section-heading"><div><h2>Challenge suite</h2><p>The five tasks from your research plan</p></div><a class="text-button" href="#challenges">View all challenges</a></div><div class="challenge-strip">${CHALLENGES.map(c => {const count = results.filter(r => r.challenge === c.id).length;return `<button class="challenge-mini" data-action="challenge" data-id="${c.id}"><span class="challenge-number">${c.number} <span class="muted">/</span></span><strong>${c.title}</strong><small>${count ? `${count} recorded run${count === 1 ? '' : 's'}` : 'Not tested yet'}</small></button>`;}).join('')}</div>`;
  }
  function renderChallenges() {
    $('#view-challenges').innerHTML = `<div class="notice">The task descriptions below come from your README. Suggested checks are starting points; agree on exact prompts, fixtures, and tests before comparing models.</div><div class="challenges-grid">${CHALLENGES.map(c => `<article class="panel challenge-card" id="challenge-${c.id}"><span class="challenge-number">${c.number}</span><span class="challenge-category">${c.category}</span><h2>${c.title}</h2><p>${c.task}</p><div class="tiny-label">Suggested verification</div><ul>${c.checks.map(check => `<li>${check}</li>`).join('')}</ul><div class="card-actions"><button class="button small primary" data-action="record" data-challenge="${c.id}">Record a result</button><button class="button small" data-action="copy" data-id="${c.id}">Copy task description</button></div></article>`).join('')}</div>`;
  }
  function filteredResults() {
    const term = resultFilters.search.trim().toLowerCase();
    return results.filter(r => (!term || [r.model, r.version, r.protocol].some(s => s.toLowerCase().includes(term))) && (!resultFilters.challenge || r.challenge === resultFilters.challenge) && (!resultFilters.protocol || r.protocol === resultFilters.protocol)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }
  function renderResultTable() {
    const filtered = filteredResults();
    $('#filtered-count').textContent = `${filtered.length} of ${results.length} results`;
    $('#result-table').innerHTML = !results.length ? empty('A clean slate for real experiments', 'Record model versions, scores, and test evidence. Your results are saved locally in this browser.') : !filtered.length ? empty('No matching results', 'Try a different search or clear the filters.', false) : `<div class="table-wrap"><table><thead><tr><th scope="col">Model / version</th><th scope="col">Challenge</th><th scope="col">Test date</th><th scope="col">Score</th><th scope="col">Evidence</th><th scope="col">Record</th></tr></thead><tbody>${filtered.map(r => `<tr><td class="name-cell"><strong>${esc(r.model)}</strong><small>${esc(r.version)}</small><small>${esc(r.protocol)}</small></td><td>${challenge(r.challenge).title}</td><td class="number">${esc(r.date)}</td><td class="score-number number">${fmt(Lab.score(r.scores))}</td><td>${r.testsTotal === null ? '<span class="muted">Notes recorded</span>' : `${r.testsPassed}/${r.testsTotal} tests passed`}</td><td><button class="button small" data-action="detail" data-id="${esc(r.id)}">View</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderResults() {
    $('#view-results').innerHTML = `<div class="results-heading"><span class="muted" id="filtered-count"></span><div class="export-bar"><button class="button small" data-action="import">Import JSON</button><button class="button small" data-action="json">Export JSON</button><button class="button small" data-action="csv">Export CSV</button></div></div><div class="toolbar"><label class="search-label">Search models or protocols<input id="search" type="search" placeholder="Search results…" value="${esc(resultFilters.search)}"></label><label>Challenge<select id="challenge-filter"><option value="">All challenges</option>${CHALLENGES.map(c => `<option value="${c.id}" ${resultFilters.challenge === c.id ? 'selected' : ''}>${c.title}</option>`).join('')}</select></label><label>Protocol<select id="protocol-filter"><option value="">All protocols</option>${options(protocols(), resultFilters.protocol)}</select></label><button class="button" data-action="clear-filters">Clear</button></div><div class="panel" id="result-table"></div><p class="helper">Exports include all records, regardless of filters. JSON preserves a restorable backup; CSV is for analysis. Browser data is not synced and can be lost if you clear website data.</p>`;
    renderResultTable();
    $('#search').addEventListener('input', e => { resultFilters.search = e.target.value; renderResultTable(); });
    $('#challenge-filter').addEventListener('change', e => { resultFilters.challenge = e.target.value; renderResultTable(); });
    $('#protocol-filter').addEventListener('change', e => { resultFilters.protocol = e.target.value; renderResultTable(); });
  }
  function renderCompare() {
    const groups = Lab.summarize(results);
    if (groups.length < 2) { $('#view-compare').innerHTML = `<div class="panel">${empty('Put two model versions to the test', 'Record results for at least two model versions under the same protocol. Comparisons use only the challenges both have completed.', false, '⇄')}</div>`; return; }
    comparisonSelection = comparisonSelection.map((key, i) => groups.some(g => g.key === key) ? key : groups[Math.min(i, groups.length - 1)].key);
    const groupOptions = selected => groups.map(g => `<option value="${esc(g.key)}" ${g.key === selected ? 'selected' : ''}>${esc(modelName(g))}</option>`).join('');
    $('#view-compare').innerHTML = `<div class="compare-selects"><label>Model A<select id="compare-a">${groupOptions(comparisonSelection[0])}</select></label><span class="versus">VS</span><label>Model B<select id="compare-b">${groupOptions(comparisonSelection[1])}</select></label></div><div id="comparison-output"></div>`;
    const renderOutput = () => {
      const a = groups.find(g => g.key === comparisonSelection[0]), b = groups.find(g => g.key === comparisonSelection[1]);
      const comparison = Lab.compare(a, b);
      if (a.key === b.key || (a.model === b.model && a.version === b.version)) { $('#comparison-output').innerHTML = '<div class="notice">Select two different model versions to compare.</div>'; return; }
      if (!comparison) { $('#comparison-output').innerHTML = '<div class="notice">These records do not share a protocol and a tested challenge. Use identical test conditions and record at least one shared challenge before comparing.</div>'; return; }
      $('#comparison-output').innerHTML = `<div class="notice">${comparison.shared.length}/5 shared challenges · Protocol: ${esc(a.protocol)}. ${comparison.shared.length < 5 ? 'Partial comparison; this is not a complete benchmark.' : 'All five challenges are represented.'} Scores are descriptive, not proof of a general winner.</div><div class="comparison">${[a,b].map((g, i) => `<div class="panel comparison-card ${i ? 'secondary' : ''}"><div class="tiny-label">MODEL ${i ? 'B' : 'A'}</div><h3>${esc(g.model)}</h3><span class="muted">${esc(g.version)}</span><div class="comparison-score">${fmt(i ? comparison.b : comparison.a)} <small>/ 100</small></div><div class="weight-list">${comparison.criteria.map(c => {const value = i ? c.b : c.a; return `<div class="weight-row"><div><span>${c.name}</span><strong>${fmt(value)}</strong></div><div class="bar"><span style="width:${value}%"></span></div></div>`;}).join('')}</div></div>`).join('')}</div><div class="section-heading"><h2>Shared challenge breakdown</h2></div><div class="panel table-wrap"><table><thead><tr><th scope="col">Challenge</th><th scope="col">Model A</th><th scope="col">Model B</th><th scope="col">A − B</th></tr></thead><tbody>${comparison.shared.map(c => {const ca = a.challenges[c.id], cb = b.challenges[c.id], delta = ca.score - cb.score; return `<tr><td>${c.title}</td><td>${fmt(ca.score)}<small>${ca.count} run${ca.count === 1 ? '' : 's'}</small></td><td>${fmt(cb.score)}<small>${cb.count} run${cb.count === 1 ? '' : 's'}</small></td><td>${delta > 0 ? '+' : ''}${fmt(delta)}</td></tr>`;}).join('')}</tbody></table></div><p class="helper">Repeated runs are averaged within each challenge. Shared challenges count equally. Verify recorded environments and assistance are equivalent; a matching protocol label alone does not establish fairness.</p>`;
    };
    ['a', 'b'].forEach((side, i) => $(`#compare-${side}`).addEventListener('change', e => { comparisonSelection[i] = e.target.value; renderOutput(); }));
    renderOutput();
  }
  function renderMethodology() {
    $('#view-methodology').innerHTML = `<div class="method-grid"><div class="panel"><div class="panel-heading"><h2>The evaluation criteria</h2><span class="badge">README FRAMEWORK</span></div><div class="prose">${CRITERIA.map(c => `<div class="criterion"><h3>${c.name}<span>${c.weight}%</span></h3><p>${c.description}</p></div>`).join('')}</div></div><div class="panel prose"><h3>A repeatable experiment</h3><ol><li>Choose a challenge and preserve its exact prompt, starter code, data, and test suite.</li><li>Keep tools, time limits, retry budgets, and human assistance identical. Assign a shared protocol ID.</li><li>Record the model version, date, and environment for every attempt, including failed attempts.</li><li>Run the output. Preserve generated code and test logs outside this dashboard and record their references.</li><li>Enter observed evidence separately from your ratings and scoring rationale.</li></ol></div><div class="panel prose"><h3>How scores are calculated</h3><p>Rate every criterion from 0 to 100. The run score is correctness × 0.40 + instruction following × 0.25 + reliability × 0.20 + code quality × 0.15. Zero is a valid rating. Missing ratings cannot be saved.</p><p>Within each model version and protocol, repeated runs are averaged per challenge. The leaderboard then averages the available challenge scores equally. Missing challenges are omitted and coverage stays visible.</p><p>Complete five-challenge suites appear first, followed by provisional entries; each section is sorted by score. Equal scores are ties. Comparisons use only shared challenges in the same protocol. Displayed scores are rounded to one decimal; calculations retain full precision.</p></div><div class="panel prose"><h3>What the numbers can tell you</h3><p>The four ratings are evaluator judgments supported by evidence. Optional passed/total test counts are recorded measurements and do not automatically determine a criterion score. A test pass rate alone cannot measure instruction following or code quality.</p><p>Small samples, different test suites, human assistance, and subjective ratings limit conclusions. Keep your assessment rules consistent and record limitations. This app records your experiments; it does not call AI models or execute their generated code.</p><h3>Your data stays local</h3><p>Results are saved in this browser on this device. Export JSON regularly for backup and import it to another browser. CSV supports spreadsheet analysis. Publishing the dashboard does not publish your saved results.</p><button class="button small" data-action="json">Export JSON backup</button></div></div>`;
  }
  function render() {
    $('#result-count').textContent = results.length;
    $('#model-options').innerHTML = options([...new Set(results.map(r => r.model))].sort());
    $('#protocol-options').innerHTML = options(protocols());
    renderOverview(); renderChallenges(); renderResults(); renderCompare(); renderMethodology();
  }
  function navigate() {
    const view = location.hash.slice(1).split('/')[0];
    const name = Object.hasOwn(views, view) ? view : 'overview';
    for (const [id, meta] of Object.entries(views)) {
      $(`#view-${id}`).hidden = id !== name;
      const link = $(`[data-view="${id}"]`); link.classList.toggle('active', id === name);
      if (id === name) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      if (id === name) { $('#page-title').textContent = meta[0]; $('#page-description').textContent = meta[1]; $('#breadcrumb').textContent = meta[2]; }
    }
  }
  function openForm(id = null, challengeId = null) {
    editingId = id; form.reset(); $('#form-error').hidden = true;
    $('#dialog-title').textContent = id ? 'Edit result' : 'Record a result';
    const r = results.find(r => r.id === id);
    if (r) {
      for (const [key, value] of Object.entries(r)) if (form.elements.namedItem(key)) form.elements.namedItem(key).value = value ?? '';
      for (const c of CRITERIA) form.elements.namedItem(c.id).value = r.scores[c.id];
    } else {
      const now = new Date(); form.elements.date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      if (challengeId) form.elements.challenge.value = challengeId;
    }
    updatePreview(); $('#result-dialog').showModal(); $('#result-dialog').scrollTop = 0;
  }
  function updatePreview() {
    const values = Object.fromEntries(CRITERIA.map(c => [c.id, form.elements.namedItem(c.id).value]));
    $('#score-preview').textContent = Object.values(values).every(v => v !== '' && Number(v) >= 0 && Number(v) <= 100) ? fmt(Lab.score(Object.fromEntries(Object.entries(values).map(([k,v]) => [k, Number(v)])))) : '—';
  }
  function showDetail(id) {
    const r = results.find(r => r.id === id); if (!r) return;
    $('#detail-content').innerHTML = `<div class="dialog-heading"><div><div class="eyebrow">RECORDED RESULT</div><h2 id="detail-title">${esc(r.model)}</h2></div><button class="icon-button" data-action="close-detail" aria-label="Close result details">×</button></div><div class="detail-meta"><div><small>Version</small>${esc(r.version)}</div><div><small>Test date</small>${r.date}</div><div><small>Challenge</small>${challenge(r.challenge).title}</div><div><small>Protocol</small>${esc(r.protocol)}</div></div><div class="score-preview"><span>Weighted score</span><strong>${fmt(Lab.score(r.scores))}<small> / 100</small></strong></div><div class="detail-scores">${CRITERIA.map(c => `<div>${c.name}<strong>${fmt(r.scores[c.id])}</strong>${c.weight}% weight</div>`).join('')}</div><p class="helper">Tests: ${r.testsTotal === null ? 'Counts not recorded' : `${r.testsPassed} passed out of ${r.testsTotal}`}</p>${[['environment','Environment & conditions'],['prompt','Exact task prompt'],['evidence','Observed evidence'],['judgment','Scoring rationale'],['artifact','Code & test artifact references'],['notes','Limitations & notes']].map(([key,label]) => `<section class="detail-section"><h3>${label}</h3><div class="detail-text">${esc(r[key] || 'Not recorded')}</div></section>`).join('')}<div class="dialog-actions"><button class="button destructive" data-action="delete" data-id="${esc(id)}">Delete</button><button class="button primary" data-action="edit" data-id="${esc(id)}">Edit result</button></div>`;
    $('#detail-dialog').showModal(); $('#detail-dialog').scrollTop = 0;
  }
  form.elements.challenge.innerHTML = '<option value="" disabled selected>Select a challenge</option>' + CHALLENGES.map(c => `<option value="${c.id}">${c.number} · ${c.title}</option>`).join('');
  $('#score-inputs').innerHTML = CRITERIA.map(c => `<div class="score-input-row"><label for="score-${c.id}"><strong>${c.name} <span class="badge neutral">${c.weight}%</span></strong><small>${c.description}</small></label><input id="score-${c.id}" name="${c.id}" type="number" required min="0" max="100" step="0.1" placeholder="—" aria-label="${c.name} score"></div>`).join('');
  form.addEventListener('input', updatePreview);
  form.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const fields = Object.fromEntries(new FormData(form));
      const previous = results.find(r => r.id === editingId), now = new Date().toISOString();
      if (editingId && !previous) throw new Error('This result was removed in another tab. Close this form and reload.');
      const id = previous?.id || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'run-' + Date.now() + '-' + Array.from(crypto.getRandomValues(new Uint32Array(2))).join('-'));
      const record = Lab.validate({ ...fields, id, createdAt: previous?.createdAt || now, updatedAt: now, scores: Object.fromEntries(CRITERIA.map(c => [c.id, fields[c.id] === '' ? null : Number(fields[c.id])])), testsPassed: fields.testsPassed === '' ? null : Number(fields.testsPassed), testsTotal: fields.testsTotal === '' ? null : Number(fields.testsTotal) });
      persist(editingId ? results.map(r => r.id === editingId ? record : r) : [...results, record]);
      $('#result-dialog').close(); toast(editingId ? 'Result updated and saved locally.' : 'Result saved locally.');
    } catch (error) { $('#form-error').textContent = error.message; $('#form-error').hidden = false; $('#form-error').scrollIntoView({ block: 'nearest' }); }
  });
  $('#record-button').addEventListener('click', () => openForm());
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => $('#result-dialog').close()));
  document.addEventListener('click', async e => {
    const button = e.target.closest('[data-action]'); if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'record') openForm(null, button.dataset.challenge);
    if (action === 'methodology') location.hash = 'methodology';
    if (action === 'challenge') { location.hash = 'challenges'; navigate(); $(`#challenge-${id}`).scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    if (action === 'detail') showDetail(id);
    if (action === 'close-detail') $('#detail-dialog').close();
    if (action === 'edit') { $('#detail-dialog').close(); openForm(id); }
    if (action === 'delete') { deletingId = id; $('#delete-dialog').showModal(); }
    if (action === 'clear-filters') { resultFilters = { search: '', challenge: '', protocol: '' }; renderResults(); }
    if (action === 'copy') {
      try { await navigator.clipboard.writeText(challenge(id).task); toast('Task description copied.'); }
      catch { toast('Copy unavailable here. Select and copy the task description above.'); }
    }
    if (action === 'json' || action === 'csv') { download(action === 'json' ? Lab.backup(results) : Lab.csv(results), `agent-lab-${new Date().toISOString().slice(0,10)}.${action}`, action === 'json' ? 'application/json' : 'text/csv;charset=utf-8'); toast(`Exported all ${results.length} results.`); }
    if (action === 'import') $('#import-file').click();
    if (action === 'recover') download(storedRaw || '', 'agent-lab-recovery.txt', 'text/plain');
  });
  $('#cancel-delete').addEventListener('click', () => $('#delete-dialog').close());
  $('#confirm-delete').addEventListener('click', () => {
    try { persist(results.filter(r => r.id !== deletingId)); $('#delete-dialog').close(); $('#detail-dialog').close(); toast('Result deleted.'); }
    catch (error) { $('#delete-dialog').close(); toast(error.message); }
  });
  $('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 20 MB.');
      const imported = Lab.parseBackup(await file.text()), existing = new Map(results.map(r => [r.id, r]));
      const additions = [];
      for (const r of imported) {
        if (existing.has(r.id)) {
          if (JSON.stringify(existing.get(r.id)) !== JSON.stringify(r)) throw new Error('A result ID conflicts with an existing record. Nothing was imported. Review the records before merging.');
        } else additions.push(r);
      }
      persist([...results, ...additions]); toast(`Imported ${additions.length} results; skipped ${imported.length - additions.length} identical records.`);
    } catch (error) { toast('Import failed: ' + error.message); }
    finally { e.target.value = ''; }
  });
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY || e.key === null) {
      if ($('#result-dialog').open) { $('#form-error').textContent = 'Saved results changed in another tab. Close this form and reload before editing.'; $('#form-error').hidden = false; storageBlocked = true; toast('Another tab changed your results. Reload before saving.'); }
      else { load(); render(); toast('Results refreshed from another tab.'); }
    }
  });
  window.addEventListener('hashchange', navigate);
  load(); render(); navigate();
})();
