'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { classify, writeReport } = require('./report.cjs');
class Reporter {
  constructor() {
    this.dir = process.env.LAB_RUN_DIR;
    this.report = JSON.parse(fs.readFileSync(path.join(this.dir, 'metadata.json'), 'utf8'));
    this.entries = new Map();
    this.report.tests = [];
    this.report.errors = [];
  }
  onBegin(config, suite) {
    for (const test of suite.allTests()) {
      const project = test.parent.project();
      this.entries.set(test.id, {id:test.id, title:test.title, project:project.name,
        file:path.relative(config.rootDir, test.location.file), line:test.location.line,
        viewport:project.use.viewport, status:'skipped', outcome:'not-run', attempts:[]});
    }
  }
  onTestEnd(test, result) {
    const entry = this.entries.get(test.id);
    entry.status = classify(result);
    entry.outcome = test.outcome();
    entry.attempts.push({status:result.status, durationMs:result.duration, retry:result.retry,
      errors:result.errors.map(e => ({message:e.message || String(e), stack:e.stack || null})),
      attachments:result.attachments.map(a => ({name:a.name, contentType:a.contentType,
        ...(a.path ? {path:path.relative(this.dir, a.path)} : a.contentType === 'image/png' ? this.saveImage(test.id, result.retry, a) : {body:a.body?.toString('utf8') || ''})}))});
  }
  saveImage(id, retry, attachment) {
    const relative = `evidence/${id}-${retry}-${attachment.name}.png`;
    fs.mkdirSync(path.join(this.dir, 'evidence'), {recursive:true});
    fs.writeFileSync(path.join(this.dir, relative), attachment.body);
    return {path:relative};
  }
  onError(error) { this.report.errors.push({message:error.message || String(error), stack:error.stack || null}); }
  onEnd(result) {
    this.report.finishedAt = new Date().toISOString();
    this.report.durationMs = result.duration;
    this.report.status = result.status;
    this.report.tests = [...this.entries.values()];
    writeReport(this.dir, this.report);
  }
}
module.exports = Reporter;
