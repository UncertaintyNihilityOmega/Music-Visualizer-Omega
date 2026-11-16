// Unused things:  node engine/unused.js
// Lists what the app carries but never uses. A report, not a gate: read it,
// then delete by hand (some things are kept on purpose, see KEEP).
//   - files in the published folders that nothing refers to
//   - CSS classes that no script or page ever writes
//   - element ids made in the pages that no script ever looks up
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
function walk(dir, out = []){
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })){
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
// kept on purpose: made by a tool, or used by the browser without being named in the code
const KEEP = [/^icons\/icon-(32|180|192|512)\.png$/, /^icons\/icon\.svg$/];

const js = walk('js').filter(f => f.endsWith('.js'));
const code = ['index.html', 'manifest.webmanifest', 'sw.js', ...js].map(read).join('\n');
const css = read('css/styles.css');
const found = [];

/* 1. files nothing refers to */
for (const f of [...walk('icons'), ...walk('css'), ...js]){
  if (KEEP.some(k => k.test(f))) continue;
  if (!code.includes(f) && !css.includes(path.basename(f))) found.push('file    ' + f);
}

/* 2. CSS classes never written by a page or script */
const classes = new Set();
for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)) classes.add(m[1]);
for (const c of classes){
  if (/^\d/.test(c)) continue;
  // a class may be built from a prefix ('page-' + id), so look for its stem too
  const stem = c.replace(/-[a-z0-9]+$/, '-');
  if (!new RegExp('[\'"\\s.]' + c.replace(/[-]/g, '\\-') + '[\'"\\s>]').test(code) && !(stem !== c && code.includes("'" + stem + "'")))
    found.push('class   .' + c);
}

/* 3. ids made in the page that no script looks up and no CSS styles */
for (const m of code.matchAll(/\bid="([\w-]+)"/g)){
  const id = m[1];
  const uses = code.split(id).length - 1;
  if (uses < 2 && !css.includes('#' + id)) found.push('id      #' + id);
}

console.log(found.length ? found.join('\n') + '\n\n' + found.length + ' thing(s) look unused.' : 'unused: nothing found');
