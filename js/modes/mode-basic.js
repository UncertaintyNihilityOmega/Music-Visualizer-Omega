/* ---------- Basic ----------
   The classic bar spectrum, with four layouts and two things learned from
   studying real visualiser videos (docs/RESEARCH.md):
     - "Bass focus" range: those videos only show about 30-800 Hz, spread
       evenly, which is why a kick drum makes one tall clean spike instead
       of a blur across half the screen.
     - Rounded peaks: each bar leans a little on its neighbours.
   When "Follow theme" is on, colours, layout and what the bars are built
   from (solid, 1s and 0s, emoji...) come from the active theme code.
   The thin wavy line across the picture is the sound's waveform (setting
   "Waveform line"). A quiet passage is drawn at 60 % height and the bars follow
   it slowly; from a drive of 0.45 up they are as tall and as quick as ever. */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var vals = null, state = null, peakCaps = null, barGradient = null, gradKey = '';
  var tapPlus = [];

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
    // a quiet passage: the bars follow the spectrum slowly (attack 22 against 70, release 40 % against 100 %), so a soft
    // verse flows instead of flickering; from a drive of 0.45 up they are as quick and as tall as before
    var loud = Math.min(1, A.drive * 2.2);
    Aud.bars(vals, { lo: r.lo, hi: r.hi, scale: r.scale, blur: cfg.blur, state: state,
                     attack: U.lerp(22, 70, loud), release: U.lerp(42, 5, cfg.smooth) * (0.4 + 0.6 * loud) });
    for (var i = 0; i < n; i++){
      var v = Math.pow(vals[i], cfg.gamma) * (0.6 + 0.4 * loud);   // a soft passage stands at 60 % of its height, so its flutter is smaller too
      vals[i] = v;
      if (v > peakCaps[i]) peakCaps[i] = v;
      else peakCaps[i] = Math.max(v, peakCaps[i] - A.dt * cfg.peakFall);
    }
  }

  var glyphSprite = Can.glyphSprite;   // a character pre-drawn once per colour (canvas-core.js)
  // The same character scaled down once to the size of a cell: drawing a 48 px sprite into an 11 px cell
  // for every glyph of every bar cost 4.5 ms a frame at 1280 px; a 1 to 1 copy costs a fraction of it.
  var cellSprites = {};
  function cellSprite(ch, color, cell){
    var px = Math.max(4, Math.round(cell)), key = ch + '|' + color + '|' + px, sp = cellSprites[key];
    if (sp) return sp;
    if (Object.keys(cellSprites).length > 60) cellSprites = {};
    sp = document.createElement('canvas');
    sp.width = sp.height = px;
    var c = sp.getContext('2d');
    c.imageSmoothingQuality = 'high';
    c.drawImage(glyphSprite(ch, color), 0, 0, px, px);
    cellSprites[key] = sp;
    return sp;
  }
  function hash(a, b, c){
    var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return x - Math.floor(x);
  }
  // A bar of a fixed glyph pattern is the same picture every frame it has the same height, so each (bar, rows, direction)
  // is built once as one small canvas and drawn with one call instead of one per glyph (a flickering 1 / 0 set cannot be).
  var columns = {}, columnCount = 0;
  function glyphColumn(lk, i, n, dir, cell){
    var px = Math.max(4, Math.round(cell));
    var key = i + '|' + n + '|' + dir + '|' + px + '|' + lk.c1 + lk.c2 + (lk.dark ? 'd' : 'l') + lk.glyphs.join('');
    var col = columns[key];
    if (col) return col;
    if (columnCount > 1200){ columns = {}; columnCount = 0; }
    col = document.createElement('canvas');
    col.width = px; col.height = n * px;
    var c = col.getContext('2d');
    for (var j = 0; j < n; j++){
      var top = j === n - 1;
      c.globalAlpha = top ? 1 : (lk.dark ? 0.55 + 0.45 * (j / n) : 0.88 + 0.12 * (j / n));
      c.drawImage(cellSprite(lk.glyphs[(i + j) % lk.glyphs.length], top ? lk.c2 : lk.c1, cell), 0, dir < 0 ? (n - 1 - j) * px : j * px, px, px);
    }
    columns[key] = col; columnCount++;
    return col;
  }
  // one bar made of stacked glyphs, growing from (x, y0) in direction dir (-1 up, +1 down)
  function glyphBar(lk, i, x, y0, bw, barH, dir, cell){
    var n = Math.max(1, Math.round(barH / cell));
    if (lk.glyphs.length !== 2 && n <= 40){
      var colm = glyphColumn(lk, i, n, dir, cell);
      ctx.drawImage(colm, x + (bw - cell) / 2, dir < 0 ? y0 - colm.height : y0);
      return;
    }
    var tick = Math.floor(A.t * 9);
    for (var j = 0; j < n; j++){
      var g = lk.glyphs.length === 2
        ? lk.glyphs[hash(i, j, tick) < 0.5 ? 0 : 1]            // two glyphs (1/0): flicker at random
        : lk.glyphs[(i + j) % lk.glyphs.length];                // a set: fixed pattern
      var top = j === n - 1;
      var sp = cellSprite(g, top ? lk.c2 : lk.c1, cell);
      // on a light picture the lower glyphs were drawn at 55 % and washed out into the cream: keep them near full strength
      ctx.globalAlpha = top ? 1 : (lk.dark ? 0.55 + 0.45 * (j / n) : 0.88 + 0.12 * (j / n));
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

  // Bars brighten a little as the passage gets louder: the path just filled
  // is filled again with a thin wash (white on dark themes, the middle
  // colour on light ones). Nothing happens in a calm passage.
  function loudWash(lk){
    var a = A.drive * Cfg.CFG.basic.loudTint * 0.3;
    if (a < 0.01) return;
    ctx.shadowBlur = 0;
    ctx.fillStyle = lk.dark ? 'rgba(255,255,255,' + a.toFixed(3) + ')' : U.rgba(U.hexRGB(lk.c2), (a * 1.3).toFixed(3));
    ctx.fill();
  }
  // The theme's mark (the omega, a pumpkin...) in the middle of the ring,
  // jumping with the kick drum.
  function drawLogo(lk, cx, cy, R, k){
    var th = App.theme.THEMES[App.theme.current], mark = th && Cfg.CFG.basic.followTheme ? th.mark : 'Ω';
    var size = R * 1.05 * (1 + A.kick * 0.14 * (0.3 + 0.7 * A.drive));
    ctx.save();
    ctx.globalAlpha = 0.82 + A.kick * 0.18;
    if (Cfg.CFG.basic.glow * Cfg.CFG.look.glow > 0.01){
      ctx.shadowColor = lk.c2;
      ctx.shadowBlur = (8 + A.kick * 26) * k;
    }
    ctx.drawImage(glyphSprite(mark, lk.dark ? '#FFFFFF' : lk.c1), cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
  }

  function drawBasic(){
    var w = canvas.width, h = canvas.height, cy = h / 2, cx = w / 2, k = Can.dpr(), cfg = Cfg.CFG.basic;
    var lk = look(), layout = layoutOf(lk);
    Can.backdrop(1);
    var capColor = lk.dark ? 'rgba(255,255,255,0.45)' : 'rgba(60,20,30,0.3)';
    var trailColor = lk.dark ? 'rgba(255,255,255,0.09)' : 'rgba(60,20,30,0.07)';
    var glyphs = lk.glyphs && lk.glyphs.length ? lk.glyphs : null;
    var i, v, barH;

    if (layout === 'dots'){
      // Dotted bars standing on a curved line, bass at both outer edges and
      // treble meeting in the middle: the look of the second test video.
      var cols = Math.max(24, Math.min(150, Math.round(w / (11 * k) * cfg.bars)));
      var halfN = Math.ceil(cols / 2);
      sample(halfN);
      var colW = w / cols, dot = Math.max(2 * k, colW * 0.58), stepY = dot * 1.45;
      var baseY = h * 0.8, rise = h * 0.13, maxDots = Math.floor(h * 0.6 / stepY);
      ctx.fillStyle = fillFor(lk, w, h);
      glowOn(lk, k);
      ctx.beginPath();
      var tops = [];
      for (i = 0; i < cols; i++){
        v = vals[Math.min(halfN - 1, i < halfN ? i : cols - 1 - i)];
        var x0 = i * colW + colW / 2;
        var by = baseY - Math.sin(Math.PI * i / (cols - 1)) * rise;
        var nd = Math.max(1, Math.round(v * maxDots));
        for (var dj = 0; dj < nd; dj++){
          var dy = by - dj * stepY;
          ctx.moveTo(x0 + dot / 2, dy);
          ctx.arc(x0, dy, dot / 2, 0, 6.283);
        }
        tops.push(x0, by - (nd - 1) * stepY);
      }
      ctx.fill();
      loudWash(lk);
      ctx.shadowBlur = 0;
      // the top dot of each column, in the second colour
      ctx.fillStyle = lk.rainbow ? capColor : lk.c2;
      ctx.beginPath();
      for (i = 0; i < tops.length; i += 2){ ctx.moveTo(tops[i] + dot / 2, tops[i + 1]); ctx.arc(tops[i], tops[i + 1], dot / 2, 0, 6.283); }
      ctx.fill();
      // the curved line itself
      ctx.strokeStyle = lk.dark ? 'rgba(255,255,255,0.22)' : 'rgba(60,20,30,0.2)';
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      for (i = 0; i < cols; i++){
        var lx = i * colW + colW / 2, ly = baseY - Math.sin(Math.PI * i / (cols - 1)) * rise + dot * 1.1;
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
      return;
    }

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
      } else if (cfg.logo){
        drawLogo(lk, cx, cy, R, k);
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
      else if (!lk.dark){
        // glyphs standing on a light picture: a stem in the bar colour (contrast 4.8 : 1 on Solarpunk's cream) under each, so a bar reads from far away
        ctx.strokeStyle = lk.c1;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1.5 * k, bw * 0.14);
        ctx.beginPath();
        for (i = 0; i < count; i++){
          var ssrc = layout === 'edges' ? (i < half ? i : count - 1 - i) : i;
          var stx = i * barW + barW / 2;
          ctx.moveTo(stx, floor);
          ctx.lineTo(stx, floor - Math.max(1.5 * k, vals[Math.min(half - 1, ssrc)] * maxH));
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (i = 0; i < count; i++){
        // 'edges': bass at both outer edges, treble meeting in the middle
        var src = layout === 'edges' ? (i < half ? i : count - 1 - i) : i;
        v = vals[Math.min(half - 1, src)];
        barH = Math.max(1.5 * k, v * maxH);
        var x = i * barW + (barW - bw) / 2;
        if (glyphs) glyphBar(lk, i, x, floor, bw, barH, -1, cell);
        else ctx.rect(x, floor - barH, bw, barH);
      }
      if (!glyphs){ ctx.fill(); loudWash(lk); ctx.shadowBlur = 0; }
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
        var trail = cfg.peakTrail ? [] : null;
        ctx.beginPath();
        for (i = 0; i < count; i++){
          var src3 = layout === 'edges' ? (i < half ? i : count - 1 - i) : i;
          var si3 = Math.min(half - 1, src3), capTop = floor - peakCaps[si3] * maxH - 3 * k;
          ctx.rect(i * barW + (barW - bw) / 2, capTop, bw, 2 * k);
          if (trail) trail.push(i * barW + (barW - bw) / 2, capTop + 2 * k, (floor - Math.max(1.5 * k, vals[si3] * maxH)) - capTop - 2 * k);
        }
        ctx.fillStyle = capColor;
        ctx.fill();
        // the fading trail a falling cap leaves between itself and its bar
        if (trail){
          ctx.beginPath();
          for (i = 0; i < trail.length; i += 3) if (trail[i + 2] > k) ctx.rect(trail[i], trail[i + 1], bw, trail[i + 2]);
          ctx.fillStyle = trailColor;
          ctx.fill();
        }
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
      if (!glyphs){ ctx.fill(); loudWash(lk); ctx.shadowBlur = 0; }
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
        // the fading trail a falling cap leaves between itself and its bar
        if (cfg.peakTrail){
          ctx.beginPath();
          for (var pt = 0; pt < barCount; pt++){
            var top2 = Math.max(1.5 * k, vals[pt] * maxH2), gapH = peakCaps[pt] * maxH2 - top2;
            if (gapH <= k) continue;
            var xr2 = cx + pt * barW2, xl2 = cx - (pt + 1) * barW2;
            ctx.rect(xr2, cy - top2 - gapH, bw2, gapH);
            ctx.rect(xl2, cy - top2 - gapH, bw2, gapH);
            ctx.rect(xr2, cy + top2, bw2, gapH);
            ctx.rect(xl2, cy + top2, bw2, gapH);
          }
          ctx.fillStyle = trailColor;
          ctx.fill();
        }
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

  function reset(){ vals = null; barGradient = null; gradKey = ''; columns = {}; columnCount = 0; cellSprites = {}; }
  App.canvas.addResizeHook(reset);

  App.modes.register('basic', { draw: drawBasic, paintBG: paintBG, bgColors: bgColors, onTap: onTap, drawTapFX: drawTapFX, reset: reset });

  App.cfg.registerDefaults('basic', {
    followTheme: true, layout: 'theme', range: 'full',
    bars: 1, gamma: 1, blur: 0.35, smooth: 0.45, peaks: true, peakFall: 0.6, peakTrail: true,
    loudTint: 0.5, logo: true, glow: 0.4, wave: true,
    c1: '#BD9257', c2: '#C2626F', bg1: '#FFF8F3', bg2: '#F1D8D5'
  });
  App.cfg.registerSchema({ id: 'basic', label: 'Basic', fields: [
    ['followTheme', 'Follow theme (colours, shape of bars)', 'bool'],
    ['layout', 'Layout', 'layout', ['theme', 'mirror', 'rise', 'edges', 'dots', 'ring']],
    ['range', 'Frequencies shown', 'select', ['full', 'bass', 'voice']],
    ['bars', 'Bar density', 'range', 0.4, 2, 0.05],
    ['gamma', 'Bar contrast', 'range', 0.5, 2.5, 0.05],
    ['blur', 'Rounded peaks', 'range', 0, 1, 0.05],
    ['smooth', 'Bar smoothing', 'range', 0, 1, 0.05],
    ['peaks', 'Peak caps', 'bool'],
    ['peakFall', 'Peak fall speed', 'range', 0.1, 2, 0.05],
    ['peakTrail', 'Peak caps leave a trail', 'bool'],
    ['loudTint', 'Bars brighten when loud', 'range', 0, 1, 0.05],
    ['logo', 'Theme mark in the ring, pulsing with the kick', 'bool'],
    ['glow', 'Bar glow', 'range', 0, 1, 0.05],
    ['wave', 'Waveform line', 'bool'],
    ['c1', 'Bar colour (edges) - when not following theme', 'color'],
    ['c2', 'Bar colour (middle)', 'color'],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
  App.cfg.onGroupChange('basic', function(){ barGradient = null; gradKey = ''; });
})();
