'use strict';
const {test,expect} = require('./fixtures.cjs');
const url = '/Experiments/001-todo-gpt6/index.html';
const key = 'daylist.tasks.v1';
const texts = page => page.locator('.task-text');
async function add(page,text) {
  await page.getByLabel('What’s next?').fill(text);
  await page.getByRole('button',{name:'+ Add task',exact:true}).click();
}
test.beforeEach(async ({page}) => { await page.goto(url); });
test('T01 fresh context starts empty', async ({page}) => {
  await expect(texts(page)).toHaveCount(0);
  await expect(page.locator('#empty-title')).toHaveText('A fresh start.');
  await expect(page.locator('#task-count')).toHaveText('0 tasks left');
});
test('T02 create with button and Enter, trim whitespace, preserve order', async ({page}) => {
  await add(page,'  First task  ');
  await page.getByLabel('What’s next?').fill('Second task');
  await page.getByLabel('What’s next?').press('Enter');
  await expect(texts(page)).toHaveText(['First task','Second task']);
  await expect(page.getByLabel('What’s next?')).toBeEmpty();
  await expect(page.getByLabel('What’s next?')).toBeFocused();
});
test('T03 edit and save changes only the selected task', async ({page}) => {
  await add(page,'First'); await add(page,'Second');
  await page.getByRole('button',{name:'Edit First',exact:true}).click();
  await page.getByRole('textbox',{name:'Edit task',exact:true}).fill('  Revised  ');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(texts(page)).toHaveText(['Revised','Second']);
  await page.reload(); await expect(texts(page)).toHaveText(['Revised','Second']);
});
for (const cancel of ['Cancel','Escape']) test(`T04 cancel editing using ${cancel}`,async ({page}) => {
  await add(page,'Original');
  await page.getByRole('button',{name:'Edit Original',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Edit task',exact:true});
  await input.fill('Discard this');
  if(cancel==='Escape') await input.press('Escape'); else await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(texts(page)).toHaveText(['Original']);
  await expect(page.getByRole('button',{name:'Edit Original',exact:true})).toBeFocused();
  await page.reload(); await expect(texts(page)).toHaveText(['Original']);
});
test('T05 complete and reopen task, update counts and progress',async ({page}) => {
  await add(page,'One'); await add(page,'Two');
  await page.getByRole('checkbox',{name:'One',exact:true}).check();
  await expect(page.locator('#task-count')).toHaveText('1 task left');
  await expect(page.locator('#progress')).toHaveAttribute('value','1');
  await expect(page.locator('#progress')).toHaveAttribute('max','2');
  await page.getByRole('checkbox',{name:'One',exact:true}).uncheck();
  await expect(page.locator('#task-count')).toHaveText('2 tasks left');
  await expect(page.locator('#progress')).toHaveAttribute('value','0');
});
test('T06 delete selected tasks including final item and persist deletion',async ({page}) => {
  await add(page,'Keep'); await add(page,'Remove');
  await page.getByRole('button',{name:'Delete Remove',exact:true}).click();
  await expect(texts(page)).toHaveText(['Keep']);
  await page.reload(); await expect(texts(page)).toHaveText(['Keep']);
  await page.getByRole('button',{name:'Delete Keep',exact:true}).click();
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.reload(); await expect(texts(page)).toHaveCount(0);
});
test('T07 all, active, completed filters and empty filtered state',async ({page}) => {
  await add(page,'Open'); await add(page,'Done');
  await page.getByRole('checkbox',{name:'Done',exact:true}).check();
  await page.getByRole('button',{name:'Active',exact:true}).click();
  await expect(texts(page)).toHaveText(['Open']);
  await expect(page.getByRole('button',{name:'Active',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Completed',exact:true}).click();
  await expect(texts(page)).toHaveText(['Done']);
  await expect(page.getByRole('checkbox',{name:'Done',exact:true})).toBeChecked();
  // The row disappears immediately from this filter; assert the resulting UI instead of uncheck's detached-element postcondition.
  await page.getByRole('checkbox',{name:'Done',exact:true}).click();
  await expect(texts(page)).toHaveCount(0);
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.getByRole('button',{name:'All',exact:true}).click();
  await expect(texts(page)).toHaveText(['Open','Done']);
  await expect(page.getByRole('checkbox',{name:'Done',exact:true})).not.toBeChecked();
});
test('T08 create from completed filter reveals new active task',async ({page}) => {
  await page.getByRole('button',{name:'Completed',exact:true}).click();
  await add(page,'Visible');
  await expect(texts(page)).toHaveText(['Visible']);
  await expect(page.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('T09 tasks and completion persist across reload and a new tab',async ({page,context}) => {
  await add(page,'Persistent'); await add(page,'Pending');
  await page.getByRole('checkbox',{name:'Persistent',exact:true}).check();
  await page.reload();
  await expect(page.getByRole('checkbox',{name:'Persistent',exact:true})).toBeChecked();
  const tab=await context.newPage(); await tab.goto(url);
  await expect(texts(tab)).toHaveText(['Persistent','Pending']);
  await expect(tab.getByRole('checkbox',{name:'Persistent',exact:true})).toBeChecked();
  await tab.close();
});
for (const value of ['', '   ']) test(`T10 reject ${value ? 'whitespace' : 'empty'} creation and recover`,async ({page}) => {
  await add(page,value);
  await expect(texts(page)).toHaveCount(0);
  expect(await page.getByLabel('What’s next?').evaluate(e=>e.checkValidity())).toBe(false);
  await add(page,'Valid'); await expect(texts(page)).toHaveText(['Valid']);
});
test('T11 reject blank edit without losing original task',async ({page}) => {
  await add(page,'Keep me');
  await page.getByRole('button',{name:'Edit Keep me',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Edit task',exact:true});
  await input.fill('   '); await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(input).toBeVisible(); expect(await input.evaluate(e=>e.checkValidity())).toBe(false);
  await input.press('Escape'); await expect(texts(page)).toHaveText(['Keep me']);
  await page.reload(); await expect(texts(page)).toHaveText(['Keep me']);
});
test('T12 duplicate labels have independent identities',async ({page}) => {
  await add(page,'Same'); await add(page,'Same');
  await page.getByRole('checkbox',{name:'Same',exact:true}).first().check();
  await expect(page.getByRole('checkbox',{name:'Same',exact:true}).nth(1)).not.toBeChecked();
  await page.getByRole('button',{name:'Delete Same',exact:true}).first().click();
  await expect(texts(page)).toHaveText(['Same']);
  await expect(page.getByRole('checkbox',{name:'Same',exact:true})).not.toBeChecked();
});
test('T13 Unicode and HTML-like task text stay literal on create, edit, reload',async ({page}) => {
  const payload='<img src=x onerror="window.injected=true"> Zürich 日本語 🧪';
  await add(page,payload); await expect(texts(page)).toHaveText([payload]);
  await page.locator('.edit-button').click();
  await page.getByRole('textbox',{name:'Edit task',exact:true}).fill(payload+' edited');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.reload(); await expect(texts(page)).toHaveText([payload+' edited']);
  await expect(page.locator('#task-list img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();
});
test('T14 create and edit enforce the 500-character typed-input boundary',async ({page}) => {
  const input=page.getByLabel('What’s next?');
  await input.fill('x'.repeat(500)); await input.press('End'); await input.pressSequentially('y');
  await expect(input).toHaveValue('x'.repeat(500));
  await page.getByRole('button',{name:'+ Add task',exact:true}).click();
  await expect(texts(page)).toHaveText(['x'.repeat(500)]);
  await page.locator('.edit-button').click();
  const editor=page.getByRole('textbox',{name:'Edit task',exact:true});
  // Editing selects all text. ArrowRight collapses the selection at its end in both engines.
  await editor.press('ArrowRight'); await editor.pressSequentially('z');
  await expect(editor).toHaveValue('x'.repeat(500));
  await editor.press('Enter'); await page.reload(); await expect(texts(page)).toHaveText(['x'.repeat(500)]);
});
for (const [label,raw] of [['malformed JSON','{broken'],['invalid schema','{}'],['duplicate IDs',JSON.stringify([{id:'1',text:'A',completed:false},{id:'1',text:'B',completed:false}])]]) {
  test(`T15 ${label} storage reports an error without crashing`,async ({page}) => {
    await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw}); await page.reload();
    await expect(page.locator('#storage-error')).toBeVisible();
    expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(raw);
    await expect(texts(page)).toHaveCount(0);
    await add(page,'Recovery'); await expect(texts(page)).toHaveText(['Recovery']);
  });
}
test('T16 storage quota error preserves saved data and exposes unsaved change',async ({page}) => {
  await add(page,'Saved');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('QA quota fault','QuotaExceededError');};});
  await add(page,'Unsaved');
  await expect(texts(page)).toHaveText(['Saved','Unsaved']);
  await expect(page.locator('#storage-error')).toContainText('could not be saved');
  await page.reload(); await expect(texts(page)).toHaveText(['Saved']);
});
test('T17 unavailable storage warns and still allows in-tab operations',async ({page}) => {
  await page.addInitScript(()=>{Storage.prototype.getItem=function(){throw new DOMException('QA storage fault','SecurityError');}; Storage.prototype.setItem=Storage.prototype.getItem;});
  await page.reload(); await expect(page.locator('#storage-error')).toBeVisible();
  await add(page,'Temporary'); await expect(texts(page)).toHaveText(['Temporary']);
  await page.getByRole('checkbox',{name:'Temporary',exact:true}).check();
  await page.getByRole('button',{name:'Delete Temporary',exact:true}).click();
  await expect(texts(page)).toHaveCount(0);
});
for(const width of [320,390,768,1440]) test(`T18 responsive operations at ${width}px with long task`,async ({page},testInfo) => {
  await page.setViewportSize({width,height:900});
  await add(page,'W'.repeat(500));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const locator of [page.getByLabel('What’s next?'),page.locator('.edit-button'),page.locator('.delete')]) {
    const box=await locator.boundingBox(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x+box.width).toBeLessThanOrEqual(width+1);
  }
  await page.locator('.edit-button').click();
  await page.getByRole('textbox',{name:'Edit task',exact:true}).fill('Mobile edit');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('checkbox',{name:'Mobile edit',exact:true}).check();
  await page.getByRole('button',{name:'Completed',exact:true}).click();
  await expect(texts(page)).toHaveText(['Mobile edit']);
  await testInfo.attach('responsive-layout',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await page.getByRole('button',{name:'Delete Mobile edit',exact:true}).click();
  await expect(texts(page)).toHaveCount(0);
});
