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
   flat instead of peaky, detection gets much more skeptical that frame.

   What happens at the keys follows the piano video in test-songs (measured
   2026-11-16, docs/RESEARCH.md section 6): a white flash where a note
   meets the keyboard, small flames rising from every key that is held,
   the whole key taking the note's colour, and a roll that moves 0.35
   screen heights a second. The colours stay Piano's own (user,
   2026-11-16): the video was the example for the behaviour, not the
   palette. */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var WHITE_SET = { 0: 1, 2: 1, 4: 1, 5: 1, 7: 1, 9: 1, 11: 1 };
  var pianoSegs = [], pianoOn = {}, pianoKeys = null, pianoKeyKey = '';
  var tapNotes = [];
  var wisps = [], glows = [];          // flames rising from held keys; the flash where a note starts

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
  // With nothing playing, the keyboard plays the engine's silent "ghost
  // song" (audio-engine.js): its bass note, its held chord and its running
  // arpeggio, the same notes the other modes are reacting to.
  function demoNotes(out){
    var s = Aud.idleSong();
    if (s.arp > 0.25) out[s.arpNote] = Math.min(1, s.arp);
    if (s.bass > 0.2) out[s.chord.root] = Math.min(1, s.bass + 0.2);
    for (var i = 0; i < 3; i++) out[s.chord.tones[i]] = Math.max(out[s.chord.tones[i]] || 0, 0.42);
  }
  // one colour per octave, low (red) to high (violet)
  function octaveRGB(m){
    var hue = ((Math.floor(m / 12) - 2) * 47 + 350) % 360, c = 0.62, x = c * (1 - Math.abs((hue / 60) % 2 - 1)), mm = 0.33;
    var r = 0, g = 0, b = 0, hp = hue / 60;
    if (hp < 1){ r = c; g = x; } else if (hp < 2){ r = x; g = c; } else if (hp < 3){ g = c; b = x; }
    else if (hp < 4){ g = x; b = c; } else if (hp < 5){ r = x; b = c; } else { r = c; b = x; }
    return [Math.round((r + mm) * 255), Math.round((g + mm) * 255), Math.round((b + mm) * 255)];
  }
  // the colour a note is drawn in: by octave, or the two colours from the settings
  function noteRGB(m){
    var cfg = Cfg.CFG.piano;
    if (cfg.octaves) return octaveRGB(m);
    return U.hexRGB(WHITE_SET[m % 12] ? cfg.noteColor : cfg.activeColor);
  }
  // n small flames from the top of key m; v = how strong the note is (0..1)
  function spawnWisps(m, v, n){
    var kx = pianoXFor(m);
    if (!kx) return;
    var k = Can.dpr(), rgb = noteRGB(m), big = 0.7 + 0.6 * A.drive;   // bigger in a big part of the song
    for (var i = 0; i < n && wisps.length < 260; i++){
      wisps.push({ x: kx.x + kx.w / 2 + (Math.random() - 0.5) * kx.w * 0.6, up: 0,
                   vx: (Math.random() - 0.5) * 16 * k, vy: (38 + Math.random() * 46) * k * big,
                   age: 0, life: 0.35 + Math.random() * 0.5, ph: Math.random() * 6.283,
                   r: (2.2 + Math.random() * 2.6) * k * big * (0.6 + 0.4 * v), rgb: rgb });
    }
  }
  function drawWisps(keyTop, dt, now){
    var k = Can.dpr(), i;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = wisps.length - 1; i >= 0; i--){
      var wp = wisps[i];
      wp.age += dt;
      if (wp.age >= wp.life){ wisps.splice(i, 1); continue; }
      var f = wp.age / wp.life;
      wp.up += wp.vy * dt * (1 - f * 0.5);
      wp.x += wp.vx * dt;
      var r = wp.r * (1 - f * 0.6);
      ctx.fillStyle = U.rgba(wp.rgb, ((1 - f) * 0.5).toFixed(3));
      ctx.beginPath();
      ctx.ellipse(wp.x + Math.sin(now * 9 + wp.ph) * 3 * k * f, keyTop - wp.up, r * 0.7, r * 1.6, 0, 0, 6.283);
      ctx.fill();
    }
    for (i = glows.length - 1; i >= 0; i--){
      var gl = glows[i];
      gl.age += dt;
      if (gl.age >= 0.32){ glows.splice(i, 1); continue; }
      var kx = pianoXFor(gl.m);
      if (!kx) continue;
      var g = 1 - gl.age / 0.32, cx = kx.x + kx.w / 2, rad = (9 + 12 * g) * k * (0.7 + 0.5 * gl.v);
      var grad = ctx.createRadialGradient(cx, keyTop, 0, cx, keyTop, rad);
      grad.addColorStop(0, 'rgba(255,255,255,' + (0.95 * g).toFixed(3) + ')');
      grad.addColorStop(0.4, U.rgba(gl.rgb, (0.55 * g).toFixed(3)));
      grad.addColorStop(1, U.rgba(gl.rgb, '0'));
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rad, keyTop - rad, rad * 2, rad);
    }
    ctx.restore();
  }
  // Names the chord made by the notes that sounded in the last half second.
  // Looks for a major or minor triad: a root, its third and its fifth,
  // whatever octave each is in. Returns '' when the notes fit neither.
  var chordShown = '', chordWant = '', chordSince = 0;
  function chordName(now){
    var pc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total = 0, i;
    for (i = 0; i < pianoSegs.length; i++){
      var sg = pianoSegs[i];
      if (now - sg.t1 > 0.5) continue;
      var wgt = sg.v * Math.min(1, 0.15 + (sg.t1 - sg.t0) * 2);
      pc[sg.m % 12] += wgt; total += wgt;
    }
    if (total < 0.5) return '';
    var best = '', bestScore = 0.62;
    for (var r = 0; r < 12; r++){
      for (var q = 0; q < 2; q++){
        var third = pc[(r + (q ? 3 : 4)) % 12], fifth = pc[(r + 7) % 12];
        if (pc[r] < total * 0.12 || third < total * 0.1) continue;
        var score = (pc[r] * 1.15 + third + fifth * 0.9) / total;
        if (score > bestScore){ bestScore = score; best = NOTE_NAMES[r] + (q ? ' minor' : ' major'); }
      }
    }
    return best;
  }
  // The fine spectrum arrives in decibels spread over 0..1. Notes are picked
  // in real signal strength instead, where a note really is many times
  // taller than what surrounds it (in decibels it is only a little taller).
  var DB_RANGE = 78;   // the engine's analysers cover -90..-12 dB
  function strength(v){ return Math.pow(10, (v - 1) * DB_RANGE / 20); }
  var seen = {};       // note -> how many frames in a row it has been found
  function detectNotes(){
    var cfg = Cfg.CFG.piano, out = {};
    if (!Aud.isLive()){
      demoNotes(out);
      if (cfg.melody){
        var top = -1;
        for (var dm in out) if (top < 0 || out[dm] > out[top]) top = dm;
        var only = {}; if (top >= 0) only[top] = out[top];
        return only;
      }
      return out;
    }

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
    // "melody only": keep just the strongest note of each moment
    var poly = cfg.melody ? 1 : Math.max(1, Math.round(cfg.polyphony * (1 - noisy * 0.7)));
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
    var rollSpeed = 0.35 * h * cfg.fall * Cfg.CFG.look.motion;   // 0.35 screen heights a second, as in the video
    var sparks = cfg.sparks * Cfg.CFG.look.motion;
    var rollTime = keyTop / rollSpeed;
    var now = A.t;

    // note detection + roll history
    var active = detectNotes();
    for (var m = pianoKeys.lo; m <= pianoKeys.hi; m++){
      var e = active[m];
      if (e){
        if (pianoOn[m]) pianoOn[m].t1 = now;
        else {
          pianoOn[m] = { m: m, t0: now, t1: now, v: e, em: 0 };
          pianoSegs.push(pianoOn[m]);
          if (sparks > 0){
            glows.push({ m: m, age: 0, v: e, rgb: noteRGB(m) });
            spawnWisps(m, e, Math.round(3 * sparks));
          }
        }
        if (e > pianoOn[m].v) pianoOn[m].v = e;
        // a held key keeps a small flame going
        pianoOn[m].em += dt * 16 * e * sparks;
        while (pianoOn[m].em >= 1){ pianoOn[m].em -= 1; spawnWisps(m, e, 1); }
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
      var al = 0.25 + seg.v * 0.6 * fade, rgb = cfg.octaves ? octaveRGB(seg.m) : (isBlack ? ac : nc);
      ctx.fillStyle = U.rgba(rgb, al.toFixed(3));
      U.roundRect(ctx, kx.x + kx.w * 0.12, Math.max(0, yTop), kx.w * 0.76, hgt, Math.min(3 * k, kx.w * 0.3));
      ctx.fill();
      // a brighter edge, like the frosted notes in the video (skipped when the keys are very narrow)
      if (kx.w > 5 * k){
        ctx.strokeStyle = U.rgba(rgb, Math.min(1, al * 1.5).toFixed(3));
        ctx.lineWidth = Math.max(1, k);
        ctx.stroke();
      }
    }
    drawWisps(keyTop, dt, now);

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
        ctx.fillStyle = U.rgba(cfg.octaves ? octaveRGB(wk.m) : ac, (0.6 + on * 0.3).toFixed(3));
        ctx.fillRect(wk.x + 0.5, keyTop, wk.w - 1, keyH);
        var pressG = ctx.createLinearGradient(0, keyTop, 0, keyTop + keyH * 0.5);
        pressG.addColorStop(0, 'rgba(0,0,0,0.34)');
        pressG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pressG;
        ctx.fillRect(wk.x + 0.5, keyTop, wk.w - 1, keyH * 0.5);
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
        ctx.fillStyle = U.rgba(cfg.octaves ? octaveRGB(bk.m) : ac, (0.75 + bon * 0.25).toFixed(3));
        ctx.fillRect(bk.x + 1, keyTop + keyH * 0.14, bk.w - 2, keyH * 0.48 - 1);
      }
    }

    // the chord being played, named in the corner. A new name has to hold
    // for a quarter of a second before it replaces the old one.
    if (cfg.chord){
      var cn = chordName(now);
      if (cn !== chordWant){ chordWant = cn; chordSince = now; }
      if (chordWant !== chordShown && now - chordSince > (chordWant ? 0.25 : 1.2)) chordShown = chordWant;
      if (chordShown){
        ctx.font = '600 ' + Math.round(15 * k) + 'px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.fillText(chordShown, 12 * k, 10 * k);
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

  function reset(){ pianoSegs = []; pianoOn = {}; pianoKeys = null; seen = {}; wisps = []; glows = []; chordShown = chordWant = ''; }

  // fx: 0 - a keyboard that zooms and shakes is hard to read
  App.modes.register('piano', { draw: drawPiano, paintBG: paintBG, onTap: onTap, drawTapFX: drawTapFX, reset: reset, fx: 0 });

  App.cfg.registerDefaults('piano', {
    low: 36, high: 96, threshold: 0.4, polyphony: 6, melody: false, octaves: true, chord: true,
    fall: 1, labels: true, sustain: 1, sparks: 1,
    keyColor: '#F4ECE1', activeColor: '#E0728A', noteColor: '#7BD3F7',
    bg1: '#161127', bg2: '#05030C'
  });
  App.cfg.registerSchema({ id: 'piano', label: 'Piano', fields: [
    ['low', 'Lowest note (MIDI)', 'range', 21, 72, 1],
    ['high', 'Highest note (MIDI)', 'range', 48, 108, 1],
    ['threshold', 'Note detection threshold', 'range', 0.05, 0.9, 0.01],
    ['polyphony', 'Max notes at once', 'range', 1, 16, 1],
    ['melody', 'Melody only (the strongest note of each moment)', 'bool'],
    ['octaves', 'Colour notes by octave', 'bool'],
    ['chord', 'Show the chord name', 'bool'],
    ['fall', 'Roll speed (1 = 0.35 screens a second)', 'range', 0.3, 3, 0.05],
    ['sparks', 'Flames from the keys', 'range', 0, 2, 0.05],
    ['sustain', 'Note hold', 'range', 0.2, 3, 0.05],
    ['labels', 'Note labels', 'bool'],
    ['keyColor', 'White keys', 'color'],
    ['activeColor', 'Pressed key', 'color'],
    ['noteColor', 'Falling notes', 'color'],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
})();
