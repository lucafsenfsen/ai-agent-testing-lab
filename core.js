/* Shared scoring, validation, and export logic. No network calls or seeded results. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Lab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CRITERIA = [
    { id: 'correctness', name: 'Correctness', weight: 40, description: 'Does the application work and pass its tests?' },
    { id: 'instructions', name: 'Instruction following', weight: 25, description: 'Were the requested features implemented?' },
    { id: 'reliability', name: 'Reliability', weight: 20, description: 'Does the application handle errors and unexpected inputs?' },
    { id: 'quality', name: 'Code quality', weight: 15, description: 'Is the code readable and maintainable?' }
  ];
  const CHALLENGES = [
    { id: 'todo', number: '01', title: 'Responsive to-do app', task: 'Build a responsive to-do application.', category: 'Application development', checks: ['Verify the requested task operations.', 'Check small and large screen layouts.', 'Test empty and unexpected input.'] },
    { id: 'calculator', number: '02', title: 'Debug a calculator', task: 'Debug a broken calculator.', category: 'Debugging', checks: ['Preserve the original broken source.', 'Reproduce each reported bug before fixing it.', 'Run arithmetic and edge-case regression checks.'] },
    { id: 'memory', number: '03', title: 'Browser memory game', task: 'Create a browser-based memory game.', category: 'Interactive development', checks: ['Verify matching and non-matching pairs.', 'Test repeated clicks and game completion.', 'Check that restarting resets the game.'] },
    { id: 'dashboard', number: '04', title: 'Data dashboard', task: 'Build a simple dashboard from sample data.', category: 'Data & visualization', checks: ['Use the same supplied dataset for every model.', 'Check displayed values against the source data.', 'Test empty data and responsive layouts.'] },
    { id: 'improve', number: '05', title: 'Improve without regressions', task: 'Improve an existing application without breaking its features.', category: 'Maintenance', checks: ['Use an identical starting application.', 'Record the baseline behavior and requested changes.', 'Rerun existing tests after the improvements.'] }
  ];
  const VERSION = 1;
  const STORAGE_KEY = 'ai-agent-testing-lab:v1';
  function score(scores) {
    return CRITERIA.reduce((sum, c) => sum + scores[c.id] * c.weight / 100, 0);
  }
  function textField(value, name, max, required = true) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${name} is required and must be at most ${max} characters.`);
    return value.trim();
  }
  function validate(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid result record.');
    const result = {};
    for (const [key, max, required] of [
      ['id', 100, true], ['model', 120, true], ['version', 120, true], ['protocol', 120, true],
      ['environment', 3000, true], ['prompt', 12000, true], ['evidence', 20000, true],
      ['judgment', 12000, true], ['artifact', 3000, false], ['notes', 12000, false]
    ]) result[key] = textField(record[key], key, max, required);
    if (!CHALLENGES.some(c => c.id === record.challenge)) throw new Error('Unknown challenge.');
    result.challenge = record.challenge;
    if (typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) || !Number.isFinite(Date.parse(record.date)) || new Date(record.date).toISOString().slice(0, 10) !== record.date) throw new Error('Enter a valid test date.');
    result.date = record.date;
    for (const key of ['createdAt', 'updatedAt']) {
      if (typeof record[key] !== 'string' || !Number.isFinite(Date.parse(record[key]))) throw new Error('Invalid result timestamp.');
      result[key] = record[key];
    }
    result.scores = {};
    for (const c of CRITERIA) {
      const n = record.scores?.[c.id];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${c.name} must be a number from 0 to 100.`);
      result.scores[c.id] = n;
    }
    for (const key of ['testsPassed', 'testsTotal']) {
      const n = record[key];
      if (n !== null && (!Number.isSafeInteger(n) || n < 0)) throw new Error('Test counts must be nonnegative whole numbers or both left blank.');
      result[key] = n;
    }
    if ((result.testsPassed === null) !== (result.testsTotal === null) || (result.testsTotal !== null && result.testsPassed > result.testsTotal)) throw new Error('Enter both test counts; passed cannot exceed total.');
    return result;
  }
  function parseBackup(raw) {
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('This is not valid JSON.'); }
    if (data?.schemaVersion !== VERSION || !Array.isArray(data.results)) throw new Error('Use a version 1 AI Agent Testing Lab JSON backup.');
    if (data.results.length > 10000) throw new Error('A backup may contain at most 10,000 results.');
    const results = data.results.map(validate);
    if (new Set(results.map(r => r.id)).size !== results.length) throw new Error('Duplicate result IDs in backup.');
    return results;
  }
  function backup(results) {
    return JSON.stringify({ schemaVersion: VERSION, exportedAt: new Date().toISOString(), criteria: CRITERIA, results }, null, 2);
  }
  function groupKey(r) { return JSON.stringify([r.model, r.version, r.protocol]); }
  function average(values) { return values.reduce((a, b) => a + b, 0) / values.length; }
  // Every observed challenge gets equal weight, irrespective of repetition count.
  function summarize(results) {
    const groups = new Map();
    for (const r of results) {
      const key = groupKey(r);
      if (!groups.has(key)) groups.set(key, { key, model: r.model, version: r.version, protocol: r.protocol, runs: [] });
      groups.get(key).runs.push(r);
    }
    return [...groups.values()].map(g => {
      const challenges = {};
      for (const c of CHALLENGES) {
        const runs = g.runs.filter(r => r.challenge === c.id);
        if (runs.length) challenges[c.id] = { score: average(runs.map(r => score(r.scores))), count: runs.length, scores: Object.fromEntries(CRITERIA.map(k => [k.id, average(runs.map(r => r.scores[k.id]))])) };
      }
      const values = Object.values(challenges);
      return { ...g, challenges, coverage: values.length, score: average(values.map(c => c.score)), scores: Object.fromEntries(CRITERIA.map(c => [c.id, average(values.map(v => v.scores[c.id]))])) };
    }).sort((a, b) => (b.coverage === 5) - (a.coverage === 5) || b.score - a.score || a.model.localeCompare(b.model));
  }
  function compare(a, b) {
    if (!a || !b || a.protocol !== b.protocol) return null;
    const shared = CHALLENGES.filter(c => a.challenges[c.id] && b.challenges[c.id]);
    if (!shared.length) return null;
    return { shared, a: average(shared.map(c => a.challenges[c.id].score)), b: average(shared.map(c => b.challenges[c.id].score)), criteria: CRITERIA.map(c => ({ ...c, a: average(shared.map(t => a.challenges[t.id].scores[c.id])), b: average(shared.map(t => b.challenges[t.id].scores[c.id])) })) };
  }
  function csvCell(value) {
    let s = value == null ? '' : String(value);
    // Prevent spreadsheet formula execution when opening user-entered text.
    if (/^[\s]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csv(results) {
    const columns = ['id', 'model', 'version', 'protocol', 'challenge', 'date', 'weightedScore', ...CRITERIA.map(c => c.id), 'testsPassed', 'testsTotal', 'environment', 'prompt', 'evidence', 'judgment', 'artifact', 'notes', 'createdAt', 'updatedAt'];
    const rows = results.map(r => ({ ...r, ...r.scores, weightedScore: score(r.scores).toFixed(2) }));
    return '\uFEFF' + [columns, ...rows.map(row => columns.map(k => row[k]))].map(row => row.map(csvCell).join(',')).join('\r\n');
  }
  return { CRITERIA, CHALLENGES, VERSION, STORAGE_KEY, score, validate, parseBackup, backup, summarize, compare, csv, groupKey };
});
