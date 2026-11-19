// Engine self-test:  node engine/test.js
// Feeds js/core/analysis.js made-up spectra with a known right answer
// (silence, a steady tone, a kick drum at 120 a minute, a hi-hat, the same
// music 20 dB quieter) and checks what comes out. No audio files needed.
// Run it after any change to analysis.js; add a check with each new feature.
'use strict';
const { createAnalyzer, DEFAULT_CFG } = require('../js/core/analysis.js');

const SR = 44100, BINS = 1024, FPS = 60, MIN_DB = -90, MAX_DB = -12;
let passed = 0, failed = 0;
function check(name, ok, detail){
  if (ok) passed++; else failed++;
  console.log((ok ? '  ok    ' : '  FAIL  ') + name + (detail ? '   (' + detail + ')' : ''));
}
const byteOf = db => Math.max(0, Math.min(255, Math.floor(255 / (MAX_DB - MIN_DB) * (db - MIN_DB))));
const binOf = hz => Math.round(hz / (SR / 2) * BINS);

// builds a spectrum: a quiet noise bed plus bumps of [hz, dB, widthBins]
function spectrum(bytes, bedDb, bumps){
  for (let i = 0; i < BINS; i++) bytes[i] = byteOf(bedDb);
  for (const [hz, db, width] of bumps){
    const c = binOf(hz), w = width || 2;
    for (let i = Math.max(0, c - w); i <= Math.min(BINS - 1, c + w); i++) bytes[i] = Math.max(bytes[i], byteOf(db));
  }
}
// runs `seconds` of frames; scene(t) returns { bed, bumps }
function simulate(seconds, scene, cfg){
  const An = createAnalyzer(), bytes = new Uint8Array(BINS);
  An.setData(bytes, SR, MIN_DB, MAX_DB);
  const c = Object.assign({}, DEFAULT_CFG, cfg);
  const st = { beats: 0, kicks: 0, snares: 0, hats: 0, level: 0, bass: 0, mid: 0, high: 0, n: 0, maxAny: 0, A: An.A, An, c };
  let pk = 0, ps = 0, ph = 0;
  const frames = Math.round(seconds * FPS), settle = Math.round(1.5 * FPS);
  for (let f = 0; f < frames; f++){
    const s = scene(f / FPS);
    spectrum(bytes, s.bed, s.bumps);
    const A = An.analyze(1 / FPS, f / FPS, c);
    if (f < settle){ pk = A.kick; ps = A.snare; ph = A.hat; continue; }
    st.n++;
    if (A.beat) st.beats++;
    if (A.kick > pk + 0.05) st.kicks++;
    if (A.snare > ps + 0.05) st.snares++;
    if (A.hat > ph + 0.05) st.hats++;
    pk = A.kick; ps = A.snare; ph = A.hat;
    st.level += A.level; st.bass += A.bass; st.mid += A.mid; st.high += A.high;
    st.maxAny = Math.max(st.maxAny, A.sub, A.bass, A.lowMid, A.mid, A.high, A.air, A.level);
  }
  for (const k of ['level', 'bass', 'mid', 'high']) st[k] /= st.n;
  st.perMin = x => x / (st.n / FPS) * 60;
  return st;
}
// a drum that hits `bpm` times a minute and fades over ~0.12 s
const hit = (t, bpm) => Math.exp(-((t * bpm / 60) % 1) / (bpm / 60) / 0.12);

console.log('analysis.js self-test');

// 1. silence
let s = simulate(4, () => ({ bed: -120, bumps: [] }));
check('silence gives zero level and no beats', s.level === 0 && s.beats === 0 && s.maxAny === 0, `level ${s.level}, beats ${s.beats}`);

// 2. a steady bass tone: bass band leads, and a constant sound is not a beat
s = simulate(6, () => ({ bed: -80, bumps: [[100, -22, 3]] }));
check('steady 100 Hz tone: bass is the strongest band', s.bass > s.mid && s.bass > s.high && s.bass > 0.3, `bass ${s.bass.toFixed(2)} mid ${s.mid.toFixed(2)}`);
check('steady tone makes no beats', s.beats === 0, `${s.beats} beats`);

