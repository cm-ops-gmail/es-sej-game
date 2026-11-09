/* Local stand-in for the live site: serves the static files and runs the real relay in api/room.mjs.
   Usage: node tests/dev-server.js [port]
   RELAY_DROP=0.3 randomly fails that share of relay requests, to test recovery. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2]) || 8124;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2' };
let dropRate = Number(process.env.RELAY_DROP) || 0;

(async () => {
  const room = (await import(path.join(ROOT, 'api/room.mjs'))).default;
  http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/__drop') {
      dropRate = Number(url.searchParams.get('rate')) || 0;
      return res.end('ok');
    }
    if (url.pathname === '/api/room') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      if (Math.random() < dropRate) { res.statusCode = 503; return res.end('{}'); }
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const reply = await room.fetch(new Request(url, { method: req.method, headers: req.headers, body: hasBody ? Buffer.concat(chunks) : undefined }));
      res.statusCode = reply.status;
      reply.headers.forEach((v, k) => res.setHeader(k, v));
      return res.end(await reply.text());
    }
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  }).listen(PORT, () => console.log(`http://localhost:${PORT}`));
})();
