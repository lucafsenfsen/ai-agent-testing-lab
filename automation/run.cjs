'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { start } = require('./server.cjs');
const { root, hashes, writeReport } = require('./report.cjs');
function execute(args, env = process.env, log) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, {cwd:root, env, stdio:['ignore','pipe','pipe']});
    child.stdout.on('data', data => {process.stdout.write(data); log?.write(data);});
    child.stderr.on('data', data => {process.stderr.write(data); log?.write(data);});
    child.on('error', error => { console.error(error); resolve(1); });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}
async function run(scope, baseURL, args) {
  const runId = `${new Date().toISOString().replace(/[:.]/g,'-')}-${scope}-${randomUUID().slice(0,8)}`;
  const dir = path.join(root, 'reports', runId);
  fs.mkdirSync(dir, {recursive:true});
  const original = JSON.parse(fs.readFileSync(path.join(__dirname,'original-app.sha256.json')));
  const appHashes = hashes(Object.keys(original));
  const suiteFiles = ['package.json','package-lock.json','playwright.config.cjs','automation/run.cjs',
    'automation/server.cjs','automation/export-public.cjs','automation/report.cjs','automation/reporter.cjs','automation/original-app.sha256.json',
    'tests/e2e/fixtures.cjs', 'tests/e2e/todo.spec.cjs', 'tests/e2e/dashboard.spec.cjs', 'automation/lab.sh',
    'tests/core.test.cjs','tests/report.test.cjs','tests/server.test.cjs','release-files.txt','automated-reports.js','report-format.js',
    'index.html','styles.css','app.js','core.js'];
  const report = {schemaVersion:1, kind:'ai-agent-lab-automated', protocol:'phase1-todo-v1.1', scope, runId,
    startedAt:new Date().toISOString(), status:'error',
    target:scope === 'evaluation' ? 'Experiments/001-todo-gpt6/index.html' : 'index.html',
    environment:{node:process.version, platform:os.platform(), arch:os.arch(), osRelease:os.release(),
      playwright:require('@playwright/test/package.json').version, locale:'en-US', timezone:'Europe/Zurich', workers:1, retries:0},
    command:['node','automation/run.cjs',scope,...args], baseURL,
    sourceHashes:appHashes, suiteHashes:hashes(suiteFiles),
    originalAppUnchanged:JSON.stringify(appHashes) === JSON.stringify(original),
    tests:[], errors:[], limitations:['Post-hoc tests of one preserved app; not a new model generation or an official benchmark.',
      'Browser engines and viewport checks do not establish full accessibility or actual Safari/device compatibility.']};
  // Preserve the exact runnable inputs for this attempt, including unsuccessful attempts.
  for (const file of new Set([...suiteFiles, ...Object.keys(original), 'results/experiment-001/evaluation.json', 'results/experiment-001/dashboard-qa.json'])) {
    const dest = path.join(dir, 'inputs', file);
    fs.mkdirSync(path.dirname(dest), {recursive:true});
    fs.copyFileSync(path.join(root, file), dest);
  }
  fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(report,null,2)+'\n');
  const log = fs.createWriteStream(path.join(dir,'console.log'));
  let code = await execute([require.resolve('@playwright/test/cli'), 'test', ...args],
    {...process.env, LAB_SCOPE:scope, LAB_BASE_URL:baseURL, LAB_RUN_DIR:dir}, log);
  log.end();
  const output = path.join(dir,'report.json');
  const final = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output)) : report;
  if (!fs.existsSync(output)) final.errors.push({message:'Runner did not produce a report; inspect console.log (setup, configuration, or process error).'});
  final.sourceHashesAfter = hashes(Object.keys(original));
  final.originalAppUnchanged = final.originalAppUnchanged && JSON.stringify(final.sourceHashesAfter) === JSON.stringify(original);
  final.finishedAt ||= new Date().toISOString();
  if (!final.originalAppUnchanged) { final.errors.push({message:'Original app hash mismatch. Results do not verify the preserved baseline.'}); code = 1; }
  if (code || final.errors.length) { if (final.status === 'passed' || !final.tests.length) final.status = 'error'; code ||= 1; }
  final.exitCode = code;
  writeReport(dir, final);
  console.log(`\nReport: reports/${runId}/report.json\n`);
  return code;
}
(async () => {
  const scope = process.argv[2] || 'all';
  if (!['all','evaluation','dashboard'].includes(scope)) throw new Error('Scope must be all, evaluation, or dashboard.');
  const args = process.argv.slice(3);
  if (args.some(arg => !/^--(?:project=(?:chromium|webkit)|headed|grep=.+)$/.test(arg))) throw new Error('Supported options: --project=chromium, --project=webkit, --headed, --grep=pattern');
  let code = 0;
  if (scope === 'all') {
    fs.mkdirSync(path.join(root,'reports'),{recursive:true});
    const log = fs.createWriteStream(path.join(root,'reports',`unit-${Date.now()}.log`));
    code = await execute(['--test','tests/core.test.cjs','tests/report.test.cjs','tests/server.test.cjs'], process.env, log);
    log.end();
  }
  const server = await start(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}/`;
    for (const name of scope === 'all' ? ['evaluation','dashboard'] : [scope]) code = (await run(name,base,args)) || code;
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  process.exitCode = code;
})().catch(error => {console.error(error); process.exitCode=1;});
