/* ---------- Piano ----------
   A live analyser cannot know what is coming next, so notes cannot fall
   from above without the future. This is the piano-roll used by live
   visualizers: the keyboard lights up as notes sound and the roll of what
   just played scrolls upward away from the keys.

   Note detection on a full music mix (not a clean solo instrument) will
   never be perfect — see the write-up in the project notes for why — but
   it is tightened here with a broadband/percussive gate: a drum hit or
   noisy passage lights up the whole keyboard near-evenly, while a real
   note stays a sharp, lonely peak. When the keyboard-wide energy reads
   flat instead of peaky, detection gets much more skeptical that frame. */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var WHITE_SET = { 0: 1, 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1 };
  var pianoSegs = [], pianoOn = {}, pianoKeys = null, pianoKeyKey = '';
  var tapNotes = [];

  function noteName(m){ return NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1); }
  function noteFreq(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  function buildPianoKeys(){
    var cfg = Cfg.CFG.piano, w = canvas.width;
    var lo = Math.round(Math.min(cfg.low, cfg.high - 11)), hi = Math.round(Math.max(cfg.high, cfg.low + 11));
    var whites = [];
    for (var m = lo; m <= hi; m++) if (WHITE_SET[m % 12]) whites.push(m);
    var ww = w / Math.max(1, whites.length);
    pianoKeys = { lo: lo, hi: hi, white: [], black: [], ww: ww };
    var idx = 0;
    for (var n = lo; n <= hi; n++){
      if (WHITE_SET[n % 12]){
        pianoKeys.white.push({ m: n, x: idx * ww, w: ww });
        idx++;
      }
    }
    for (var b = lo; b <= hi; b++){
      if (WHITE_SET[b % 12]) continue;
      var prevWhite = null;
      for (var q = 0; q < pianoKeys.white.length; q++) if (pianoKeys.white[q].m < b) prevWhite = pianoKeys.white[q];
      if (!prevWhite) continue;
      pianoKeys.black.push({ m: b, x: prevWhite.x + ww * 0.62, w: ww * 0.68 });
    }
    pianoKeyKey = cfg.low + '|' + cfg.high + '|' + w;
  }
  function pianoXFor(m){
    if (!pianoKeys) return null;
    for (var i = 0; i < pianoKeys.white.length; i++) if (pianoKeys.white[i].m === m) return pianoKeys.white[i];
    for (var j = 0; j < pianoKeys.black.length; j++) if (pianoKeys.black[j].m === m) return pianoKeys.black[j];
    return null;
  }
  // Energy at one semitone, read from the fine analyser, using the raw
  // magnitude rather than the auto-gained value the visual modes use.
  function noteEnergy(m){
    var f = noteFreq(m);
    var data = Aud.pitchData || Aud.freqData;
    var rate = Aud.sampleRate / 2, n = data.length;
    var lo = Math.max(0, Math.min(n - 1, Math.round(f * 0.9715 / rate * n)));
    var hi = Math.max(lo, Math.min(n - 1, Math.round(f * 1.0293 / rate * n)));
    var mx = 0;
    for (var i = lo; i <= hi; i++) if (data[i] > mx) mx = data[i];
    return mx / 255;
  }
  // Idle demo so the keyboard shows something musical instead of lighting up
  // every key from the broadband idle signal.
  var DEMO = [60, 64, 67, 72, 67, 64, 62, 65, 69, 74, 69, 65, 59, 62, 67, 71];
  function demoNotes(out){
    var step = Math.floor(A.t * 2.2) % DEMO.length;
    var base = DEMO[step];
    var frac = (A.t * 2.2) % 1;
    var v = Math.max(0, 1 - frac) * 0.85;
    out[base] = v;
    if (base + 4 <= 108) out[base + 4] = v * 0.55;
    if (base + 7 <= 108) out[base + 7] = v * 0.45;
    if (base - 12 >= 21) out[base - 12] = v * 0.6;
  }
  // The fine spectrum arrives in decibels spread over 0..1. Notes are picked
  // in real signal strength instead, where a note really is many times
  // taller than what surrounds it (in decibels it is only a little taller).
  var DB_RANGE = 78;   // the engine's analysers cover -90..-12 dB
  function strength(v){ return Math.pow(10, (v - 1) * DB_RANGE / 20); }
  var seen = {};       // note -> how many frames in a row it has been found
  function detectNotes(){
    var cfg = Cfg.CFG.piano, out = {};
    if (!Aud.isLive()){ demoNotes(out); return out; }

    var lo = pianoKeys.lo, hi = pianoKeys.hi, m;
    var e = {}, list = [], peak = 1e-9;
    for (m = lo - 2; m <= hi + 2; m++){
      e[m] = strength(noteEnergy(m));
      if (m >= lo && m <= hi){ list.push(e[m]); if (e[m] > peak) peak = e[m]; }
    }
    list.sort(function(a, b){ return a - b; });
    var median = list[Math.floor(list.length / 2)] || 0;
    // A drum hit or a noisy passage lifts the whole keyboard at once; a note
    // is a lonely spike. When the keyboard as a whole is nearly as strong as
    // its strongest key, be much harder to convince.
    var noisy = U.clamp01((median / peak - 0.06) / 0.2);

    var scored = [];
    for (m = lo; m <= hi; m++){
      var v = e[m];
      // a local peak, not the skirt of the note next door
      if (e[m - 1] > v || e[m + 1] > v) continue;
      // clearly above its own neighbourhood (the spectrum slopes down toward
      // high notes, so each note is judged against the keys around it)
      var sum = 0, cnt = 0;
      for (var j = m - 7; j <= m + 7; j++){
        if (j === m || j < lo || j > hi) continue;
        sum += e[j]; cnt++;
      }
      var around = cnt ? sum / cnt : 0;
      if (v < around * (2.4 + noisy * 3)) continue;
      // An octave, an octave and a fifth, or two octaves below, at least as
      // strong: this is almost certainly an overtone of that lower note.
      var below = Math.max(e[m - 12] || 0, e[m - 19] || 0, e[m - 24] || 0);
      if (below > v * 0.9) v *= 0.3;
      // score: 1 at the strongest key, 0 at 36 dB below it
      var score = 1 + (20 * Math.log(v / peak) / Math.LN10) / 36;
      if (score > 0) scored.push({ m: m, v: score });
    }
    scored.sort(function(a, b){ return b.v - a.v; });
    var poly = Math.max(1, Math.round(cfg.polyphony * (1 - noisy * 0.7)));
    var now = {};
    for (var i = 0; i < scored.length && i < poly; i++){
      if (scored[i].v < cfg.threshold) break;
      now[scored[i].m] = Math.min(1, scored[i].v);
    }
    // a note must be there two frames running before it counts: one-frame
    // flickers are what made the roll look like static
    for (m = lo; m <= hi; m++){
      if (now[m]){
        seen[m] = (seen[m] || 0) + 1;
        if (seen[m] >= 2) out[m] = now[m];
      } else seen[m] = 0;
    }
    return out;
  }
  function drawPiano(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.piano;
    Can.backdrop(1);
    // Ask the engine to fill the fine (2.7 Hz) spectrum for the next frames.
    // Nothing else needs it, so it is only read while Piano is on screen.
    // (Before v0.1.0 nothing ever read it, so no note was ever detected.)
    Aud.wantPitch = 2;
    if (!pianoKeys || pianoKeyKey !== (cfg.low + '|' + cfg.high + '|' + w)) buildPianoKeys();

    var keyH = Math.min(h * 0.32, 92 * k);
    var keyTop = h - keyH;
    var rollSpeed = 70 * k * cfg.fall * Cfg.CFG.look.motion;
    var rollTime = keyTop / rollSpeed;
    var now = A.t;

    // note detection + roll history
    var active = detectNotes();
    for (var m = pianoKeys.lo; m <= pianoKeys.hi; m++){
      var e = active[m];
      if (e){
        if (pianoOn[m]) pianoOn[m].t1 = now;
        else { pianoOn[m] = { m: m, t0: now, t1: now, v: e }; pianoSegs.push(pianoOn[m]); }
        if (e > pianoOn[m].v) pianoOn[m].v = e;
      } else if (pianoOn[m]){
        if (now - pianoOn[m].t1 > 0.06 * cfg.sustain) delete pianoOn[m];
      }
    }
    for (var s = pianoSegs.length - 1; s >= 0; s--){
      if (now - pianoSegs[s].t1 > rollTime + 0.4) pianoSegs.splice(s, 1);
    }
    if (pianoSegs.length > 900) pianoSegs.splice(0, pianoSegs.length - 900);

    var nc = U.hexRGB(cfg.noteColor), ac = U.hexRGB(cfg.activeColor);
    for (var i = 0; i < pianoSegs.length; i++){
      var seg = pianoSegs[i];
      var kx = pianoXFor(seg.m);
      if (!kx) continue;
      var yBottom = keyTop - (now - seg.t1) * rollSpeed;
      var yTop = keyTop - (now - seg.t0) * rollSpeed;
      if (yBottom < 0) continue;
      var hgt = Math.max(2 * k, yBottom - yTop);
      var isBlack = !WHITE_SET[seg.m % 12];
      var fade = Math.max(0, 1 - (now - seg.t1) / (rollTime + 0.001));
      ctx.fillStyle = U.rgba(isBlack ? ac : nc, (0.25 + seg.v * 0.6 * fade).toFixed(3));
      U.roundRect(ctx, kx.x + kx.w * 0.12, Math.max(0, yTop), kx.w * 0.76, hgt, Math.min(3 * k, kx.w * 0.3));
      ctx.fill();
    }

    // keyboard — a tight accent line marks a pressed key, not a full wash
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, keyTop - 3 * k, w, 3 * k);
    var wc = U.hexRGB(cfg.keyColor);
    for (var wq = 0; wq < pianoKeys.white.length; wq++){
      var wk = pianoKeys.white[wq];
      var on = active[wk.m] || 0;
      var kg = ctx.createLinearGradient(0, keyTop, 0, keyTop + keyH);
      kg.addColorStop(0, U.rgba(wc, '0.99'));
      kg.addColorStop(1, U.rgba(wc, '0.86'));
      ctx.fillStyle = kg;
      ctx.fillRect(wk.x + 0.5, keyTop, wk.w - 1, keyH);
      if (on){
        ctx.fillStyle = U.rgba(ac, (0.85 + on * 0.15).toFixed(3));
        ctx.fillRect(wk.x + 0.5, keyTop, wk.w - 1, 2.4 * k);
        ctx.fillRect(wk.x + 0.5, keyTop + keyH - 2.4 * k, wk.w - 1, 2.4 * k);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(wk.x + 0.5, keyTop, wk.w - 1, keyH);
      if (cfg.labels && wk.m % 12 === 0){
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.font = Math.min(9 * k, wk.w * 0.6) + 'px Karla, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(noteName(wk.m), wk.x + wk.w / 2, h - 4 * k);
      }
    }
    for (var bq = 0; bq < pianoKeys.black.length; bq++){
      var bk = pianoKeys.black[bq];
      var bon = active[bk.m] || 0;
      ctx.fillStyle = 'rgba(18,14,24,0.97)';
      ctx.fillRect(bk.x, keyTop, bk.w, keyH * 0.62);
      if (bon){
        ctx.fillStyle = U.rgba(ac, (0.85 + bon * 0.15).toFixed(3));
        ctx.fillRect(bk.x, keyTop + keyH * 0.62 - 2.4 * k, bk.w, 2.4 * k);
      }
    }
  }

  function paintBG(c, w, h){
    for (var gl = 0; gl < 6; gl++){
      var pg = c.createRadialGradient(w * (0.1 + gl * 0.17), h * 0.3, 0, w * (0.1 + gl * 0.17), h * 0.3, w * 0.22);
      pg.addColorStop(0, 'rgba(123,211,247,0.055)');
      pg.addColorStop(1, 'rgba(123,211,247,0)');
      c.fillStyle = pg;
      c.fillRect(0, 0, w, h);
    }
  }

  // Touch: releases falling music notes coloured like the piano's own palette
  function onTap(x, y){
    var k = Can.dpr(), cfg = Cfg.CFG.piano;
    for (var n = 0; n < 5; n++){
      tapNotes.push({ x: x + (Math.random() - 0.5) * 24 * k, y: y, age: 0,
                      life: 1.6 + Math.random(), vx: (Math.random() - 0.5) * 26 * k,
                      vy: -(30 + Math.random() * 46) * k, rot: (Math.random() - 0.5) * 0.6,
                      size: (11 + Math.random() * 10) * k,
                      col: Math.random() < 0.5 ? cfg.noteColor : cfg.activeColor });
    }
    if (pianoKeys){
      for (var q = 0; q < pianoKeys.white.length; q++){
        var wk = pianoKeys.white[q];
        if (x >= wk.x && x < wk.x + wk.w){ pianoSegs.push({ m: wk.m, t0: A.t, t1: A.t + 0.14, v: 0.9 }); break; }
      }
    }
  }
  function drawTapFX(){
    var dt = A.dt;
    for (var nIdx = tapNotes.length - 1; nIdx >= 0; nIdx--){
      var nt = tapNotes[nIdx];
      nt.age += dt;
      if (nt.age > nt.life){ tapNotes.splice(nIdx, 1); continue; }
      nt.x += nt.vx * dt + Math.sin(A.t * 2.4 + nt.age * 3) * 12 * Can.dpr() * dt;
      nt.y += nt.vy * dt;
      nt.vy += 6 * Can.dpr() * dt;
      var f4 = nt.age / nt.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, f4 / 0.15) * (1 - f4);
      ctx.translate(nt.x, nt.y);
      ctx.rotate(nt.rot);
      ctx.fillStyle = nt.col;
      ctx.font = nt.size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎶', 0, 0);
      ctx.restore();
    }
  }

  function reset(){ pianoSegs = []; pianoOn = {}; pianoKeys = null; seen = {}; }

  App.modes.register('piano', { draw: drawPiano, paintBG: paintBG, onTap: onTap, drawTapFX: drawTapFX, reset: reset });

  App.cfg.registerDefaults('piano', {
    low: 36, high: 96, threshold: 0.4, polyphony: 6, fall: 1, labels: true, sustain: 1,
    keyColor: '#F4ECE1', activeColor: '#E0728A', noteColor: '#7BD3F7',
    bg1: '#161127', bg2: '#05030C'
  });
  App.cfg.registerSchema({ id: 'piano', label: 'Piano', fields: [
    ['low', 'Lowest note (MIDI)', 'range', 21, 72, 1],
    ['high', 'Highest note (MIDI)', 'range', 48, 108, 1],
    ['threshold', 'Note detection threshold', 'range', 0.05, 0.9, 0.01],
    ['polyphony', 'Max notes at once', 'range', 1, 16, 1],
    ['fall', 'Roll speed', 'range', 0.3, 3, 0.05],
    ['sustain', 'Note hold', 'range', 0.2, 3, 0.05],
    ['labels', 'Note labels', 'bool'],
    ['keyColor', 'White keys', 'color'],
    ['activeColor', 'Pressed key', 'color'],
    ['noteColor', 'Falling notes', 'color'],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
})();