// 3. kick drum at 120 a minute over a soft bed
s = simulate(12, t => ({ bed: -70, bumps: [[70, -60 + 40 * hit(t, 120), 4], [1000, -55, 30]] }));
const bpm = s.perMin(s.beats);
check('kick at 120 a minute: beats counted within 10%', bpm > 108 && bpm < 132, `${bpm.toFixed(0)} a minute`);
check('kick at 120 a minute: kick pulses fire', s.perMin(s.kicks) > 100, `${s.perMin(s.kicks).toFixed(0)} a minute`);
check('kick alone does not fire the hi-hat detector', s.hats === 0, `${s.hats} hats`);

// 4. hi-hat at 240 a minute, no bass movement
s = simulate(10, t => ({ bed: -75, bumps: [[90, -30, 3], [9000, -75 + 35 * hit(t, 240), 60]] }));
check('hi-hat: hat pulses fire', s.perMin(s.hats) > 200, `${s.perMin(s.hats).toFixed(0)} a minute`);
check('hi-hat does not make beats', s.beats === 0, `${s.beats} beats`);

// 5. the same music 20 dB quieter must look clearly smaller, and loud music must not pin at the top
// (a full mix: something in every band, falling away toward the top as real music does)
const song = off => t => ({ bed: -80 + off, bumps: [
  [45, -34 + off, 1], [70, -42 + 24 * hit(t, 120) + off, 4], [300, -30 + off, 7],
  [1000, -38 + off, 30], [3500, -46 + off, 90], [9000, -56 + off, 180]] });
// one run: 10 s loud, then the same thing 20 dB down (the auto level remembers the loud part)
const An2 = createAnalyzer(), bytes2 = new Uint8Array(BINS);
An2.setData(bytes2, SR, MIN_DB, MAX_DB);
let loud = 0, quiet = 0, nl = 0, nq = 0, pinned = 0;
for (let f = 0; f < 16 * FPS; f++){
  const t = f / FPS, sc = song(t < 10 ? 0 : -20)(t);
  spectrum(bytes2, sc.bed, sc.bumps);
  const A = An2.analyze(1 / FPS, t, DEFAULT_CFG);
  if (t > 3 && t < 10){ loud += A.level; nl++; if (A.bass > 0.97) pinned++; }
  if (t > 11 && t < 15){ quiet += A.level; nq++; }
}
loud /= nl; quiet /= nq;
check('a passage 20 dB quieter looks clearly smaller', quiet < loud * 0.6, `loud ${loud.toFixed(2)}, quiet ${quiet.toFixed(2)}`);
check('a loud passage is not pinned at the top', pinned / nl < 0.1, `${(pinned / nl * 100).toFixed(0)}% of frames above 0.97`);
check('a loud passage is clearly visible', loud > 0.3, `level ${loud.toFixed(2)}`);

// 6. bars(): position, range, neighbours
{
  const An = createAnalyzer(), bytes = new Uint8Array(BINS);
  An.setData(bytes, SR, MIN_DB, MAX_DB);
  spectrum(bytes, -85, [[415, -20, 1]]);
  An.analyze(1 / FPS, 0, DEFAULT_CFG);
  const out = new Float32Array(64);
  An.bars(out, { lo: 30, hi: 800, scale: 'lin', blur: 0 }, DEFAULT_CFG);
  let peak = 0; for (let i = 1; i < 64; i++) if (out[i] > out[peak]) peak = i;
  const expect = Math.floor((415 - 30) / (800 - 30) * 64);
  check('bars: a 415 Hz tone lands on the right bar of a 30-800 Hz layout', Math.abs(peak - expect) <= 2, `bar ${peak}, expected about ${expect}`);
  let inRange = true; for (const v of out) if (!(v >= 0 && v <= 1)) inRange = false;
  check('bars: every value is between 0 and 1', inRange);
  const sharp = out[peak + 3];
  An.bars(out, { lo: 30, hi: 800, scale: 'lin', blur: 1 }, DEFAULT_CFG);
  check('bars: "rounded peaks" spreads a peak onto its neighbours', out[peak + 3] >= sharp && out[peak + 2] > 0, `${sharp.toFixed(3)} -> ${out[peak + 3].toFixed(3)}`);
  const logOut = new Float32Array(64);
  An.bars(logOut, { lo: 28, hi: 16000, scale: 'log', blur: 0 }, DEFAULT_CFG);
  let lp = 0; for (let i = 1; i < 64; i++) if (logOut[i] > logOut[lp]) lp = i;
  const le = Math.floor(Math.log(415 / 28) / Math.log(16000 / 28) * 64);
  check('bars: the same tone lands on the right bar of a full log layout', Math.abs(lp - le) <= 2, `bar ${lp}, expected about ${le}`);
}

