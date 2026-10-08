'use strict';
const { defineConfig } = require('@playwright/test');
const path = require('node:path');
if (!process.env.LAB_RUN_DIR) throw new Error('Use npm test, npm run test:todo, or npm run test:dashboard to retain provenance and reports.');
module.exports = defineConfig({
  testDir:'./tests/e2e',
  testMatch: process.env.LAB_SCOPE === 'evaluation' ? 'todo.spec.cjs' : 'dashboard.spec.cjs',
  fullyParallel:false, workers:1, retries:0, forbidOnly:true, timeout:20000,
  expect:{timeout:4000},
  outputDir:path.join(process.env.LAB_RUN_DIR, 'artifacts'),
  reporter:[['list'], ['json', {outputFile:path.join(process.env.LAB_RUN_DIR,'playwright.json')}], ['./automation/reporter.cjs']],
  use:{baseURL:process.env.LAB_BASE_URL, locale:'en-US', timezoneId:'Europe/Zurich',
    viewport:{width:1440,height:1000}, headless:true, actionTimeout:5000,
    screenshot:'only-on-failure', trace:'retain-on-failure', reducedMotion:'reduce'},
  projects:['chromium','webkit'].map(browserName => ({name:browserName, use:{browserName}}))
});
