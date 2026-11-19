// Song map of one file, or a check of every test song:
//   node engine/songmap.js <file> [out.json]   writes the map (to out.json, or prints it)
//   node engine/songmap.js --check             every song in test-songs/: tempo against the user's counts
//                                              (FACTS.md "The test songs, counted by the user") and whether
//                                              the biggest drop is among the top three hits; fails if not
// Decodes with ffmpeg (on the PATH) at the song map's own rate and runs js/core/song-map.js, the same code
// the app runs in the browser. The format is in docs/GAME-PLAN.md ("song map").
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const SM = require('../js/core/song-map.js');

const MAX_SECONDS = 900;   // the app makes no map for a longer file either (js/player/seek-map.js)

function decode(file){
  const r = spawnSync('ffmpeg', ['-v', 'error', '-t', String(MAX_SECONDS), '-i', file, '-vn', '-ac', '1', '-ar', String(SM.C.rate), '-f', 'f32le', '-'],
                      { maxBuffer: 2 ** 31 - 1 });
  if (r.error) throw new Error('ffmpeg is needed on the PATH: ' + r.error.message);
  if (r.status !== 0) throw new Error(String(r.stderr));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}
function mapOf(file){
  const t0 = Date.now(), audio = decode(file), t1 = Date.now();
  const map = SM.build(audio, SM.C.rate);
  return { map, decodeMs: t1 - t0, buildMs: Date.now() - t1 };
}

// The user's counts (FACTS.md): BPM by name
const COUNTS = { 'Decensus Ad Nihilum': 77.70, 'Nightcore - To Be Human': 109.30, 'Want Some Fun': 85 };
// the biggest drop: the start of the section with the largest rise in energy over it
function biggestDrop(map){
  let best = null;
  for (const s of map.sections) if (s.jump > 0 && (!best || s.jump > best.jump)) best = s;
  return best;
}
function tempoOk(got, want){
  return [1, 0.5, 2].some(f => Math.abs(got - want * f) <= want * f * 0.03);
}

const args = process.argv.slice(2);
if (args[0] === '--check'){
  const dir = path.resolve(__dirname, '..', 'test-songs');
  if (!fs.existsSync(dir)){ console.log('songmap: no test-songs/ folder, nothing checked'); process.exit(0); }
  let fails = 0;
  for (const f of fs.readdirSync(dir).filter(f => /\.(mp3|mp4|m4a|ogg|wav|flac)$/i.test(f)).sort()){
    const name = f.replace(/\.[^.]+$/, '');
    if (/1 Hour/.test(name)) continue;            // an hour-long mix: cut at 900 s, no single tempo or drop
    const { map, decodeMs, buildMs } = mapOf(path.join(dir, f));
    const drop = biggestDrop(map), top3 = map.hits.slice(0, 3);
    const dropOk = !drop || top3.some(h => Math.abs(h.t - drop.start) <= 1);
    const want = COUNTS[name], tOk = want ? tempoOk(map.bpm, want) : true;
    const line = `${name.slice(0, 34).padEnd(34)} bpm ${String(map.bpm).padStart(6)}` +
      (want ? ` (counted ${want}${tOk ? ', ok' : ', OFF'})` : '') + ` conf ${map.confidence}` +
      ` | drop ${drop ? drop.start.toFixed(1) + ' s (+' + drop.jump + ')' : 'none'}` +
      ` | top hits ${top3.map(h => h.t.toFixed(1)).join(', ')}${dropOk ? '' : '  DROP NOT IN TOP 3'}` +
      ` | ${map.sections.length} sections, ${buildMs} ms`;
    console.log(line);
    if (!tOk || !dropOk) fails++;
  }
  console.log(fails ? `\n${fails} song(s) failed.` : '\nAll songs passed.');
  process.exit(fails ? 1 : 0);
} else if (args[0]){
  const { map } = mapOf(args[0]);
  const json = JSON.stringify(map);
  if (args[1]) fs.writeFileSync(args[1], json); else console.log(json);
} else {
  console.log('usage: node engine/songmap.js <file> [out.json]  |  node engine/songmap.js --check');
}
