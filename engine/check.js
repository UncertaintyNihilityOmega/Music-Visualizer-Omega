// Structure check:  node engine/check.js
// Reads the project's files (it runs nothing in a browser) and reports what
// would break the app or break a promise the project makes:
//   - a script that does not parse, is missing, or is on disk but never loaded
//   - scripts loaded in an order the code cannot survive
//   - a mode button with no mode behind it, or a mode with no button
//   - anything fetched from the internet at run time (the app must work offline)
//   - a theme with missing parts, or two themes sharing a code word
//   - version numbers that disagree
// Errors exit 1. Add a check here whenever a bug is found by hand.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const errors = [], notes = [];
const err = m => errors.push(m);

function walk(dir, ext, out = []){
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })){
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}

/* 1. every script parses */
const jsFiles = walk('js', '.js').concat(walk('engine', '.js'));
for (const f of jsFiles){
  try { new vm.Script(read(f), { filename: f }); }
  catch (e){ err(`${f}: does not parse: ${e.message}`); }
}

/* 2. index.html loads every app script exactly once, and each one exists */
const html = read('index.html');
const loaded = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
for (const s of loaded) if (!exists(s)) err(`index.html loads ${s}, which does not exist`);
const appJs = walk('js', '.js');
for (const f of appJs){
  const n = loaded.filter(s => s === f).length;
  if (n === 0) err(`${f} is on disk but index.html never loads it`);
  if (n > 1) err(`${f} is loaded ${n} times`);
}
for (const m of html.matchAll(/<link[^>]+href="([^"]+)"/g)){
  if (!/^https?:/.test(m[1]) && !exists(m[1])) err(`index.html links ${m[1]}, which does not exist`);
}

/* 3. load order the code depends on */
const pos = s => loaded.indexOf(s);
const before = (a, b, why) => { if (pos(a) === -1 || pos(b) === -1 || pos(a) > pos(b)) err(`load order: ${a} must come before ${b} (${why})`); };
if (loaded[0] !== 'js/core/app.js') err('load order: js/core/app.js must be the first script (it creates window.App)');
if (loaded[loaded.length - 1] !== 'js/main.js') err('load order: js/main.js must be the last script (it starts everything)');
const pageFiles = loaded.filter(s => /^js\/pages\/page-/.test(s));
for (const p of pageFiles) before(p, 'js/pages/pages-mount.js', 'pages are mounted once, after all are defined');
before('js/pages/pages-mount.js', 'js/core/state.js', 'state.js looks page elements up by id');
before('js/core/settings.js', 'js/core/audio-engine.js', 'the engine registers its settings');
before('js/core/analysis.js', 'js/core/audio-engine.js', 'the engine wraps the analyser');
before('js/core/themes.js', 'js/modes/mode-basic.js', 'Basic draws with the theme look');
before('js/core/fx.js', 'js/core/mode-registry.js', 'the frame loop wraps every mode in the picture layer');
before('js/games/games-shared.js', 'js/games/games-host.js', 'the host uses the shared framework');
before('js/core/audio-engine.js', 'js/player/transport.js', 'volume goes through the engine');

