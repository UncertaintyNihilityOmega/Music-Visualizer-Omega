// Local preview server:  node engine/serve.js [port]      (default 8123)
// Serves the project folder with no caching, answers Range requests (so
// seeking inside a song works), and lists test-songs/ at /__dev/test-songs
// so the Music page can offer the real test songs. Dev only: binds to
// localhost and is never part of the published site.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2]) || 8123;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jfif': 'image/jpeg', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav',
  '.flac': 'audio/flac', '.mp4': 'video/mp4', '.webm': 'video/webm', '.md': 'text/plain; charset=utf-8'
};
const AUDIO = /\.(mp3|wav|ogg|oga|opus|m4a|flac|aac|weba|mp4|webm|mov)$/i;

http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (e) { res.writeHead(400).end(); return; }

  if (urlPath === '/__dev/test-songs'){
    let list = [];
    try { list = fs.readdirSync(path.join(ROOT, 'test-songs')).filter(n => AUDIO.test(n)).sort(); } catch (e) {}
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(list));
    return;
  }

  if (urlPath.endsWith('/')) urlPath += 'index.html';
  const file = path.join(ROOT, urlPath);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)){ res.writeHead(403).end(); return; }   // no escaping the project folder
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()){ res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    const head = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes'
    };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])){
      let start = m[1] ? parseInt(m[1], 10) : Math.max(0, st.size - parseInt(m[2], 10));
      let end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), st.size - 1) : st.size - 1;
      if (start > end || start >= st.size){ res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }).end(); return; }
      head['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
      head['Content-Length'] = end - start + 1;
      res.writeHead(206, head);
      if (req.method === 'HEAD'){ res.end(); return; }
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      head['Content-Length'] = st.size;
      res.writeHead(200, head);
      if (req.method === 'HEAD'){ res.end(); return; }
      fs.createReadStream(file).pipe(res);
    }
  });
}).listen(PORT, 'localhost', () => console.log(`Music Visualiser Omega: http://localhost:${PORT}/`));
