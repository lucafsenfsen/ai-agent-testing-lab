'use strict';
// Export only reviewed, passing run evidence. Raw traces and path-bearing logs stay local.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validate } = require('../report-format.js');
const root = path.resolve(__dirname, '..');
function publicReport(raw) {
  const r = validate(JSON.parse(raw));
  if (r.status !== 'passed' || r.errors.length || r.summary.failed || r.summary.error ||
      r.summary.skipped || !r.originalAppUnchanged) {
    throw new Error('This exporter accepts complete passing runs only. Review failures separately; never discard them to claim a pass.');
  }
  const protocols = {'phase1-todo-v1':{evaluation:25,dashboard:10}, 'phase1-todo-v1.1':{evaluation:25,dashboard:12}};
  const expected = protocols[r.protocol]?.[r.scope];
  if (!expected || r.exitCode !== 0 || r.environment.workers !== 1 || r.environment.retries !== 0 ||
      !Array.isArray(r.command) || r.command.length < 3 || r.command[0] !== 'node' || r.command[1] !== 'automation/run.cjs' ||
      r.command[2] !== r.scope || r.command.slice(3).some(arg => arg !== '--headed')) {
    throw new Error('Expected a known, complete Phase 1 protocol with a successful exit and no retries.');
  }
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname,'original-app.sha256.json'),'utf8'));
  for (const recorded of [r.sourceHashes, r.sourceHashesAfter]) {
    if (!recorded || Object.keys(recorded).length !== Object.keys(baseline).length ||
        Object.entries(baseline).some(([file,hash]) => recorded[file] !== hash)) throw new Error('Original source hashes do not match the preserved baseline.');
  }
  if (!r.suiteHashes || !Object.keys(r.suiteHashes).length ||
      !Object.values(r.suiteHashes).every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))) throw new Error('Missing or invalid suite hashes.');
  if (r.tests.length !== expected * 2 || ['chromium','webkit'].some(engine => r.tests.filter(t => t.project === engine).length !== expected) ||
      r.command?.some(arg => /^--(?:grep|project)/.test(arg))) throw new Error('Expected the full Phase 1 two-browser suite; partial runs cannot replace published evidence.');
  const allowedAttachments = new Set(['browser-environment', 'page-errors']);
  const result = {
    schemaVersion:r.schemaVersion, kind:r.kind, protocol:r.protocol, scope:r.scope,
    runId:r.runId, startedAt:r.startedAt, finishedAt:r.finishedAt,
    status:r.status, target:r.target, environment:r.environment, command:r.command,
    sourceHashes:r.sourceHashes, sourceHashesAfter:r.sourceHashesAfter, suiteHashes:r.suiteHashes,
    originalAppUnchanged:r.originalAppUnchanged, durationMs:r.durationMs, exitCode:r.exitCode,
    summary:r.summary, errors:[], limitations:r.limitations,
    tests:r.tests.map(t => {
      if (t.attempts.length !== 1 || t.attempts[0].status !== 'passed' || t.attempts[0].retry !== 0 || t.attempts[0].errors.length) {
        throw new Error('Expected exactly one successful attempt per test, without retries or errors.');
      }
      return {id:t.id, title:t.title, project:t.project, file:t.file, line:t.line,
        viewport:t.viewport, status:t.status, outcome:t.outcome,
        attempts:t.attempts.map(a => ({status:a.status, durationMs:a.durationMs, retry:a.retry, errors:[],
          attachments:a.attachments.filter(v => allowedAttachments.has(v.name) && v.body !== undefined)
            .map(v => ({name:v.name, contentType:v.contentType, body:v.body}))}))};
    }),
    publicExport:{sourceReportSha256:crypto.createHash('sha256').update(raw).digest('hex'),
      omitted:['ephemeral local server URL','screenshots and their file references','raw Playwright JSON','console logs','traces','input snapshots'],
      note:'Derived from an actual completed run. Test titles, outcomes, timings, environment and source hashes are retained. No scores are inferred. Raw evidence stays local.'}
  };
  validate(result);
  const text = JSON.stringify(result, null, 2) + '\n';
  if (/\/Users\/|\/home\/|[A-Za-z]:\\Users\\|https?:\/\/[^\s"/]*:[^\s"/]*@|-----BEGIN .*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|sk-(?:proj-)?[A-Za-z0-9_-]{20,}/.test(text)) {
    throw new Error('Possible private path or credential in public report. Review locally before publishing.');
  }
  return text;
}
module.exports = {publicReport};
if (require.main === module) {
  const [scope, source, destination] = process.argv.slice(2);
  if (!['evaluation','dashboard'].includes(scope) || !source || !destination) throw new Error('Usage: node automation/export-public.cjs evaluation|dashboard source-report.json destination.json');
  const raw = fs.readFileSync(path.resolve(root,source),'utf8');
  if (JSON.parse(raw).scope !== scope) throw new Error('Report scope mismatch.');
  const output = path.resolve(root,destination);
  fs.mkdirSync(path.dirname(output), {recursive:true});
  fs.writeFileSync(output,publicReport(raw));
  console.log('Wrote reviewed public-format report:',path.relative(root,output));
}
