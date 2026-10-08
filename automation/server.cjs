'use strict';
const http = require('node:http');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.zip':'application/zip'};
function start(port = 8765) {
  const publicFiles = new Set(fsSync.readFileSync(path.join(root,'release-files.txt'),'utf8').trim().split(/\r?\n/));
  publicFiles.add('RELEASE-MANIFEST.json');
  const realRoot = fsSync.realpathSync(root);
  const server = http.createServer(async (req, res) => {
    try {
      const authorities = [`127.0.0.1:${server.address().port}`, `localhost:${server.address().port}`];
      // Loopback binding alone does not prevent a hostile website from rebinding its DNS name.
      if (!authorities.includes(req.headers.host) ||
          (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) { res.writeHead(403).end(); return; }
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {'Allow':'GET, HEAD'}).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || relative.split('/').some(p => p.startsWith('.')) ||
          !(publicFiles.has(relative) || /^reports\/(?:latest-(?:evaluation|dashboard)\.json|[a-zA-Z0-9-]+\/report\.json)$/.test(relative))) {
        res.writeHead(403).end(); return;
      }
      // Refuse symlink aliases, including aliases to private files inside the project.
      if (await fs.realpath(file) !== path.join(realRoot, relative)) { res.writeHead(403).end(); return; }
      const content = await fs.readFile(file);
      res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : content);
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
