'use strict';
const {test,expect}=require('./fixtures.cjs');
const fs=require('node:fs');
const path=require('node:path');
const Lab=require('../../core.js');
async function record(page,model='SOFTWARE QA ONLY') {
  await page.locator('#record-button').click();
  const form=page.locator('#result-form');
  for(const [name,value] of Object.entries({model,version:'test-only',protocol:'qa-only',environment:'Disposable browser context',prompt:'Software QA fixture, not model output',evidence:'QA fixture',judgment:'QA arithmetic fixture',correctness:'80',instructions:'60',reliability:'40',quality:'20'})) await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name="challenge"]').selectOption('todo');
  await expect(page.locator('#score-preview')).toHaveText('58.0');
  await form.locator('[type="submit"]').click();
  await expect(page.locator('#result-dialog')).not.toBeVisible();
}
async function upload(page,selector,text,name='qa-only.json') {
  await page.locator(selector).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text)});
}
const reportPath=()=>{
  const pointer=JSON.parse(fs.readFileSync(path.join(__dirname,'../../reports/latest-evaluation.json')));
  return path.join(__dirname,'../..',pointer.report);
};
test.beforeEach(async ({page})=>{await page.goto('/');});
test('D01 five challenges and isolated empty score workspace',async ({page})=>{
  await expect(page.locator('#result-count')).toHaveText('0');
  await page.locator('[data-view="challenges"]').click();
  await expect(page.locator('.challenge-card')).toHaveCount(5);
});
test('D02 record, persist, edit, cancel deletion, delete',async ({page})=>{
  await record(page); await page.reload(); await expect(page.locator('#result-count')).toHaveText('1');
  await page.locator('[data-view="results"]').click();
  await page.locator('#result-table [data-action="detail"]').click();
  await page.getByRole('button',{name:'Edit result',exact:true}).click();
  await page.locator('[name="correctness"]').fill('100'); await expect(page.locator('#score-preview')).toHaveText('66.0');
  await page.locator('#result-form [type="submit"]').click();
  await expect(page.locator('#result-dialog')).not.toBeVisible();
  await expect(page.locator('#result-table')).toContainText('66.0');
  await page.locator('#result-table [data-action="detail"]').click();
  await page.getByRole('button',{name:'Delete',exact:true}).click(); await page.locator('#cancel-delete').click();
  await expect(page.locator('#result-count')).toHaveText('1');
  await page.getByRole('button',{name:'Delete',exact:true}).click(); await page.locator('#confirm-delete').click();
  await expect(page.locator('#result-count')).toHaveText('0');
});
test('D03 JSON and CSV downloads, duplicate/conflict rejection and restore',async ({page})=>{
  await record(page); await page.locator('[data-view="results"]').click();
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Export JSON',exact:true}).click();
  const raw=fs.readFileSync(await (await download).path(),'utf8'); expect(Lab.parseBackup(raw)).toHaveLength(1);
  const csv=page.waitForEvent('download'); await page.getByRole('button',{name:'Export CSV',exact:true}).click();
  expect(fs.readFileSync(await (await csv).path(),'utf8')).toContain('weightedScore');
  await upload(page,'#import-file',raw); await expect(page.locator('#toast')).toContainText('skipped 1');
  const conflict=JSON.parse(raw); conflict.results[0].model='CONFLICT';
  await upload(page,'#import-file',JSON.stringify(conflict)); await expect(page.locator('#toast')).toContainText('conflicts');
  await upload(page,'#import-file','{bad'); await expect(page.locator('#toast')).toContainText('Import failed');
  await expect(page.locator('#result-count')).toHaveText('1');
  await page.evaluate(key=>localStorage.removeItem(key),Lab.STORAGE_KEY); await page.reload();
  await upload(page,'#import-file',raw); await expect(page.locator('#result-count')).toHaveText('1');
});
test('D04 comparisons and search still use subjective records only',async ({page})=>{
  await record(page,'QA A'); await record(page,'QA B');
  await page.locator('[data-view="compare"]').click(); await expect(page.locator('.comparison-card')).toHaveCount(2);
  await expect(page.locator('#comparison-output')).toContainText('1/5 shared challenges');
  await page.locator('[data-view="results"]').click(); await page.locator('#search').fill('absent');
  await expect(page.locator('#result-table')).toContainText('No matching results');
  await page.getByRole('button',{name:'Clear',exact:true}).click(); await expect(page.locator('#result-table tbody tr')).toHaveCount(2);
});
test('D05 corrupt score storage is preserved; quota failure does not add records',async ({page})=>{
  await page.evaluate(key=>localStorage.setItem(key,'bad'),Lab.STORAGE_KEY); await page.reload();
  await expect(page.locator('#storage-warning')).toBeVisible(); expect(await page.evaluate(key=>localStorage.getItem(key),Lab.STORAGE_KEY)).toBe('bad');
  await page.evaluate(key=>localStorage.removeItem(key),Lab.STORAGE_KEY); await page.reload();
  await record(page);
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('QA quota','QuotaExceededError');};});
  await page.locator('[data-view="results"]').click(); await page.locator('#result-table [data-action="detail"]').click();
  await page.getByRole('button',{name:'Edit result',exact:true}).click();
  await page.locator('[name="model"]').fill('Unsaved'); await page.locator('#result-form [type="submit"]').click();
  await expect(page.locator('#form-error')).toContainText('Could not save');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).results[0].model,Lab.STORAGE_KEY)).toBe('SOFTWARE QA ONLY');
});
test('D06 latest real evaluation loads, downloads and leaves scores unchanged',async ({page})=>{
  // A first standalone dashboard run may not have evaluation evidence yet.
  test.skip(!fs.existsSync(path.join(__dirname,'../../reports/latest-evaluation.json')),'Run test:todo first for real report integration.');
  await record(page);
  const before=await page.evaluate(key=>localStorage.getItem(key),Lab.STORAGE_KEY);
  await page.locator('[data-view="automated"]').click(); await page.locator('#load-evaluation').click();
  await expect(page.locator('#automated-message')).toContainText('Loaded reports/');
  const report=JSON.parse(fs.readFileSync(reportPath(),'utf8'));
  await expect(page.locator('#automated-summary')).toContainText(`${report.summary.total} tests`);
  expect(await page.evaluate(key=>localStorage.getItem(key),Lab.STORAGE_KEY)).toBe(before);
  const download=page.waitForEvent('download'); await page.locator('#download-automated').click();
  expect(JSON.parse(fs.readFileSync(await (await download).path(),'utf8'))).toEqual(report);
  await page.locator('#load-published').click();
  await expect(page.locator('#automated-message')).toHaveText('Loaded published Experiment 001 evidence.');
  await expect(page.locator('#automated-summary')).toContainText('50 tests');
  expect(await page.evaluate(key=>localStorage.getItem(key),Lab.STORAGE_KEY)).toBe(before);
  await page.locator('[data-view="overview"]').click(); await expect(page.locator('#result-count')).toHaveText('1');
});
test('D07 report validation, text safety, errors and offline import',async ({page})=>{
  test.skip(!fs.existsSync(path.join(__dirname,'../../reports/latest-evaluation.json')),'Run test:todo first for report integration.');
  const data=JSON.parse(fs.readFileSync(reportPath(),'utf8'));
  // Explicit QA-only transformation; never written to a research report file.
  data.tests[0].title='<img src=x onerror="window.injected=true">';
  data.status='error'; data.errors=[{message:'QA-only simulated runner error'}];
  await page.locator('[data-view="automated"]').click();
  await upload(page,'#automated-file',JSON.stringify(data));
  await expect(page.locator('#automated-output')).toContainText(data.tests[0].title);
  await expect(page.locator('#automated-output')).toContainText('QA-only simulated runner error');
  await expect(page.locator('#automated-output img')).toHaveCount(0);
  await upload(page,'#automated-file','{broken'); await expect(page.locator('#automated-message')).toContainText('Could not open report');
  await expect(page.locator('#automated-output')).toContainText(data.tests[0].title);
  data.summary.passed++; await upload(page,'#automated-file',JSON.stringify(data));
  await expect(page.locator('#automated-message')).toContainText('Invalid or unsupported');
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
  const file=require('node:url').pathToFileURL(path.join(__dirname,'../../index.html')).href;
  await page.goto(file+'#automated'); await upload(page,'#automated-file',fs.readFileSync(reportPath(),'utf8'));
  await expect(page.locator('#automated-summary')).toBeVisible();
});
test('D08 missing latest report explains how to load saved evidence',async ({page})=>{
  await page.route('**/reports/latest-evaluation.json',route=>route.fulfill({status:404,body:'Not found'}));
  await page.locator('[data-view="automated"]').click(); await page.locator('#load-evaluation').click();
  await expect(page.locator('#automated-message')).toContainText('No saved run found');
});
test('D09 all six sections fit mobile, tablet and desktop; dialog keyboard dismissal',async ({page},testInfo)=>{
  await record(page,'<img src=x onerror="window.injected=true">');
  for(const width of [390,768,1440]) {
    await page.setViewportSize({width,height:900});
    for(const view of ['overview','challenges','results','compare','methodology','automated']) {
      await page.goto('/#'+view); await expect(page.locator('#view-'+view)).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({width:390,height:844});
  if(fs.existsSync(path.join(__dirname,'../../reports/latest-evaluation.json'))) {
    await page.locator('#load-evaluation').click(); await expect(page.locator('#automated-summary')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await testInfo.attach('report-view-mobile',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await page.locator('#record-button').click(); await page.keyboard.press('Escape');
  await expect(page.locator('#result-dialog')).not.toBeVisible();
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
});
test('D10 direct-file dashboard recording and reload persistence',async ({page})=>{
  await page.goto(require('node:url').pathToFileURL(path.join(__dirname,'../../index.html')).href);
  await record(page); await page.reload(); await expect(page.locator('#result-count')).toHaveText('1');
});