// 7. shape is never above 1 and never decreases as the input rises
{
  const An = createAnalyzer();
  An.setData(new Uint8Array(BINS), SR, MIN_DB, MAX_DB);
  An.analyze(1 / FPS, 0, DEFAULT_CFG);
  let ok = true, prev = -1;
  for (let v = 0; v <= 1.0001; v += 0.01){
    const y = An.shape(v, DEFAULT_CFG, 300);
    if (y < prev - 1e-9 || y > 1) ok = false;
    prev = y;
  }
  check('shape() rises steadily and stays at or below 1', ok);
}

// 8. energy and drive: "how big is this part of the song"
{
  const An = createAnalyzer(), bytes = new Uint8Array(BINS);
  An.setData(bytes, SR, MIN_DB, MAX_DB);
  let dLoud = 0, dQuiet = 0, nl2 = 0, nq2 = 0, hitFrames = 0, hitSum = 0;
  for (let f = 0; f < 22 * FPS; f++){
    const t = f / FPS, sc = song(t < 10 ? 0 : -20)(t);
    spectrum(bytes, sc.bed, sc.bumps);
    const A = An.analyze(1 / FPS, t, DEFAULT_CFG);
    if (t > 5 && t < 10){ dLoud += A.drive; nl2++; if (A.kickHit > 0){ hitFrames++; hitSum += A.kickHit; } }
    if (t > 17 && t < 22){ dQuiet += A.drive; nq2++; }
  }
  dLoud /= nl2; dQuiet /= nq2;
  check('drive is high in a loud passage', dLoud > 0.6, `drive ${dLoud.toFixed(2)}`);
  // The window is 7 to 12 s after the drop, by which time the auto level (14 s memory) has turned the quiet
  // part up by about half, on purpose. Real quiet passages read 0.14 to 0.25 (engine/README.md); this steady
  // made-up signal is the hardest case, so the limit is 0.35: still under half of the loud passage's drive.
  check('drive falls to calm when the music drops 20 dB', dQuiet < 0.35 && dQuiet < dLoud * 0.5, `drive ${dQuiet.toFixed(2)}`);
  // 5 s at 120 a minute = 10 kicks; kickHit must be a one-frame event, not a held value
  check('kickHit fires once per kick (one frame each)', hitFrames >= 8 && hitFrames <= 12 && hitSum > 0, `${hitFrames} frames in 5 s`);
  const An0 = createAnalyzer(), b0 = new Uint8Array(BINS);
  An0.setData(b0, SR, MIN_DB, MAX_DB);
  for (let f = 0; f < 120; f++) An0.analyze(1 / FPS, f / FPS, DEFAULT_CFG);
  check('silence gives zero energy and drive', An0.A.energy === 0 && An0.A.drive === 0, `energy ${An0.A.energy}`);
}

