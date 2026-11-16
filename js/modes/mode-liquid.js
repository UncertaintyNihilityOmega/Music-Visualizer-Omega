/* ---------- Liquid ----------
   A drop of liquid in the middle of a whirlpool. Its edge is the sound:
   bass at the bottom, treble at the top, the same on both sides. The edge
   moves like something thick (it rises fast and sinks slowly), and rings
   of lighter liquid follow it a moment later, each one wider than the last.
     calm passage   a round drop that breathes; the whirlpool barely turns
     loud passage   long lobes, a fast whirlpool
     kick           the whole drop swells
     snare          the drop throws droplets, which fall back in
     tap            a splash where the finger lands

   The liquid follows the theme code (look.liquid in themes.js):
     fill, rim   the drop and the light on its edge;  bg1, bg2  the water behind
     kind        'ink' smooth | 'slime' drips hang from it | 'mercury' moves in steps | 'plasma' edge flickers
     rainbow     true = the rings run through the colours
   "Follow theme" off = the user's own colours, smooth.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var N = 96, BARS = 20, HIST = 12;
  var vals = new Float32Array(BARS), valState = new Float32Array(BARS);
  var rad = new Float32Array(N);              // the edge now: how far each point stands out (0 = a circle)
  var hist = [], histAt = 0;                  // the edge a few frames ago, for the rings that follow
  for (var hi = 0; hi < HIST; hi++) hist.push(new Float32Array(N));
  var poke = new Float32Array(N);             // extra push from a tap, dies away
  var drops = [], spin = 0, swell = 0;

  var OWN = { kind: 'ink' };
  function look(){
    var cfg = Cfg.CFG.liquid, th = App.theme && App.theme.look;
    if (cfg.followTheme && th && th.liquid) return th.liquid;
    OWN.fill = cfg.fill; OWN.rim = cfg.rim; OWN.bg1 = cfg.bg1; OWN.bg2 = cfg.bg2;
    return OWN;
  }
  function bgColors(){ var L = look(); return { bg1: L.bg1, bg2: L.bg2 }; }

  // a closed smooth curve through the N edge points, drawn at scale s with the deformation times d
  function blobPath(cx, cy, R, arr, s, d){
    var px = 0, py = 0, fx = 0, fy = 0, lx = 0, ly = 0;
    ctx.beginPath();
    for (var i = 0; i <= N + 1; i++){
      var j = i % N, a = j / N * 6.283 - Math.PI / 2;
      var r = R * s * (1 + arr[j] * d);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0){ fx = x; fy = y; }
      else {
        var mx = (lx + x) / 2, my = (ly + y) / 2;
        if (i === 1) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(lx, ly, mx, my);
      }
      lx = x; ly = y;
    }
    ctx.closePath();
  }

  function draw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.liquid;
    var mo = Cfg.CFG.look.motion, L = look();
    var cx = w / 2, cy = h / 2, minDim = Math.min(w, h);
    var R = minDim * 0.17 * cfg.size;
    var rim = U.hexRGB(L.rim), i;
    Can.backdrop(1);

    /* --- the whirlpool: streaks of lighter water circling the drop --- */
    if (cfg.swirl){
      spin += dt * mo * (0.12 + A.drive * 0.9 + A.kick * 0.5);
      ctx.lineCap = 'round';
      var far = Math.sqrt(w * w + h * h) / 2;
      for (i = 0; i < 46; i++){
        var f = (i * 0.618034) % 1, rr = R * 1.5 + (far - R * 1.5) * f;
        // inner water turns faster than outer water
        var a0 = i * 2.39996 + spin * (2.4 - f * 1.7), len = 0.35 + ((i * 0.37) % 1) * 0.9;
        ctx.strokeStyle = L.rainbow ? 'hsla(' + Math.round(f * 300 + A.t * 25) % 360 + ',80%,62%,' + (0.1 + (1 - f) * 0.16).toFixed(3) + ')'
                                    : U.rgba(rim, (0.05 + (1 - f) * 0.13 + A.drive * 0.05).toFixed(3));
        ctx.lineWidth = (1.5 + ((i * 0.71) % 1) * 5) * k * (0.6 + f);
        ctx.beginPath();
        // an oval, slightly squashed, so it reads as water seen from above at an angle
        ctx.ellipse(cx, cy, rr, rr * 0.9, 0, a0, a0 + len);
        ctx.stroke();
      }
    }

    /* --- the edge of the drop --- */
    Aud.bars(vals, { lo: 40, hi: 9000, scale: 'log', blur: 0.35, state: valState, attack: 30, release: 5 });
    swell = U.env(swell, A.kick, 30, 4, dt);
    var big = 0.25 + 0.75 * A.drive, t = A.t * mo;
    for (i = 0; i < N; i++){
      // u: 0 at the bottom (bass), 1 at the top (treble); both sides alike
      var ang = i / N * 6.283, u = 0.5 - 0.5 * Math.cos(ang);
      u = 1 - u;                                             // i = 0 is the top
      var bf = u * (BARS - 1), b0 = Math.floor(bf), b1 = Math.min(BARS - 1, b0 + 1), fr = bf - b0;
      fr = fr * fr * (3 - 2 * fr);
      var v = vals[b0] + (vals[b1] - vals[b0]) * fr;
      // slow waves round the edge so it is never a dead circle
      var slow = Math.sin(ang * 3 + t * 0.9) * 0.5 + Math.sin(ang * 5 - t * 1.3) * 0.3 + Math.sin(ang * 2 + t * 0.5) * 0.4;
      var target = (v * 0.62 * big + slow * 0.035 * (0.5 + A.drive)) * cfg.wobble;
      if (L.kind === 'slime'){
        // drips: three lobes hang from the lower half and stretch as they fill
        var down = Math.max(0, -Math.cos(ang));
        target += Math.pow(down, 3) * Math.pow(Math.abs(Math.sin(ang * 3.5 + 0.6)), 6) * (0.45 + 0.4 * Math.sin(t * 0.6 + Math.floor(ang * 1.1) * 2)) * cfg.wobble;
      } else if (L.kind === 'mercury'){
        target = Math.round(target * 9) / 9;
      } else if (L.kind === 'plasma'){
        var hx = Math.sin(i * 12.9898 + Math.floor(A.t * 20) * 78.233) * 43758.5453;
        target += ((hx - Math.floor(hx)) - 0.5) * 0.09 * (0.3 + A.drive) * cfg.wobble;
      }
      target += poke[i];
      poke[i] *= Math.exp(-3.5 * dt);
      // thick liquid: quick to rise, slow to settle
      rad[i] = U.env(rad[i], target, 22, 4.5, dt);
    }
    // keep a short history for the rings
    histAt = (histAt + 1) % HIST;
    hist[histAt].set(rad);

    /* --- rings of lighter liquid that follow the edge, widest and latest first --- */
    var rings = Math.round(cfg.rings), sw = 1 + swell * 0.09;
    for (var g = rings; g >= 1; g--){
      var old = hist[(histAt - Math.min(HIST - 1, g * 3) + HIST * 2) % HIST];
      blobPath(cx, cy, R * sw, old, 1 + g * 0.3, 1 + g * 0.25);
      ctx.fillStyle = L.rainbow ? 'hsla(' + Math.round(g * 70 + A.t * 30) % 360 + ',85%,62%,' + (0.34 - g * 0.06).toFixed(3) + ')'
                                : U.rgba(rim, (0.36 - g * 0.07 + A.drive * 0.06).toFixed(3));
      ctx.fill();
    }

    /* --- droplets: thrown by a snare, pulled back by the drop --- */
    if (cfg.droplets && A.snareHit > 0.4 && A.drive > 0.15 && drops.length < 60){
      var nd = 2 + Math.round(A.snareHit * 5 * big);
      for (var d = 0; d < nd; d++){
        var da = Math.random() * 6.283, sp = (160 + Math.random() * 260) * k * (0.5 + A.drive);
        drops.push({ x: cx + Math.cos(da) * R, y: cy + Math.sin(da) * R, vx: Math.cos(da) * sp, vy: Math.sin(da) * sp,
                     r: (2 + Math.random() * 5) * k * cfg.size, age: 0 });
      }
    }
    ctx.fillStyle = L.fill;
    for (var di = drops.length - 1; di >= 0; di--){
      var p = drops[di];
      p.age += dt;
      var dx = cx - p.x, dy = cy - p.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx += dx / dist * 620 * k * dt; p.vy += dy / dist * 620 * k * dt;
      p.vx *= Math.exp(-0.9 * dt); p.vy *= Math.exp(-0.9 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if ((p.age > 0.25 && dist < R * 0.95) || p.age > 4){
        // it falls back in and pushes the edge out where it lands
        if (p.age <= 4){ var pi = Math.round(((Math.atan2(-dy, -dx) + Math.PI / 2) / 6.283 + 1) * N) % N; poke[pi] += 0.1; }
        drops.splice(di, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = U.rgba(rim, 0.7);
      ctx.lineWidth = k;
      ctx.stroke();
    }

    /* --- the drop itself --- */
    blobPath(cx, cy, R * sw, rad, 1, 1);
    ctx.fillStyle = L.fill;
    ctx.shadowColor = L.rim;
    ctx.shadowBlur = (10 + A.drive * 22) * k * cfg.glow * Cfg.CFG.look.glow * 2;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = L.rainbow ? 'hsl(' + Math.round(A.t * 40) % 360 + ',90%,65%)' : U.rgba(rim, 0.9);
    ctx.lineWidth = (1.2 + A.drive * 1.6) * k;
    ctx.stroke();
    // a curved highlight: the drop is wet
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + A.drive * 0.12).toFixed(3) + ')';
    ctx.lineWidth = R * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R * sw * 0.74, -2.6, -1.75);
    ctx.stroke();

    // the theme's mark floats in the middle
    if (cfg.mark){
      var th = App.theme.THEMES[App.theme.current], ch = (th && th.mark) || 'Ω';
      var ms = R * (0.95 + swell * 0.16);
      ctx.globalAlpha = 0.9;
      ctx.drawImage(Can.glyphSprite(ch, L.rim), cx - ms / 2, cy - ms / 2, ms, ms);
      ctx.globalAlpha = 1;
    }
  }

  function paintBG(c, w, h){
    // darker towards the edges, so the eye rests on the drop
    var g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  // Touch: a splash. The nearest part of the edge jumps out and droplets fly from the finger.
  function onTap(x, y){
    var k = Can.dpr(), cx = canvas.width / 2, cy = canvas.height / 2;
    App.taps.spawnRing(x, y, look().rim);
    var at = Math.round(((Math.atan2(y - cy, x - cx) + Math.PI / 2) / 6.283 + 1) * N) % N;
    for (var o = -6; o <= 6; o++) poke[(at + o + N) % N] += 0.3 * Math.exp(-o * o / 9);
    for (var d = 0; d < 7 && drops.length < 70; d++){
      var a = Math.random() * 6.283, sp = (90 + Math.random() * 200) * k;
      drops.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (2 + Math.random() * 4) * k, age: 0 });
    }
  }
  function reset(){ drops = []; for (var i = 0; i < N; i++){ rad[i] = 0; poke[i] = 0; } }

  App.modes.register('liquid', { draw: draw, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset, fx: 0.7 });

  App.cfg.registerDefaults('liquid', {
    followTheme: true, size: 1, wobble: 1, rings: 3, swirl: true, droplets: true, mark: true, glow: 0.6,
    fill: '#07050F', rim: '#B06BFF', bg1: '#1B1140', bg2: '#06040E'
  });
  App.cfg.registerSchema({ id: 'liquid', label: 'Liquid', fields: [
    ['followTheme', 'Follow theme (the liquid, its colours and the water)', 'bool'],
    ['size', 'Drop size', 'range', 0.5, 1.8, 0.05],
    ['wobble', 'How far the edge moves', 'range', 0.2, 2.5, 0.05],
    ['rings', 'Rings that follow the edge', 'range', 0, 3, 1],
    ['swirl', 'Whirlpool behind the drop', 'bool'],
    ['droplets', 'Droplets on a snare', 'bool'],
    ['mark', 'Theme mark in the middle', 'bool'],
    ['glow', 'Glow amount', 'range', 0, 1, 0.05],
    ['fill', 'Drop colour', 'color'],
    ['rim', 'Edge and ring colour', 'color'],
    ['bg1', 'Water (top)', 'color'],
    ['bg2', 'Water (bottom)', 'color']
  ]});
  App.cfg.onGroupChange('liquid', function(key){
    if (key === 'followTheme' || key === 'bg1' || key === 'bg2' || key === null) Can.invalidateBG();
  });
})();
