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
    // Fire's look: null (the user's own colours) or four colours; the hearth must be dark, because
    // the flames are added light and vanish on a pale background
    if (t.look && t.look.fire){
      const f = t.look.fire;
      const styles = (/var STYLE_IDS = \[([^\]]*)\]/.exec(read('js/modes/mode-fire.js')) || [, ''])[1].replace(/['\s]/g, '').split(',');
      if (f && f.style && !styles.includes(f.style)) err(`theme "${id}": look.fire.style "${f.style}" is not a style mode-fire.js knows (${styles.join(', ')})`);
      if (!f) err(`theme "${id}": look.fire must be null or { style, warm, cool, bg1, bg2 }`);
      else for (const k of ['warm', 'cool', 'bg1', 'bg2']){
        if (!/^#[0-9a-f]{6}$/i.test(f[k] || '')) err(`theme "${id}": look.fire.${k} must be a #rrggbb colour`);
        else if (k[0] === 'b'){
          const n = parseInt(f[k].slice(1), 16), lum = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11);
          if (lum > 60) err(`theme "${id}": look.fire.${k} is too pale for a fire (brightness ${lum.toFixed(0)} of 255, limit 60)`);
        }
      }
    }
    // Rain, Nature and Clock follow every theme too (user, 2026-11-16: a code must change more than colours)
    const hex = v => /^#[0-9a-f]{6}$/i.test(v || '');
    const R = t.look && t.look.rain, N = t.look && t.look.nature;
    if (!R) err(`theme "${id}": look.rain is missing`);
    else {
      for (const k of ['color', 'bolt', 'bg1', 'bg2']) if (!hex(R[k])) err(`theme "${id}": look.rain.${k} must be a #rrggbb colour`);
      if (!['streak', 'snow', 'glyph'].includes(R.shape)) err(`theme "${id}": look.rain.shape must be streak, snow or glyph`);
      if (R.shape === 'glyph' && !(R.glyphs && R.glyphs.length)) err(`theme "${id}": look.rain needs glyphs`);
    }
    if (!N) err(`theme "${id}": look.nature is missing`);
    else {
      for (const k of ['trunk', 'leaf', 'bloom', 'hill', 'bg1', 'bg2']) if (!hex(N[k])) err(`theme "${id}": look.nature.${k} must be a #rrggbb colour`);
      if (!['curve', 'straight', 'bolt'].includes(N.branch)) err(`theme "${id}": look.nature.branch must be curve, straight or bolt`);
      if (!['leaf', 'square', 'spark'].includes(N.leafShape)) err(`theme "${id}": look.nature.leafShape must be leaf, square or spark`);
    }
    const clockSrc = read('js/modes/mode-clock.js');
    if (!t.look || !new RegExp('\\n    ' + t.look.clock + ': \\{').test(clockSrc)) err(`theme "${id}": look.clock "${t.look && t.look.clock}" is not a skin in mode-clock.js`);
    if (!t.look || !t.look.fire) err(`theme "${id}": look.fire is missing (every theme, the default too, gives Fire a form)`);
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

/* 9. faults that were fixed once and must stay fixed (ROADMAP item 13) */
{
  const page = read('index.html');
  // the transport's buttons are drawn icons: colour emoji ignore the theme's colours
  for (const id of ['shuffleBtn', 'repeatBtn']){
    const m = new RegExp('<button[^>]*id="' + id + '"[^>]*>([\\s\\S]*?)</button>').exec(page);
    if (!m) err(`index.html: the button "${id}" is missing`);
    else if (!/<svg/.test(m[1])) err(`index.html: "${id}" must hold an <svg> icon, not an emoji (emoji ignore the theme)`);
  }
  if (/textContent\s*=\s*[^;]*[\u{1F500}-\u{1F502}]/u.test(read('js/player/transport.js'))) err('transport.js: sets an emoji as a button label; toggle a class on the icon instead');
  // the saved theme's colours are set before the first paint, from a copy themes.js keeps
  const inlineAt = page.indexOf('viz.themeVars'), bodyAt = page.indexOf('<body');
  if (inlineAt < 0 || inlineAt > bodyAt) err('index.html: the script in <head> that restores the saved theme colours (viz.themeVars) is missing');
  if (!read('js/core/themes.js').includes('viz.themeVars')) err('themes.js: no longer saves viz.themeVars, so the page would flash the default colours on load');
  // an exported settings file says which settings version it holds, and an import drops outdated groups
  const st = read('js/core/settings.js');
  if (!/cfgVersion:\s*CFG_VERSION/.test(st) || !/importCfg\(incoming,\s*parsed/.test(st)) err('settings.js: export must write cfgVersion and import must pass it to importCfg');
  // a web address that blocks reading is played on the plain player, never through the analysis
  if (!read('js/core/state.js').includes('S.plainAudio') || !read('js/player/playlist.js').includes('track.noRead')) err('the plain player for addresses that block reading (state.js, playlist.js) is missing');
}

/* 10. offline install (ROADMAP item 4) */
{
  try { new vm.Script(read('sw.js'), { filename: 'sw.js' }); } catch (e){ err('sw.js: does not parse: ' + e.message); }
  const swb = require('./sw-build.js');
  try { if (!swb.check()) err('sw.js is out of date (a file it caches changed): run  node engine/sw-build.js'); }
  catch (e){ err('sw.js: ' + e.message); }
  for (const f of swb.appFiles()) if (!exists(f)) err(`sw.js would cache ${f}, which does not exist`);
  const ins = read('js/core/install.js');
  if (!/isLocal/.test(ins) || !/unregister()/.test(ins)) err('install.js: the service worker must not be registered on the local dev server (and a left-over one must be removed)');
  const man = JSON.parse(read('manifest.webmanifest'));
  for (const size of ['192x192', '512x512']) if (!(man.icons || []).some(i => i.sizes === size && i.type === 'image/png')) err(`manifest.webmanifest: a ${size} PNG icon is needed for the app to be installable`);
  if (man.display !== 'standalone' || !man.start_url || !man.name) err('manifest.webmanifest: name, start_url and display "standalone" are needed for the app to be installable');
  if (!read('js/player/background.js').includes('setActionHandler')) err('background.js: the lock-screen controls (Media Session) are missing');
}

notes.push(`${appJs.length} app scripts, ${buttons.length} modes, version ${appVer}`);
if (errors.length){
  console.log(errors.map(e => 'ERROR  ' + e).join('\n'));
  console.log(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log('check: 0 errors  (' + notes.join('; ') + ')');
