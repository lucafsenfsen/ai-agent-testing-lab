'use strict';
const base = require('@playwright/test');
const test = base.test.extend({
  audit: [async ({page,browser,browserName}, use, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await use();
    await testInfo.attach('browser-environment', {body:JSON.stringify({browserName,version:browser.version(),viewport:page.viewportSize()}),contentType:'application/json'});
    await testInfo.attach('page-errors', {body:JSON.stringify(errors),contentType:'application/json'});
    base.expect(errors, 'Uncaught browser JavaScript errors').toEqual([]);
  }, {auto:true}]
});
module.exports = {test, expect:base.expect};
