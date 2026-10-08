'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Lab = require('../core.js');
// Software-test fixtures only. These are never loaded into the application.
const fixture = (changes = {}) => ({
  id: 'isolated-unit-test', model: 'TEST FIXTURE A', version: 'test-only', protocol: 'unit-test-only', challenge: 'todo', date: '2026-10-08',
  environment: 'Isolated software test', prompt: 'Validation fixture, not a benchmark', evidence: 'Software-test fixture only', judgment: 'Arithmetic assertion only', artifact: '', notes: '',
  scores: { correctness: 80, instructions: 60, reliability: 40, quality: 20 }, testsPassed: 2, testsTotal: 3,
  createdAt: '2026-10-08T10:00:00.000Z', updatedAt: '2026-10-08T10:00:00.000Z', ...changes
});
const scores = n => Object.fromEntries(Lab.CRITERIA.map(c => [c.id, n]));
test('README defines exactly five challenges and weights totaling 100', () => {
  assert.equal(Lab.CHALLENGES.length, 5); assert.equal(Lab.CRITERIA.reduce((n,c) => n+c.weight,0),100);
  assert.deepEqual(Lab.CRITERIA.map(c => c.weight), [40,25,20,15]);
});
test('weighted score uses actual weighted arithmetic, including zero', () => {
  assert.equal(Lab.score(fixture().scores), 58); assert.equal(Lab.score(scores(0)), 0); assert.equal(Lab.score(scores(100)), 100);
});
test('validates real record shape and trims text', () => { assert.equal(Lab.validate(fixture({model: '  TEST  '})).model,'TEST'); });
test('rejects missing, nonnumeric, infinite, and out-of-range criterion scores', () => {
  for (const bad of [undefined, null, '', '80', NaN, Infinity, -1, 101]) assert.throws(() => Lab.validate(fixture({scores:{...fixture().scores,correctness:bad}})));
});
test('rejects incomplete identity and evidence', () => {
  for (const field of ['model','version','protocol','environment','prompt','evidence','judgment']) assert.throws(() => Lab.validate(fixture({[field]:' '})));
});
test('rejects unknown challenges and impossible calendar dates', () => {
  assert.throws(() => Lab.validate(fixture({challenge:'unknown'})));
  for (const date of ['2026-02-30','2026-13-01','bad']) assert.throws(() => Lab.validate(fixture({date})));
});
test('measured counts must be whole, paired, and consistent', () => {
  for (const [testsPassed,testsTotal] of [[null,1],[1,null],[2,1],[-1,3],[1.5,3]]) assert.throws(() => Lab.validate(fixture({testsPassed,testsTotal})));
  assert.equal(Lab.validate(fixture({testsPassed:null,testsTotal:null})).testsPassed,null);
  assert.equal(Lab.validate(fixture({testsPassed:0,testsTotal:0})).testsTotal,0);
});
test('JSON export/import round trip preserves all recorded fields', () => { assert.deepEqual(Lab.parseBackup(Lab.backup([fixture()])),[fixture()]); });
test('malformed, unsupported, duplicate, or invalid backups reject atomically', () => {
  for (const raw of ['oops','{}',JSON.stringify({schemaVersion:2,results:[]}),Lab.backup([fixture(),fixture()]),Lab.backup([fixture({model:''})])]) assert.throws(() => Lab.parseBackup(raw));
});
test('repeat counts cannot overweight a single challenge', () => {
  const rows = Array.from({length:9},(_,i) => fixture({id:`x${i}`,scores:scores(100)})); rows.push(fixture({id:'y',challenge:'calculator',scores:scores(0)}));
  const [g] = Lab.summarize(rows); assert.equal(g.score,50); assert.equal(g.coverage,2); assert.equal(g.runs.length,10);
});
test('different versions and protocols remain separate', () => { assert.equal(Lab.summarize([fixture(),fixture({version:'other'}),fixture({protocol:'other'})]).length,3); });
test('complete suites sort before provisional entries; empty data produces no leaderboard', () => {
  const full = Lab.CHALLENGES.map(c => fixture({id:c.id,challenge:c.id,scores:scores(1)}));
  const rows = Lab.summarize([...full,fixture({model:'TEST FIXTURE B',scores:scores(100)})]);
  assert.equal(rows[0].coverage,5); assert.equal(rows[0].score,1); assert.deepEqual(Lab.summarize([]),[]);
});
test('comparison uses only shared challenges, and refuses cross-protocol comparisons', () => {
  const groups = Lab.summarize([fixture({scores:scores(10)}),fixture({challenge:'memory',scores:scores(100)}),fixture({model:'TEST FIXTURE B',scores:scores(30)})]);
  const a = groups.find(g=>g.model==='TEST FIXTURE A'), b = groups.find(g=>g.model==='TEST FIXTURE B');
  const comparison = Lab.compare(a,b); assert.equal(comparison.shared.length,1); assert.equal(comparison.a,10); assert.equal(comparison.b,30);
  assert.equal(Lab.compare(a,{...b,protocol:'other'}),null); assert.equal(Lab.compare(null,b),null);
});
test('CSV escapes quotes, preserves multiline evidence, and neutralizes formulas', () => {
  const csv = Lab.csv([fixture({model:'=HYPERLINK("bad")',evidence:'first, "quote"\nsecond'})]);
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"')); assert.ok(csv.includes('"first, ""quote""\nsecond"'));
  assert.ok(csv.includes('"58.00"')); assert.equal(Lab.csv([]).split('\r\n').length,1);
});
