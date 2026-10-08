'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.zip':'application/zip'};
function start(port = 8765) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || relative.split('/').some(p => p.startsWith('.')) ||
          /^(node_modules|work)\//.test(relative)) { res.writeHead(403).end(); return; }
      const content = await fs.readFile(file);
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store'});
      res.end(content);
    } catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
module.exports = { start };
if (require.main === module) start(Number(process.env.PORT || 8765)).then(server => {
  console.log(`AI Agent Testing Lab: http://127.0.0.1:${server.address().port}/`);
}).catch(error => { console.error(error.message); process.exitCode = 1; });