/* 4. mode buttons and registered modes match */
const buttons = [...html.matchAll(/data-mode="([^"]+)"/g)].map(m => m[1]);
const registered = new Set();
for (const f of appJs){
  const src = read(f);
  for (const m of src.matchAll(/App\.modes\.register\(\s*'([^']+)'/g)) registered.add(m[1]);
  for (const m of src.matchAll(/App\.games\.register\(\s*'([^']+)'/g)) registered.add(m[1]);
}
for (const b of buttons) if (!registered.has(b)) err(`index.html has a button for mode "${b}" but no file registers it`);
for (const r of registered) if (!buttons.includes(r)) err(`mode "${r}" is registered but has no button in index.html`);
const order = /MODE_ORDER\s*=\s*\[([^\]]+)\]/.exec(read('js/main.js'));
if (order){
  const ids = order[1].split(',').map(s => s.trim().replace(/'/g, ''));
  for (const b of buttons) if (!ids.includes(b)) err(`js/main.js MODE_ORDER (the V key) is missing mode "${b}"`);
  for (const i of ids) if (!buttons.includes(i)) err(`js/main.js MODE_ORDER lists "${i}", which has no button`);
}

/* 5. nothing is fetched from the internet at run time */
const remote = /(?:@import\s+url\(|<script[^>]+src=|<link[^>]+href=|fetch\(|\.src\s*=\s*)\s*['"]?(https?:)?\/\//;
for (const f of ['index.html', ...walk('css', '.css'), ...appJs]){
  read(f).split('\n').forEach((line, i) => {
    if (remote.test(line) && !/rel="noopener"/.test(line)) err(`${f}:${i + 1}: loads something from the internet; the app must work offline`);
  });
}

/* 6. themes are complete and their codes are unique */
try {
  const App = { theme: {}, canvas: null };
  vm.runInNewContext(read('js/core/themes.js'), { App, window: {}, document: {}, localStorage: {} });
  const VARS = ['bg1', 'bg2', 'glow1', 'glow2', 'card', 'field', 'ink', 'muted', 'accent', 'accent2', 'accentRgb', 'line', 'onAccent', 'shadow'];
  const LAYOUTS = ['mirror', 'edges', 'rise', 'ring'];
  const seen = {};
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!App.theme.THEMES.omega) err('themes.js: the default theme "omega" is missing');
  for (const [id, t] of Object.entries(App.theme.THEMES)){
    for (const k of ['name', 'title', 'mark', 'docTitle']) if (!t[k]) err(`theme "${id}": missing ${k}`);
    for (const k of VARS) if (!t.vars || t.vars[k] === undefined) err(`theme "${id}": missing colour "${k}"`);
    for (const k of ['c1', 'c2', 'bg1', 'bg2']) if (!t.look || !/^#[0-9a-f]{6}$/i.test(t.look[k] || '')) err(`theme "${id}": look.${k} must be a #rrggbb colour`);
    if (!t.look || !LAYOUTS.includes(t.look.layout)) err(`theme "${id}": look.layout must be one of ${LAYOUTS.join(', ')}`);
    if (!t.codes || !t.codes.length) err(`theme "${id}": has no code word`);
    for (const c of t.codes || []){
      if (seen[norm(c)]) err(`themes "${seen[norm(c)]}" and "${id}" share the code "${c}"`);
      seen[norm(c)] = id;
    }
  }
  notes.push(`${Object.keys(App.theme.THEMES).length} themes`);
} catch (e){ err('themes.js could not be read: ' + e.message); }

/* 7. versions agree */
const appVer = (/version:\s*'([^']+)'/.exec(read('js/core/app.js')) || [])[1];
const pkgVer = JSON.parse(read('package.json')).version;
if (appVer !== pkgVer) err(`version: js/core/app.js says ${appVer}, package.json says ${pkgVer}`);
const logVer = (/^## \[?v?([0-9][^\]\s]*)/m.exec(read('CHANGELOG.md')) || [])[1];
if (logVer && appVer && logVer !== appVer.replace(/-dev$/, '') && logVer !== appVer) err(`version: CHANGELOG.md's newest entry is ${logVer}, the app says ${appVer}`);

/* 8. the roadmap keeps its shape */
const road = read('ROADMAP.md');
['## Now', '## Rules', '## Queue', '## Done', '## For the user'].forEach(h => { if (!road.includes(h)) err(`ROADMAP.md is missing the section "${h}"`); });

notes.push(`${appJs.length} app scripts, ${buttons.length} modes, version ${appVer}`);
if (errors.length){
  console.log(errors.map(e => 'ERROR  ' + e).join('\n'));
  console.log(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log('check: 0 errors  (' + notes.join('; ') + ')');
