/* ---------- String ----------
   A set of strings, one per slice of the sound: the lowest string carries
   only the bass part of the wave, the highest only the treble. Each string
   moves as far as its own slice is loud, so calm music leaves them nearly
   straight and a loud passage sets them all swinging (docs/MODES.md, A). The swing, the
   brightness, the beads and the speed of every moving part follow the loudness (`A.drive`),
   not only the shape of the spectrum, so a quiet passage with a soft tune stays calm.
   A snare plucks one string: it is pulled to a point and rings down.

   When "Follow theme" is on, the active theme code restyles the mode:
     colours and background   the theme's own
     glyphs                   the theme's characters ride along the strings
     digital  (Cyberpunk)     the strings move in square steps
     ring     (Nihilum)       the strings close into circles round a dark disc
     rainbow  (Incertum)      each string takes its own hue
     electric (Tessa)         a Jacob's ladder: two rods that lean apart, and
                              one arc per string climbing between them
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var MAX_STRINGS = 8, WIN = 1024;
  var wave = new Float32Array(WIN), lows = [], bands = [];
  for (var bi = 0; bi < MAX_STRINGS; bi++){ lows.push(new Float32Array(WIN)); bands.push(new Float32Array(WIN)); }
  var peaks = new Float32Array(MAX_STRINGS);
  var vals = null, valState = null;
  var plucks = [], pluckTurn = 0;
  var tapStrings = [], tapStringCd = 0;
  var sT = 0;                        // the strings' own clock: it runs slowly in a quiet passage
  var ys = new Float32Array(200);

  function look(){
    var th = App.theme.look;
    return Cfg.CFG.strings.followTheme && th ? th : null;
  }

  // Splits the wave into n slices, low to high, with simple smoothing
  // filters. Each filter is run forward and then backward so the slice is
  // not pushed sideways.
  function split(n){
    var td = Aud.timeData, m = Math.min(WIN, td.length), i, j;
    for (j = 0; j < m; j++) wave[j] = (td[j] - 128) / 128;
    if (n === 1){ bands[0].set(wave); return m; }
    var sr = Aud.sampleRate;
    for (i = 0; i < n - 1; i++){
      var fc = 110 * Math.pow(5200 / 110, n > 2 ? i / (n - 2) : 0.5);
      var a = 1 - Math.exp(-6.283 * fc / sr), out = lows[i], y = wave[0];
      for (j = 0; j < m; j++){ y += (wave[j] - y) * a; out[j] = y; }
      for (j = m - 1; j >= 0; j--){ y += (out[j] - y) * a; out[j] = y; }
    }
    for (j = 0; j < m; j++){
      bands[0][j] = lows[0][j];
      for (i = 1; i < n - 1; i++) bands[i][j] = lows[i][j] - lows[i - 1][j];
      bands[n - 1][j] = wave[j] - lows[n - 2][j];
    }
    return m;
  }

  function hash(a, b, c){
    var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return x - Math.floor(x);
  }
  // colour of string number li (f = 0 lowest .. 1 highest)
  function colourOf(lk, f, li, t){
    var cfg = Cfg.CFG.strings;
    if (lk && !lk.rainbow){
      var a = U.hexRGB(lk.c1), b = U.hexRGB(lk.c2);
      return [Math.round(U.lerp(a[0], b[0], f)), Math.round(U.lerp(a[1], b[1], f)), Math.round(U.lerp(a[2], b[2], f))];
    }
    var hue = lk ? (f * 290 + t * 14) % 360 : (cfg.hue + f * cfg.spread + Math.sin(t * 0.3 + li) * 10) % 360;
    return hslRGB(hue, lk ? 0.82 : 0.65, lk && lk.dark === false ? 0.5 : 0.56);
  }
  function hslRGB(h, s, l){
    var c = (1 - Math.abs(2 * l - 1)) * s, hp = ((h % 360) + 360) % 360 / 60, x = c * (1 - Math.abs(hp % 2 - 1));
    var r = 0, g = 0, b = 0;
    if (hp < 1){ r = c; g = x; } else if (hp < 2){ r = x; g = c; } else if (hp < 3){ g = c; b = x; }
    else if (hp < 4){ g = x; b = c; } else if (hp < 5){ r = x; b = c; } else { r = c; b = x; }
    var m = l - c / 2;
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  /* Jacob's ladder: two metal rods, close at the bottom and wide at the top.
     An arc of electricity forms at the bottom, climbs, stretches and breaks
     at the top, then starts again. One arc per string: its shape is that
     string's slice of the sound wave, its speed and brightness how loud the
     slice is. A kick thickens every arc; a snare (a pluck) makes one flare. */
  var arcPos = new Float32Array(MAX_STRINGS), arcInit = false;
  function drawLadder(w, h, k, n, m, lk, big, glowAmt, dt, calm){
    var cx = w / 2, yB = h * 0.93, yT = h * 0.07;
    var gapB = Math.min(w * 0.035, 22 * k), gapT = Math.min(w * 0.42, h * 0.5);
    var c1 = U.hexRGB(lk.c1), c2 = U.hexRGB(lk.c2), i, j;
    if (!arcInit){ for (i = 0; i < MAX_STRINGS; i++) arcPos[i] = i / MAX_STRINGS; arcInit = true; }
    // the stand and the rods
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(20,30,52,0.9)';
    ctx.fillRect(cx - gapB - 26 * k, yB, (gapB + 26 * k) * 2, h - yB);
    for (var side = -1; side <= 1; side += 2){
      var rg = ctx.createLinearGradient(cx + side * gapB, yB, cx + side * gapT, yT);
      rg.addColorStop(0, 'rgba(120,140,170,0.95)');
      rg.addColorStop(1, 'rgba(210,225,245,0.95)');
      ctx.strokeStyle = rg;
      ctx.lineWidth = 3.2 * k;
      ctx.beginPath();
      ctx.moveTo(cx + side * gapB, yB);
      ctx.lineTo(cx + side * gapT, yT);
      ctx.stroke();
    }
    var jt = Math.floor(A.t * 24);   // the jitter starts afresh 24 times a second; its size follows the loudness
    ctx.lineJoin = 'round';
    for (i = 0; i < n; i++){
      var v = vals[i], b = bands[i];
      // climb: slow when this slice is quiet, fast when it is loud
      arcPos[i] += (0.012 + calm * (0.14 + big * 0.2 + v * 0.65)) * dt * Cfg.CFG.look.motion;
      if (arcPos[i] > 1) arcPos[i] -= 1;
      var p = arcPos[i], y = yB + (yT - yB) * p, half = gapB + (gapT - gapB) * p;
      var span = Math.max(96, m >> Math.round((n === 1 ? 0.5 : i / (n - 1)) * 3)), pts = 26;
      var pk = 0;
      for (j = 0; j < plucks.length; j++) if (plucks[j].li === i) pk = Math.max(pk, plucks[j].amp * (1 - plucks[j].age / 1.1));
      var amp = h * 0.05 * Cfg.CFG.strings.amp * (0.25 + v * 1.5) * big * (0.3 + 0.7 * calm) + pk * h * 0.05;
      // an arc fades in as it forms and thins out just before it breaks
      var alive = Math.min(1, p * 9) * Math.min(1, (1 - p) * 5);
      for (j = 0; j <= pts; j++){
        var u = j / pts, env = Math.sin(u * Math.PI);
        var wv = b[Math.min(m - 1, Math.floor(u * (span - 1)))] || 0;
        var jit = (hash(i, j, jt) - 0.5) * (0.35 + v * 1.2) * (0.1 + 0.9 * calm);
        // hot air lifts the middle of the arc
        ys[j] = y - env * half * 0.22 + (wv * 2.2 + jit) * amp * env;
      }
      var core = (1.2 + (v * 1.6 + A.kick * 1.6) * calm + pk * 2.5) * k;
      for (var pass = 0; pass < 2; pass++){
        ctx.beginPath();
        for (j = 0; j <= pts; j++){
          var x = cx - half + 2 * half * j / pts;
          if (j === 0) ctx.moveTo(x, ys[j]); else ctx.lineTo(x, ys[j]);
        }
        if (pass === 0){
          ctx.strokeStyle = U.rgba(c1, (alive * (0.22 + v * 0.4 * calm) * (0.5 + glowAmt)).toFixed(3));
          ctx.lineWidth = core * 4.5;
        } else {
          ctx.strokeStyle = U.rgba(c2, (alive * (0.55 + v * 0.45 * calm)).toFixed(3));
          ctx.lineWidth = core;
        }
        ctx.stroke();
      }
      // where the arc touches the rods
      ctx.fillStyle = U.rgba(c2, (alive * 0.9).toFixed(3));
      ctx.beginPath();
      ctx.arc(cx - half, y, core * 1.6, 0, 6.283);
      ctx.arc(cx + half, y, core * 1.6, 0, 6.283);
      ctx.fill();
    }
  }

  function drawString(){
    var w = canvas.width, h = canvas.height, cy = h / 2, cx = w / 2, k = Can.dpr(), cfg = Cfg.CFG.strings;
    var CFGlook = Cfg.CFG.look, dt = A.dt;
    Can.backdrop(cfg.trail);
    tapStringCd = Math.max(0, tapStringCd - dt);

    var lk = look();
    var n = Math.max(1, Math.min(MAX_STRINGS, Math.round(cfg.layers)));
    var m = split(n);
    if (!vals || vals.length !== n){ vals = new Float32Array(n); valState = new Float32Array(n); }
    Aud.bars(vals, { lo: 45, hi: 9000, scale: 'log', blur: 0.2, state: valState, attack: 40, release: 7 });

    var calm = Math.min(1, A.drive * 2.2);                   // 0 in a quiet passage, 1 once the music is clearly loud
    sT += dt * CFGlook.motion * (0.2 + 0.8 * calm);
    var t = sT;
    var ring = !!(lk && lk.layout === 'ring');
    var digital = !!(lk && lk.digital);
    var glyphs = lk && cfg.beads && lk.glyphs && lk.glyphs.length ? lk.glyphs : null;
    var minDim = Math.min(w, h);
    var gapPx = n > 1 ? (h * 0.62 * cfg.gap) / (n - 1) : 0;
    var ampPx = U.lerp(h * 0.3, Math.max(h * 0.085, gapPx * 1.1), cfg.gap) * cfg.amp;
    if (ring) ampPx = minDim * 0.085 * cfg.amp;
    // idea A: the whole mode swings wider in a loud passage
    var big = 0.06 + 0.94 * calm;
    var glowAmt = cfg.glow * CFGlook.glow;

    // a snare plucks one string (never the same one twice running)
    if (cfg.pluck && A.snareHit > 0.42 && A.drive > 0.1 && plucks.length < 6){
      pluckTurn = (pluckTurn + 1 + Math.floor(Math.random() * Math.max(1, n - 1))) % n;
      plucks.push({ li: pluckTurn, pos: 0.18 + Math.random() * 0.64, amp: (0.5 + A.snareHit * 0.5) * (0.4 + 0.6 * A.drive),
                    dir: Math.random() < 0.5 ? -1 : 1, age: 0 });
    }
    for (var pq = plucks.length - 1; pq >= 0; pq--){
      plucks[pq].age += dt;
      if (plucks[pq].age > 1.1) plucks.splice(pq, 1);
    }

    if (lk && lk.electric){ drawLadder(w, h, k, n, m, lk, big, glowAmt, dt, calm); return; }

    if (ring && lk.inward){
      // the dark disc the rings circle (same idea as Basic's black hole)
      var hole = minDim * 0.13;
      var disc = ctx.createRadialGradient(cx, cy, hole * 0.4, cx, cy, hole * 2.6);
      disc.addColorStop(0, 'rgba(0,0,0,0.9)');
      disc.addColorStop(0.4, 'rgba(0,0,0,0.55)');
      disc.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = disc;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var li = 0; li < n; li++){
      var f = n === 1 ? 0.5 : li / (n - 1);
      var b = bands[li], v = vals[li];
      // low strings show the whole window, high strings a short piece of it,
      // so every string shows a few clean waves instead of a blur
      var span = n === 1 ? m : Math.max(96, m >> Math.round(f * 3));
      var pts = Math.min(160, span), j;
      var pk = 0;
      for (j = 0; j < span; j++){ var av = b[j] < 0 ? -b[j] : b[j]; if (av > pk) pk = av; }
      peaks[li] = Math.max(pk, peaks[li] * Math.exp(-1.5 * dt));
      var norm = 1 / Math.max(0.03, peaks[li]);
      var amp = ampPx * Math.min(1, v * 1.25) * big;
      var drift = ampPx * (0.006 + 0.024 * calm);

      var rgb = colourOf(lk, f, li, t);
      var drive = (v * 0.7 + A.punch * (1 - f) * 0.5) * (0.25 + 0.75 * calm);
      ctx.strokeStyle = U.rgba(rgb, (0.5 + drive * 0.45).toFixed(3));
      ctx.lineWidth = (2.6 - f * 1.5 + drive * 3.6) * cfg.width * k;
      if (glowAmt > 0.01){
        ctx.shadowColor = U.rgba(rgb, 0.9);
        ctx.shadowBlur = (5 + drive * 30) * glowAmt * k;
      }

      // displacement of every point of this string
      for (var i = 0; i <= pts; i++){
        var u = i / pts, sp = u * (span - 1), s0 = Math.floor(sp), fr = sp - s0;
        var raw = (b[s0] * (1 - fr) + b[Math.min(span - 1, s0 + 1)] * fr) * norm;
        var d = (raw < 0 ? -1 : 1) * Math.pow(Math.abs(raw), 0.8) * amp;
        d += Math.sin(t * (0.7 + f * 1.3) + u * (5 + li * 2.3) + li * 0.9) * drift;
        if (ring) d *= Math.min(1, u * 9, (1 - u) * 9);   // meet cleanly where the circle closes
        ys[i] = d;
      }
      for (var p = 0; p < plucks.length; p++){
        var pl = plucks[p];
        if (pl.li !== li) continue;
        var ring2 = Math.exp(-pl.age * 4.2) * Math.cos(pl.age * 36) * pl.amp * pl.dir * ampPx * 0.9;
        for (var q = 0; q <= pts; q++){
          var uq = q / pts;
          ys[q] += ring2 * (uq < pl.pos ? uq / pl.pos : (1 - uq) / (1 - pl.pos));
        }
      }
      if (digital){
        // square steps: hold each value for three points and snap it to a grid
        var grid = Math.max(2 * k, ampPx / 5);
        for (var g = 0; g <= pts; g++) ys[g] = Math.round(ys[g - (g % 3)] / grid) * grid;
      }

      var y0 = cy + (0.5 - f) * (n - 1) * gapPx;
      var R = minDim * (0.17 + 0.25 * f), rot = t * 0.06 * (li % 2 ? 1 : -1) - Math.PI / 2;
      ctx.beginPath();
      var px, py, lastY = 0;
      for (i = 0; i <= pts; i++){
        if (ring){
          var ang = rot + (i / pts) * 6.283, rr = R + ys[i];
          px = cx + Math.cos(ang) * rr; py = cy + Math.sin(ang) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        } else {
          px = (i / pts) * w; py = y0 + ys[i];
          if (i === 0) ctx.moveTo(px, py);
          else if (digital && py !== lastY){ ctx.lineTo(px, lastY); ctx.lineTo(px, py); }
          else ctx.lineTo(px, py);
          lastY = py;
        }
      }
      if (ring) ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (!ring && cfg.reflect){
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        for (var ri = 0; ri <= pts; ri++){
          var ry = h - (y0 + ys[ri] - cy) * 0.3 - h * 0.07;
          if (ri === 0) ctx.moveTo((ri / pts) * w, ry); else ctx.lineTo((ri / pts) * w, ry);
        }
        ctx.stroke();
        ctx.restore();
      }

      // the theme's characters ride along the string
      if (glyphs){
        var every = Math.max(6, Math.round(pts / Math.max(4, (ring ? R * 6.283 : w) / (58 * k))));
        var size = (9 + v * calm * 13) * k * (0.8 + cfg.width * 0.2);
        var tick = Math.floor(A.t * 7), col = lk.dark === false ? lk.c1 : lk.c2;
        ctx.globalAlpha = 0.45 + Math.min(0.55, v * 0.9 * calm);
        for (var e = Math.round(every / 2) + (li % 2) * Math.round(every / 2); e < pts; e += every){
          var ch = glyphs.length === 2 ? glyphs[hash(li, e, tick) < 0.5 ? 0 : 1] : glyphs[(li + Math.floor(e / every)) % glyphs.length];
          var gx, gy;
          if (ring){
            var ga = rot + (e / pts) * 6.283, gr = R + ys[e];
            gx = cx + Math.cos(ga) * gr; gy = cy + Math.sin(ga) * gr;
          } else { gx = (e / pts) * w; gy = y0 + ys[e]; }
          ctx.drawImage(Can.glyphSprite(ch, col), gx - size / 2, gy - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
      }
    }

    if (ring && lk.inward){
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, minDim * (0.105 - A.punch * 0.006), 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = U.rgba(U.hexRGB(lk.c2), (0.45 + A.punch * 0.5).toFixed(3));
      ctx.lineWidth = (1.2 + A.punch * 2) * k;
      ctx.stroke();
    }
  }

  function paintBG(c, w, h){
    var lk = look(), tint = lk ? U.hexRGB(lk.c2) : [194, 98, 111];
    var strength = lk && lk.dark ? 0.13 : 0.10;
    for (var i = 0; i < 4; i++){
      var rg = c.createRadialGradient(w * (0.15 + i * 0.24), h * (i % 2 ? 0.25 : 0.75), 0,
                                      w * (0.15 + i * 0.24), h * (i % 2 ? 0.25 : 0.75), w * 0.3);
      rg.addColorStop(0, U.rgba(tint, strength));
      rg.addColorStop(1, U.rgba(tint, 0));
      c.fillStyle = rg;
      c.fillRect(0, 0, w, h);
    }
  }
  function bgColors(){
    var lk = look();
    return lk ? { bg1: lk.bg1, bg2: lk.bg2 } : null;
  }

  // Touch: a small circular string that ripples the same way the main
  // strings do, with its own cooldown so taps can't spam it.
  function onTap(x, y){
    if (tapStringCd > 0) return;
    tapStringCd = Cfg.CFG.strings.tapCooldown;
    tapStrings.push({ x: x, y: y, age: 0, life: 1.5, seed: Math.random() * 6.283,
                      r: Math.min(canvas.width, canvas.height) * 0.12 });
    if (tapStrings.length > 6) tapStrings.shift();
  }
  function drawTapFX(){
    var dt = A.dt, k = Can.dpr(), cfg = Cfg.CFG.strings, timeData = Aud.timeData, lk = look();
    for (var sIdx = tapStrings.length - 1; sIdx >= 0; sIdx--){
      var st = tapStrings[sIdx];
      st.age += dt;
      if (st.age > st.life){ tapStrings.splice(sIdx, 1); continue; }
      var f3 = st.age / st.life;
      var drive = A.level * 0.7 + A.punch * 0.5;
      var rgb = colourOf(lk, f3, 0, A.t);
      ctx.save();
      ctx.globalAlpha = (1 - f3) * 0.85;
      ctx.strokeStyle = U.rgba(rgb, 1);
      ctx.lineWidth = (1.4 + drive * 3) * cfg.width * k;
      if (cfg.glow * Cfg.CFG.look.glow > 0.01){
        ctx.shadowColor = U.rgba(rgb, 0.9);
        ctx.shadowBlur = (5 + drive * 22) * cfg.glow * Cfg.CFG.look.glow * k;
      }
      ctx.beginPath();
      var pts = 64;
      for (var q2 = 0; q2 <= pts; q2++){
        var ang = (q2 / pts) * 6.283;
        var si = Math.floor((q2 / pts) * (timeData.length - 1));
        var wv = (timeData[si] - 128) / 128;
        var rr = st.r * (0.55 + f3 * 0.5) * (1 + wv * 0.22 * (0.4 + drive * 1.6))
                 + Math.sin(ang * 5 + A.t * 3 + st.seed) * st.r * 0.08;
        var px = st.x + Math.cos(ang) * rr, py = st.y + Math.sin(ang) * rr;
        if (q2 === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function reset(){ plucks = []; valState = null; vals = null; for (var i = 0; i < MAX_STRINGS; i++) peaks[i] = 0; }

  App.modes.register('strings', { draw: drawString, paintBG: paintBG, bgColors: bgColors, onTap: onTap,
                                  drawTapFX: drawTapFX, reset: reset, fx: 0.7 });

  App.cfg.registerDefaults('strings', {
    followTheme: true, layers: 5, gap: 0.55, amp: 1, pluck: true, beads: true, reflect: true,
    trail: 0.2, hue: 350, spread: 50, glow: 0.55, width: 1, tapCooldown: 0.45,
    bg1: '#FDF6F0', bg2: '#EDD4D6'
  });
  App.cfg.registerSchema({ id: 'strings', label: 'String', fields: [
    ['followTheme', 'Follow theme (colours, shapes, layout)', 'bool'],
    ['layers', 'String count (low to high)', 'range', 1, 8, 1],
    ['gap', 'Space between strings (0 = all on one line)', 'range', 0, 1, 0.05],
    ['amp', 'Swing', 'range', 0.2, 2.5, 0.05],
    ['pluck', 'Snare plucks a string', 'bool'],
    ['beads', 'Theme characters on the strings', 'bool'],
    ['reflect', 'Reflection', 'bool'],
    ['width', 'Line weight', 'range', 0.3, 3, 0.05],
    ['glow', 'Glow', 'range', 0, 1, 0.05],
    ['trail', 'Trail fade', 'range', 0.04, 1, 0.02],
    ['tapCooldown', 'Touch ring cooldown (seconds)', 'range', 0.05, 3, 0.05],
    ['hue', 'Base hue - when not following theme', 'range', 0, 360, 1],
    ['spread', 'Hue spread', 'range', 0, 180, 1],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
})();
