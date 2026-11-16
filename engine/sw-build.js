// Offline list:  node engine/sw-build.js          writes the file list and version into sw.js
//                node engine/sw-build.js --check  exits 1 if sw.js is out of date (check.js calls this)
//
// sw.js (the service worker) keeps a copy of the app's own files so the app
// opens with no network. It must know every file and must change whenever
// one of them changes, or phones keep the old build. This tool finds the
// files (index.html, what it loads, the icons, the manifest), hashes their
// contents, and writes both between the two marker lines in sw.js.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p));

function appFiles(){
  const html = read('index.html').toString('utf8');
  const files = ['index.html', 'manifest.webmanifest'];
  for (const m of html.matchAll(/<script\s+src="([^"]+)"/g)) files.push(m[1]);
  for (const m of html.matchAll(/<link[^>]+href="([^"]+)"/g)) if (!/^https?:/.test(m[1])) files.push(m[1]);
  const man = JSON.parse(read('manifest.webmanifest').toString('utf8'));
  for (const i of man.icons || []) files.push(i.src);
  return [...new Set(files)].sort();
}

function build(){
  const files = appFiles();
  const h = crypto.createHash('sha256');
  for (const f of files){
    let buf = read(f);
    // text files are hashed with LF line ends, so Windows and GitHub agree
    if (!/\.(png|jpg|ico)$/.test(f)) buf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    h.update(f + '\n').update(buf);
  }
  const ver = (/version:\s*'([^']+)'/.exec(read('js/core/app.js').toString('utf8')) || [, '0'])[1];
  const block =
    "var VERSION = '" + ver + '-' + h.digest('hex').slice(0, 10) + "';\n" +
    'var FILES = [\n' + files.map(f => "  '" + f + "'").join(',\n') + '\n];';
  return { files, block };
}

const START = '/* BUILD:START (written by engine/sw-build.js; do not edit by hand) */';
const END = '/* BUILD:END */';
function current(){
  const sw = read('sw.js').toString('utf8').replace(/\r\n/g, '\n');
  const a = sw.indexOf(START), b = sw.indexOf(END);
  if (a < 0 || b < 0) throw new Error('sw.js has lost its BUILD markers');
  return { sw, a: a + START.length, b };
}

function check(){
  const c = current(), want = build();
  return c.sw.slice(c.a, c.b).trim() === want.block.trim();
}
module.exports = { appFiles, check };

if (require.main === module){
  if (process.argv.includes('--check')){
    if (!check()){ console.log('sw.js is out of date: run  node engine/sw-build.js'); process.exit(1); }
    console.log('sw.js is up to date');
  } else {
    const c = current(), want = build();
    fs.writeFileSync(path.join(ROOT, 'sw.js'), c.sw.slice(0, c.a) + '\n' + want.block + '\n' + c.sw.slice(c.b));
    console.log('sw.js: ' + want.files.length + ' files, ' + want.block.split('\n')[0]);
  }
}