// 9. the picture layer (js/core/fx.js): still when calm, moves on a kick when loud, settles again
{
  const fx = require('../js/core/fx.js');
  const run = (drive, amount) => {
    const s = fx.create();
    let maxZoom = 1, maxShake = 0, maxFlash = 0;
    for (let f = 0; f < 60; f++){
      const hitNow = f === 10;
      const pulse = f >= 10 ? Math.exp(-9 * (f - 10) / FPS) : 0;
      fx.step(s, { kick: pulse, snare: pulse, beat: hitNow, beatStrength: hitNow ? 0.9 : 0, drive }, 1 / FPS, amount);
      maxZoom = Math.max(maxZoom, s.zoom); maxShake = Math.max(maxShake, Math.abs(s.x), Math.abs(s.y)); maxFlash = Math.max(maxFlash, s.flash);
    }
    return { maxZoom, maxShake, maxFlash, end: s };
  };
  const loudHit = run(1, 1), calmHit = run(0.1, 1), off = run(1, 0);
  check('picture layer: a kick in a loud passage zooms, shakes and flashes', loudHit.maxZoom > 1.015 && loudHit.maxShake > 0.1 && loudHit.maxFlash > 0.03,
        `zoom ${loudHit.maxZoom.toFixed(3)}, shake ${loudHit.maxShake.toFixed(2)}, flash ${loudHit.maxFlash.toFixed(3)}`);
  check('picture layer: the same kick in a calm passage barely moves it', calmHit.maxZoom < 1.002 && calmHit.maxShake < 0.02,
        `zoom ${calmHit.maxZoom.toFixed(4)}, shake ${calmHit.maxShake.toFixed(3)}`);
  check('picture layer: it settles back within a second', loudHit.end.zoom < 1.003 && Math.abs(loudHit.end.x) < 0.01, `zoom ${loudHit.end.zoom.toFixed(4)}`);
  check('picture layer: amount 0 switches it off', off.maxZoom === 1 && off.maxShake === 0 && off.maxFlash === 0);
  check('picture layer: zoom never passes 10%', run(1, 2).maxZoom <= 1.1);
}

/* song map (ROADMAP item 6): a made-up song of known tempo, a quiet half and a loud half */
{
  const SM = require('../js/core/song-map.js');
  const sr = SM.C.rate, secs = 60, bpmIn = 128, a = new Float32Array(sr * secs);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let i = 0; i < a.length; i++){
    const t = i / sr, beat = t * bpmIn / 60, ph = (beat % 1) * 60 / bpmIn, loud = t >= 30 ? 1 : 0.12;
    const kick = Math.sin(2 * Math.PI * 55 * ph) * Math.exp(-ph * 18);
    const hat = (Math.floor(beat * 2) % 2 === 1 ? rnd() * Math.exp(-(((beat * 2) % 1) * 30 / bpmIn) * 60) : 0);
    a[i] = loud * (0.7 * kick + 0.25 * hat) + 0.02 * Math.sin(2 * Math.PI * 220 * t);
  }
  const map = SM.build(a, sr);
  const tempoOk = [1, 0.5, 2].some(f => Math.abs(map.bpm - bpmIn * f) <= bpmIn * f * 0.01);
  check('song map: a 128 a minute kick reads 128 (or half or double) within 1%', tempoOk, `${map.bpm}`);
  const gaps = map.beats.slice(1).map((b, i) => b - map.beats[i]), mean = gaps.reduce((s, g) => s + g, 0) / Math.max(1, gaps.length);
  check('song map: the beats are evenly spaced', gaps.length > 40 && gaps.every(g => Math.abs(g - mean) < 0.03), `${gaps.length} gaps, mean ${mean.toFixed(3)} s`);
  const drop = map.sections.find(s => Math.abs(s.start - 30) < 1);
  check('song map: the jump from quiet to loud at 30 s starts a section', !!drop && drop.jump > 0.2, map.sections.map(s => s.start).join(', '));
  check('song map: that drop is the strongest hit', map.hits.length > 0 && Math.abs(map.hits[0].t - 30) < 1, map.hits.slice(0, 3).map(h => h.t).join(', '));
  check('song map: confidence is between 0 and 1', map.confidence >= 0 && map.confidence <= 1, `${map.confidence}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
