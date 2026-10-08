'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {start} = require('../automation/server.cjs');
const root = path.resolve(__dirname,'..');
async function setup(t) {
  const server = await start(0);
  t.after(async () => {server.closeAllConnections();await new Promise(resolve => server.close(resolve));});
  const port = server.address().port;
  return (url, headers = {}, method = 'GET') => new Promise((resolve,reject) => {
    const request = http.request({hostname:'127.0.0.1',port,path:url,headers,method},response => {
      let body='';response.on('data',data => body+=data);
      response.on('end',() => resolve({status:response.statusCode,headers:response.headers,body}));
    });
    request.on('error',reject);request.end();
  });
}
test('local server serves public assets and report JSON with safe types and HEAD responses',async t => {
  const get = await setup(t);
  const page = await get('/');assert.equal(page.status,200);assert.match(page.body,/<title>AI Agent Testing Lab/);
  assert.equal(page.headers['x-content-type-options'],'nosniff');
  const head=await get('/index.html',{},'HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});
  const dir=fs.mkdtempSync(path.join(root,'reports','qa-server-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.writeFileSync(path.join(dir,'report.json'),'{}');
  const report=await get(`/reports/${path.basename(dir)}/report.json`);
  assert.equal(report.status,200);assert.equal(report.headers['content-type'],'application/json');
});
test('local server rejects hostile Host, cross-origin requests and write methods',async t => {
  const get = await setup(t);
  for(const headers of [{Host:'attacker.example'},{Host:'localhost.attacker.example'},{Origin:'https://attacker.example'},{Origin:'null'}]) {
    assert.equal((await get('/index.html',headers)).status,403);
  }
  assert.equal((await get('/index.html',{},'POST')).status,405);
});
test('local server denies credentials, private directories, arbitrary files and encoded traversal',async t => {
  const get = await setup(t);
  for(const url of ['/.git/config','/.env','/work/private.txt','/node_modules/package.json','/private-backup.json',
    '/reports/qa-only/console.log','/reports/qa-only/inputs/package.json','/reports/%2e%2e%2f.git/config']) {
    assert.equal((await get(url)).status,403,url);
  }
});
test('local server refuses report symlinks to private files inside or outside the root',async t => {
  const get=await setup(t);
  fs.mkdirSync(path.join(root,'reports'),{recursive:true});
  const dir=fs.mkdtempSync(path.join(root,'reports','qa-server-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'lab-server-qa-'));
  t.after(()=>{fs.rmSync(dir,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});});
  const target=path.join(outside,'synthetic.json');fs.writeFileSync(target,'{"synthetic":"private fixture"}');
  const link=path.join(dir,'report.json');
  for(const source of [target,path.join(root,'package.json')]) {
    fs.symlinkSync(source,link);assert.equal((await get(`/reports/${path.basename(dir)}/report.json`)).status,403);fs.unlinkSync(link);
  }
});
