// Engine test on real songs:  node engine/songtest.js [nameFilter] [--tune]
// Decodes each file in test-songs/ with ffmpeg, rebuilds what the browser's
// AnalyserNode would hand the engine (Blackman window, 2048-point FFT,
// smoothing over time, decibels to 0-255 exactly as the Web Audio
// specification describes), and runs the same js/core/analysis.js the app
// runs. Reports how the engine behaves in the loudest and the quietest
// 15 seconds of each song, and fails if it misbehaves:
//   - the bass band pinned at the top (no room for a beat to stand out)
//   - no beats found in a loud passage
//   - a quiet passage that looks as busy as a loud one
// --tune prints the same numbers for several candidate settings.
// Needs ffmpeg on the PATH. test-songs/ is not part of the repository.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createAnalyzer, DEFAULT_CFG } = require('../js/core/analysis.js');

const DIR = path.resolve(__dirname, '..', 'test-songs');
const args = process.argv.slice(2);
const TUNE = args.includes('--tune');
const filter = args.find(a => !a.startsWith('--')) || '';
const SR = 44100, N = 2048, FPS = 60, MAX_SECONDS = 600;

/* ---------- FFT with the analyser's Blackman window ---------- */
const win = new Float32Array(N);
for (let i = 0; i < N; i++) win[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / N) + 0.08 * Math.cos(4 * Math.PI * i / N);
const rev = new Uint32Array(N);
for (let i = 0; i < N; i++){ let r = 0; for (let b = 0; b < 11; b++) r |= ((i >> b) & 1) << (10 - b); rev[i] = r; }
const cosT = new Float64Array(N / 2), sinT = new Float64Array(N / 2);
for (let i = 0; i < N / 2; i++){ cosT[i] = Math.cos(-2 * Math.PI * i / N); sinT[i] = Math.sin(-2 * Math.PI * i / N); }
const re = new Float64Array(N), im = new Float64Array(N);
function magnitudes(sig, end, out){
  for (let i = 0; i < N; i++){ const s = sig[end - N + i] || 0; re[rev[i]] = s * win[i]; im[rev[i]] = 0; }
  for (let size = 2; size <= N; size <<= 1){
    const half = size >> 1, step = N / size;
    for (let i = 0; i < N; i += size){
      for (let j = 0; j < half; j++){
        const wr = cosT[j * step], wi = sinT[j * step], a = i + j, b = a + half;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
  for (let i = 0; i < N / 2; i++) out[i] = Math.hypot(re[i], im[i]) / N;
}

function decode(file){
  const r = spawnSync('ffmpeg', ['-v', 'error', '-t', String(MAX_SECONDS), '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'],
                      { maxBuffer: 2 ** 31 - 1 });
  if (r.error) throw new Error('ffmpeg is needed on the PATH: ' + r.error.message);
  if (r.status !== 0) throw new Error(String(r.stderr));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}

// one pass of the engine over a decoded song; returns per-frame records
function run(audio, v){
  const An = createAnalyzer();
  const bytes = new Uint8Array(N / 2), mag = new Float32Array(N / 2), smooth = new Float32Array(N / 2);
  An.setData(bytes, SR, v.minDb, v.maxDb);
  const cfg = Object.assign({}, DEFAULT_CFG, v.cfg);
  const hop = SR / FPS, frames = Math.floor(audio.length / hop) - 1, tau = v.smoothing;
  const out = { level: new Float32Array(frames), bass: new Float32Array(frames), loud: new Float32Array(frames),
                drive: new Float32Array(frames),
                beat: new Uint8Array(frames), kick: new Uint8Array(frames), snare: new Uint8Array(frames),
                hat: new Uint8Array(frames), onset: new Uint8Array(frames), frames };
  let pk = 0, ps = 0, ph = 0;
  for (let f = 0; f < frames; f++){
    magnitudes(audio, Math.round((f + 1) * hop), mag);
    for (let i = 0; i < N / 2; i++){
      smooth[i] = tau * smooth[i] + (1 - tau) * mag[i];
      const db = 20 * Math.log10(smooth[i] || 1e-12);
      const b = Math.floor(255 / (v.maxDb - v.minDb) * (db - v.minDb));
      bytes[i] = b < 0 ? 0 : (b > 255 ? 255 : b);
    }
    const A = An.analyze(1 / FPS, f / FPS, cfg);
    out.level[f] = A.level; out.bass[f] = A.bass; out.loud[f] = A.loudness; out.drive[f] = A.drive;
    out.beat[f] = A.beat ? 1 : 0; out.onset[f] = A.onset ? 1 : 0;
    // a pulse counts once, on the frame it jumps up
    out.kick[f] = A.kick > pk + 0.05 ? 1 : 0; out.snare[f] = A.snare > ps + 0.05 ? 1 : 0; out.hat[f] = A.hat > ph + 0.05 ? 1 : 0;
    pk = A.kick; ps = A.snare; ph = A.hat;
  }
  return out;
}
function windowStats(o, f0, f1){
  const n = f1 - f0, bass = Array.from(o.bass.subarray(f0, f1)).sort((a, b) => a - b);
  let level = 0, drive = 0, sat = 0, beats = 0, kicks = 0, snares = 0, hats = 0, onsets = 0;
  for (let f = f0; f < f1; f++){
    level += o.level[f]; drive += o.drive[f]; if (o.bass[f] > 0.97) sat++;
    beats += o.beat[f]; kicks += o.kick[f]; snares += o.snare[f]; hats += o.hat[f]; onsets += o.onset[f];
  }
  const perMin = c => Math.round(c / (n / FPS) * 60);
  return { level: level / n, drive: drive / n, bassP10: bass[Math.floor(n * 0.1)], bassMed: bass[n >> 1], bassP90: bass[Math.floor(n * 0.9)],
           sat: sat / n, beats: perMin(beats), kicks: perMin(kicks), snares: perMin(snares), hats: perMin(hats), onsets: perMin(onsets) };
}
// loudest and quietest 15 s, judged on the raw signal so every variant gets the same windows
function pickWindows(audio){
  const hop = SR / FPS, frames = Math.floor(audio.length / hop) - 1, W = 15 * FPS;
  const rms = new Float32Array(frames);
  for (let f = 0; f < frames; f++){ let e = 0; const s = Math.round(f * hop); for (let i = 0; i < hop; i++){ const x = audio[s + i] || 0; e += x * x; } rms[f] = Math.sqrt(e / hop); }
  let best = [-1, 0], worst = [Infinity, 0];
  // skip the first and last 8 s: fades are not "the quiet part of the song"
  for (let f0 = 8 * FPS; f0 + W < frames - 8 * FPS; f0 += FPS){
    let m = 0; for (let f = f0; f < f0 + W; f++) m += rms[f]; m /= W;
    if (m > best[0]) best = [m, f0];
    if (m < worst[0]) worst = [m, f0];
  }
  return { loud: [best[1], best[1] + W], quiet: [worst[1], worst[1] + W], loudRms: best[0], quietRms: worst[0] };
}

const SHIPPED = { name: 'shipped', minDb: -90, maxDb: -12, smoothing: 0.5, cfg: {} };
const VARIANTS = TUNE ? [
  { name: 'curve .35', minDb: -90, maxDb: -12, smoothing: 0.5, cfg: { curve: 0.35 } },
  { name: 'curve .65', minDb: -90, maxDb: -12, smoothing: 0.5, cfg: { curve: 0.65 } },
  { name: 'no tilt', minDb: -90, maxDb: -12, smoothing: 0.5, cfg: { tilt: 0 } },
  { name: 'autoGain 1', minDb: -90, maxDb: -12, smoothing: 0.5, cfg: { autoGain: 1 } },
  { name: 'autoGain .3', minDb: -90, maxDb: -12, smoothing: 0.5, cfg: { autoGain: 0.3 } },
  SHIPPED
] : [SHIPPED];

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(n => /\.(mp3|mp4|m4a|flac|ogg|opus|wav|webm)$/i.test(n) && n.includes(filter)) : [];
if (!files.length){ console.log('No songs found in test-songs/ - nothing to test.'); process.exit(0); }

const fmt = (x, d = 2) => x.toFixed(d).padStart(5);
let failures = 0;
for (const name of files){
  const audio = decode(path.join(DIR, name));
  const w = pickWindows(audio);
  console.log(`\n${name}   (${(audio.length / SR).toFixed(0)} s analysed; loud window at ${(w.loud[0] / FPS).toFixed(0)} s, quiet at ${(w.quiet[0] / FPS).toFixed(0)} s, quiet is ${(w.quietRms / w.loudRms * 100).toFixed(0)}% as strong)`);
  console.log('  setting        part   level drive  bass p10/med/p90   pinned  beats kicks snares hats onsets  (per minute)');
  for (const v of VARIANTS){
    const o = run(audio, v);
    const L = windowStats(o, w.loud[0], w.loud[1]), Q = windowStats(o, w.quiet[0], w.quiet[1]);
    for (const [tag, s] of [['loud ', L], ['quiet', Q]]){
      console.log(`  ${v.name.padEnd(13)}  ${tag}  ${fmt(s.level)} ${fmt(s.drive)}  ${fmt(s.bassP10)} ${fmt(s.bassMed)} ${fmt(s.bassP90)}   ${(s.sat * 100).toFixed(0).padStart(4)}%  ${String(s.beats).padStart(5)} ${String(s.kicks).padStart(5)} ${String(s.snares).padStart(6)} ${String(s.hats).padStart(4)} ${String(s.onsets).padStart(6)}`);
    }
    if (v === SHIPPED){
      const problems = [];
      if (L.sat > 0.25) problems.push(`bass pinned at the top ${(L.sat * 100).toFixed(0)}% of the loud part`);
      if (L.beats < 20 && L.kicks < 20) problems.push('almost no beats or kicks found in the loud part');
      if (L.bassP90 - L.bassP10 < 0.15) problems.push('bass barely moves in the loud part');
      if (w.quietRms / w.loudRms < 0.6 && Q.level > L.level * 0.92) problems.push('the quiet part looks as busy as the loud part');
      // "drive" is what the modes scale by: when the quiet part really is much quieter it must read lower
      if (w.quietRms / w.loudRms < 0.6 && Q.drive > L.drive - 0.15) problems.push(`drive barely differs between loud (${L.drive.toFixed(2)}) and quiet (${Q.drive.toFixed(2)})`);
      if (problems.length){ failures++; console.log('  FAIL: ' + problems.join('; ')); }
      else console.log('  ok');
    }
  }
}
console.log(failures ? `\n${failures} song(s) failed.` : '\nAll songs passed.');
process.exit(failures ? 1 : 0);
