'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
function hashes(files) {
  return Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
}
function classify(result) {
  if (result.status === 'passed') return 'passed';
  if (result.status === 'skipped') return 'skipped';
  if (result.status === 'interrupted') return 'error';
  return result.errors?.some(e => /expect\(|AssertionError/.test(e.message || '')) ? 'failed' : 'error';
}
function summarize(tests) {
  const counts = {total:tests.length, passed:0, failed:0, error:0, skipped:0};
  for (const test of tests) counts[test.status]++;
  return counts;
}
function writeReport(dir, report) {
  report.summary = summarize(report.tests);
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const pointer = path.join(root, 'reports', `latest-${report.scope}.json`);
  const temp = `${pointer}.${report.runId}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({schemaVersion:1, report:`reports/${report.runId}/report.json`}, null, 2)+'\n');
  fs.renameSync(temp, pointer);
}
module.exports = { root, hashes, classify, summarize, writeReport };
