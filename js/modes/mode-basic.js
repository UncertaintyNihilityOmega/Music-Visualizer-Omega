/* ---------- Basic ----------
   The classic bar spectrum, with four layouts and two things learned from
   studying real visualiser videos (docs/RESEARCH.md):
     - "Bass focus" range: those videos only show about 30-800 Hz, spread
       evenly, which is why a kick drum makes one tall clean spike instead
       of a blur across half the screen.
     - Rounded peaks: each bar leans a little on its neighbours.
   When "Follow theme" is on, colours, layout and what the bars are built
   from (solid, 1s and 0s, emoji...) come from the active theme code. */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var vals = null, state = null, peakCaps = null, barGradient = null, gradKey = '';
  var tapPlus = [];
  var glyphCache = {};

  var RANGES = {
    full:  { lo: 28,  hi: 16000, scale: 'log' },
    bass:  { lo: 30,  hi: 800,   scale: 'lin' },
    voice: { lo: 120, hi: 5000,  scale: 'log' }
  };

  // what to draw with: the theme's look, or the user's own colours
  function look(){
    var cfg = Cfg.CFG.basic, th = App.theme.look;
    if (cfg.followTheme && th) return th;
    return { c1: cfg.c1, c2: cfg.c2, bg1: cfg.bg1, bg2: cfg.bg2, dark: false, layout: 'mirror', glyphs: null };
  }
  function layoutOf(lk){
    var l = Cfg.CFG.basic.layout;
    return l === 'theme' ? (lk.layout || 'mirror') : l;
  }

  function sample(n){
    var cfg = Cfg.CFG.basic;
    if (!vals || vals.length !== n){
      vals = new Float32Array(n); state = new Float32Array(n); peakCaps = new Float32Array(n);
    }
    var r = RANGES[cfg.range] || RANGES.full;
    Aud.bars(vals, { lo: r.lo, hi: r.hi, scale: r.scale, blur: cfg.blur, state: state,
                     attack: 70, release: U.lerp(42, 5, cfg.smooth) });
    for (var i = 0; i < n; i++){
      var v = Math.pow(vals[i], cfg.gamma);
      vals[i] = v;
      if (v > peakCaps[i]) peakCaps[i] = v;
      else peakCaps[i] = Math.max(v, peakCaps[i] - A.dt * cfg.peakFall);
    }
  }

  // a text glyph pre-drawn once per (character, colour); emoji keep their own colours
  function glyphSprite(ch, color){
    var key = ch + '|' + color;
    if (glyphCache[key]) return glyphCache[key];
    var px = 48, cv = document.createElement('canvas');
    cv.width = cv.height = px;
    var c = cv.getContext('2d');
    c.font = 'bold ' + Math.round(px * 0.86) + 'px "Cascadia Mono","Consolas","Segoe UI Symbol","Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(ch, px / 2, px / 2 + px * 0.04);
    glyphCache[key] = cv;
    return cv;
  }
  function hash(a, b, c){
    var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return x - Math.floor(x);
  }
  // one bar made of stacked glyphs, growing from (x, y0) in direction dir (-1 up, +1 down)
  function glyphBar(lk, i, x, y0, bw, barH, dir, cell){
    var n = Math.max(1, Math.round(barH / cell));
    var tick = Math.floor(A.t * 9);
    for (var j = 0; j < n; j++){
      var g = lk.glyphs.length === 2
        ? lk.glyphs[hash(i, j, tick) < 0.5 ? 0 : 1]            // two glyphs (1/0): flicker at random
        : lk.glyphs[(i + j) % lk.glyphs.length];                // a set: fixed pattern
      var top = j === n - 1;
      var sp = glyphSprite(g, top ? lk.c2 : lk.c1);
      ctx.globalAlpha = top ? 1 : 0.55 + 0.45 * (j / n);
      ctx.drawImage(sp, x + (bw - cell) / 2, dir < 0 ? y0 - (j + 1) * cell : y0 + j * cell, cell, cell);
    }
    ctx.globalAlpha = 1;
  }

  function fillFor(lk, w, h){
    if (lk.rainbow){
      var key = 'r|' + w;
      if (gradKey !== key){
        barGradient = ctx.createLinearGradient(0, 0, w, 0);
        for (var s = 0; s <= 6; s++) barGradient.addColorStop(s / 6, 'hsl(' + (s * 55) + ',88%,58%)');
        gradKey = key;
      }
    } else {
      var k2 = lk.c1 + lk.c2 + h;
      if (gradKey !== k2){
        barGradient = ctx.createLinearGradient(0, 0, 0, h);
        barGradient.addColorStop(0, lk.c1);
        barGradient.addColorStop(0.5, lk.c2);
        barGradient.addColorStop(1, lk.c1);
        gradKey = k2;
      }
    }
    return barGradient;
  }
  function glowOn(lk, k){
    var cfg = Cfg.CFG.basic, amt = cfg.glow * Cfg.CFG.look.glow;
    if (amt > 0.01){
      ctx.shadowColor = lk.c2;
      ctx.shadowBlur = (4 + A.punch * 20) * amt * k;
    }
  }

  function drawBasic(){
    var w = canvas.width, h = canvas.height, cy = h / 2, cx = w / 2, k = Can.dpr(), cfg = Cfg.CFG.basic;
    var lk = look(), layout = layoutOf(lk);
    Can.backdrop(1);
    var capColor = lk.dark ? 'rgba(255,255,255,0.45)' : 'rgba(60,20,30,0.3)';
    var glyphs = lk.glyphs && lk.glyphs.length ? lk.glyphs : null;
    var i, v, barH;

    if (layout === 'ring'){
      var n = Math.max(48, Math.min(160, Math.round(96 * cfg.bars)));
      sample(n);
      var R = Math.min(w, h) * 0.27 * (1 + A.punch * 0.05), reach = Math.min(w, h) * 0.2;
      var inward = !!lk.inward;
      // the hole: a disc that swallows the light, with a thin bright rim
      if (inward){
        var disc = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
        disc.addColorStop(0, 'rgba(0,0,0,1)');
        disc.addColorStop(0.5, 'rgba(0,0,0,0.9)');
        disc.addColorStop(0.56, U.rgba(U.hexRGB(lk.c1), (0.22 + A.level * 0.3).toFixed(3)));
        disc.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = disc;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(1.5, (6.283 * R / n) * 0.55);
      ctx.strokeStyle = fillFor(lk, w, h);
      glowOn(lk, k);
      ctx.beginPath();
      for (i = 0; i < n; i++){
        // mirrored around the vertical axis so bass sits at the top on both sides
        var f = i / n, idx = Math.floor((f < 0.5 ? f * 2 : (1 - f) * 2) * (n - 1));
        v = vals[idx];
        var a = f * 6.283 - Math.PI / 2 + (inward ? A.t * 0.05 : 0);
        var r0 = inward ? R * 1.02 + reach : R, r1 = inward ? r0 - v * reach * 0.95 : R + v * reach;
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (inward){
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.8 - A.punch * 0.03), 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = U.rgba(U.hexRGB(lk.c2), (0.5 + A.punch * 0.5).toFixed(3));
        ctx.lineWidth = (1.2 + A.punch * 2) * k;
        ctx.stroke();
      }
    } else if (layout === 'rise' || layout === 'edges'){
      // bars standing on a floor near the bottom, with a soft reflection
      var count = Math.max(24, Math.min(180, Math.round(w / (9 * k) * cfg.bars)));
      if (glyphs) count = Math.min(count, Math.round(w / (15 * k)));
      var half = layout === 'edges' ? Math.ceil(count / 2) : count;
      sample(half);
      var floor = h * 0.84, maxH = floor * 0.9, barW = w / count, bw = Math.max(1, barW * 0.72);
      var cell = Math.max(8 * k, bw);
      ctx.fillStyle = fillFor(lk, w, h);
      if (!glyphs){ glowOn(lk, k); ctx.beginPath(); }
      for (i = 0; i < count; i++){
        // 'edges': bass at both outer edges, treble meeting in the middle
        var src = layout === 'edges' ? (i < half ? i : count - 1 - i) : i;
        v = vals[Math.min(half - 1, src)];
        barH = Math.max(1.5 * k, v * maxH);
        var x = i * barW + (barW - bw) / 2;
        if (glyphs) glyphBar(lk, i, x, floor, bw, barH, -1, cell);
        else ctx.rect(x, floor - barH, bw, barH);
      }
      if (!glyphs){ ctx.fill(); ctx.shadowBlur = 0; }
      // reflection
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = lk.rainbow ? fillFor(lk, w, h) : lk.c1;
      ctx.beginPath();
      for (i = 0; i < count; i++){
        var src2 = layout === 'edges' ? (i < half ? i : count - 1 - i) : i;
        var rh = Math.min(h - floor, vals[Math.min(half - 1, src2)] * maxH * 0.3);
        ctx.rect(i * barW + (barW - bw) / 2, floor + 2 * k, bw, rh);
      }
      ctx.fill();
      ctx.restore();
      if (cfg.peaks && !glyphs){
        ctx.beginPath();
        for (i = 0; i < count; i++){
          var src3 = layout === 'edges' ? (i < half ? i : count - 1 - i) : i;
          ctx.rect(i * barW + (barW - bw) / 2, floor - peakCaps[Math.min(half - 1, src3)] * maxH - 3 * k, bw, 2 * k);
        }
        ctx.fillStyle = capColor;
        ctx.fill();
      }
    } else {
      // 'mirror': bass in the centre, mirrored left/right and up/down
      var barCount = Math.max(16, Math.min(120, Math.round(w / (13 * k) * cfg.bars)));
      if (glyphs) barCount = Math.min(barCount, Math.round(w / (30 * k)));
      sample(barCount);
      var maxH2 = cy * 0.86, barW2 = cx / barCount, gap = barW2 * 0.26, bw2 = Math.max(1, barW2 - gap);
      var cell2 = Math.max(8 * k, bw2);
      ctx.fillStyle = fillFor(lk, w, h);
      if (!glyphs){ glowOn(lk, k); ctx.beginPath(); }   // every bar in one path = one fill, one shadow pass
      for (i = 0; i < barCount; i++){
        barH = Math.max(1.5 * k, vals[i] * maxH2);
        var xR = cx + i * barW2, xL = cx - (i + 1) * barW2;
        if (glyphs){
          glyphBar(lk, i, xR, cy, bw2, barH, -1, cell2);
          glyphBar(lk, i, xR, cy, bw2, barH, 1, cell2);
          glyphBar(lk, i + 50, xL, cy, bw2, barH, -1, cell2);
          glyphBar(lk, i + 50, xL, cy, bw2, barH, 1, cell2);
        } else {
          ctx.rect(xR, cy - barH, bw2, barH);
          ctx.rect(xR, cy, bw2, barH);
          ctx.rect(xL, cy - barH, bw2, barH);
          ctx.rect(xL, cy, bw2, barH);
        }
      }
      if (!glyphs){ ctx.fill(); ctx.shadowBlur = 0; }
      if (cfg.peaks && !glyphs){
        ctx.beginPath();
        for (var p = 0; p < barCount; p++){
          var capY = peakCaps[p] * maxH2;
          var xr = cx + p * barW2, xl = cx - (p + 1) * barW2;
          ctx.rect(xr, cy - capY - 2 * k, bw2, 2 * k);
          ctx.rect(xl, cy - capY - 2 * k, bw2, 2 * k);
          ctx.rect(xr, cy + capY, bw2, 2 * k);
          ctx.rect(xl, cy + capY, bw2, 2 * k);
        }
        ctx.fillStyle = capColor;
        ctx.fill();
      }
    }

    if (cfg.wave && layout !== 'ring'){
      var timeData = Aud.timeData;
      var wy = layout === 'mirror' ? cy : h * 0.2;
      ctx.strokeStyle = lk.dark ? 'rgba(255,255,255,0.3)' : 'rgba(60,20,30,0.32)';
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      var pts = 80;
      for (var q = 0; q <= pts; q++){
        var x2 = (q / pts) * w;
        var ti = Math.floor((q / pts) * (timeData.length - 1));
        var y2 = wy + ((timeData[ti] - 128) / 128) * (h * 0.12);
        if (q === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }
  }

  function paintBG(c, w, h){
    var lk = look();
    var vg = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.75);
    if (lk.dark){
      vg.addColorStop(0, U.rgba(U.hexRGB(lk.c1), 0.16));
      vg.addColorStop(1, 'rgba(0,0,0,0.25)');
    } else {
      vg.addColorStop(0, 'rgba(255,255,255,0.5)');
      vg.addColorStop(1, U.rgba(U.hexRGB(lk.c2), 0.07));
    }
    c.fillStyle = vg;
    c.fillRect(0, 0, w, h);
  }
  function bgColors(){
    var lk = look();
    return { bg1: lk.bg1, bg2: lk.bg2 };
  }

  // Touch: a square burst with four short bars fired outward in a plus shape
  function onTap(x, y){
    tapPlus.push({ x: x, y: y, age: 0, life: 0.75 });
    if (tapPlus.length > 12) tapPlus.shift();
  }
  function drawTapFX(){
    var dt = A.dt, k = Can.dpr(), lk = look();
    for (var p = tapPlus.length - 1; p >= 0; p--){
      var tq = tapPlus[p];
      tq.age += dt;
      if (tq.age > tq.life){ tapPlus.splice(p, 1); continue; }
      var f2 = tq.age / tq.life, al = (1 - f2);
      ctx.save();
      ctx.globalAlpha = al * 0.75;
      ctx.strokeStyle = lk.c2;
      ctx.lineWidth = 2 * k;
      var sq = (10 + f2 * 34) * k;
      ctx.strokeRect(tq.x - sq / 2, tq.y - sq / 2, sq, sq);
      ctx.fillStyle = lk.c1;
      var travel = f2 * 62 * k, bl = 16 * k * al, bw2 = 5 * k;
      ctx.fillRect(tq.x - bw2 / 2, tq.y - sq / 2 - travel - bl, bw2, bl);
      ctx.fillRect(tq.x - bw2 / 2, tq.y + sq / 2 + travel, bw2, bl);
      ctx.fillRect(tq.x - sq / 2 - travel - bl, tq.y - bw2 / 2, bl, bw2);
      ctx.fillRect(tq.x + sq / 2 + travel, tq.y - bw2 / 2, bl, bw2);
      ctx.restore();
    }
  }

  function reset(){ vals = null; barGradient = null; gradKey = ''; }
  App.canvas.addResizeHook(reset);

  App.modes.register('basic', { draw: drawBasic, paintBG: paintBG, bgColors: bgColors, onTap: onTap, drawTapFX: drawTapFX, reset: reset });

  App.cfg.registerDefaults('basic', {
    followTheme: true, layout: 'theme', range: 'full',
    bars: 1, gamma: 1, blur: 0.35, smooth: 0.45, peaks: true, peakFall: 0.6, glow: 0.4, wave: true,
    c1: '#BD9257', c2: '#C2626F', bg1: '#FFF8F3', bg2: '#F1D8D5'
  });
  App.cfg.registerSchema({ id: 'basic', label: 'Basic', fields: [
    ['followTheme', 'Follow theme (colours, shape of bars)', 'bool'],
    ['layout', 'Layout', 'select', ['theme', 'mirror', 'rise', 'edges', 'ring']],
    ['range', 'Frequencies shown', 'select', ['full', 'bass', 'voice']],
    ['bars', 'Bar density', 'range', 0.4, 2, 0.05],
    ['gamma', 'Bar contrast', 'range', 0.5, 2.5, 0.05],
    ['blur', 'Rounded peaks', 'range', 0, 1, 0.05],
    ['smooth', 'Bar smoothing', 'range', 0, 1, 0.05],
    ['peaks', 'Peak caps', 'bool'],
    ['peakFall', 'Peak fall speed', 'range', 0.1, 2, 0.05],
    ['glow', 'Bar glow', 'range', 0, 1, 0.05],
    ['wave', 'Waveform line', 'bool'],
    ['c1', 'Bar colour (edges) - when not following theme', 'color'],
    ['c2', 'Bar colour (middle)', 'color'],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
  App.cfg.onGroupChange('basic', function(){ barGradient = null; gradKey = ''; });
})();
