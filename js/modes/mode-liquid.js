/* ---------- Liquid ----------
   A drop of liquid in the middle of a whirlpool. Its edge is the sound:
   bass at the bottom, treble at the top, the same on both sides. The edge
   moves like something thick (it rises fast and sinks slowly), and rings
   of lighter liquid follow it a moment later, each one wider than the last.
     calm passage   a small round drop that breathes; the whirlpool barely turns
     loud passage   long lobes, a fast whirlpool
     kick ("boom")  measured on the example video (inspiration/liquid-example.mp4, the hits at
                    49.8 s and 129.8 s): within two frames the drop grows to about 1.4 times its
                    size and throws up two sharp horns on its upper left and right; a bright copy
                    of its shape flashes behind it; the whirlpool jumps towards the viewer and
                    specks fly outward. It is back to rest in about 0.3 s.
     snare          the drop throws droplets, which fall back in
     tap            a splash where the finger lands

   The liquid follows the theme code (look.liquid in themes.js):
     fill, rim   the drop and the light on its edge;  bg1, bg2  the water behind
     kind        'ink' smooth | 'slime' drips hang from it | 'mercury' moves in steps | 'plasma' edge flickers
     rainbow     true = the rings run through the colours
   Each code also has a form of its own (a grey-scale copy still shows it), chosen by the code's id:
     tessa       forked lightning leaps off the edge, more of it the louder the music
     newyear     a ring of twelve tick marks round the drop, like a clock face at midnight
     halloween   long strands of slime hang from the drop, each ending in a bead
     love        the drop is a heart (the rings follow its outline)
     solarpunk   the drop is a six-petal flower that turns slowly
     cyberpunk   the drop is a hexagon (its edge still moves in steps)
     nihilum     a tilted ring circles the drop, and the water and specks run inward
     incertum    a second, small drop orbits the first
   Everything that moves is tied to the loudness (A.drive), so a quiet passage leaves it nearly still.
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
  var drops = [], spin = 0, swell = 0, specks = null;
  var tw = 0, hue = 0;                        // the edge's slow waves and the rainbow's hue: both advance with the music, not with the clock
  var HORN = 0.72;                            // where the two horns stand, in radians from the top

  function hash(a, b){ var x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }

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

  // the drop's outline at rest under each code (added to the edge; it does not move by itself)
  function outline(form, ang, phi, spin){
    var d, e;
    if (form === 'love'){                          // a heart: a notch on top, a point below, full shoulders
      d = phi / 0.32; e = (Math.PI - phi) / 0.55;
      var sh = (phi - 1.05) / 0.55;
      return -0.3 * Math.exp(-d * d) + 0.32 * Math.exp(-e * e) + 0.14 * Math.exp(-sh * sh);
    }
    if (form === 'solarpunk')                      // six petals
      return 0.2 * (Math.pow(Math.abs(Math.cos(3 * (ang + spin * 0.25))), 0.8) - 0.6);
    if (form === 'cyberpunk'){                     // a hexagon
      var a = (ang + spin * 0.2) % (Math.PI / 3);
      return 1.6 * (0.866 / Math.cos(a - Math.PI / 6) - 1) + 0.1;
    }
    return 0;
  }

  // Tessa: forked lightning off the edge. It starts afresh 18 times a second; the louder, the more bolts
  function bolts(cx, cy, R, rim, k, calm, swell){
    var n = Math.round(1 + 7 * calm), jt = Math.floor(A.t * 18), reach = R * (0.9 + 1.1 * calm + swell * 0.6);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++){
      ctx.strokeStyle = pass ? U.rgba(rim, 0.95) : U.rgba(rim, 0.25);
      ctx.lineWidth = (pass ? 1.5 : 5) * k;
      ctx.beginPath();
      for (var b = 0; b < n; b++){
        var base = (b + hash(b, jt) * 0.6) / n * 6.283, px = 0, py = 0, segs = 7;
        for (var s2 = 0; s2 <= segs; s2++){
          var r = R * 0.95 + reach * s2 / segs, off = s2 === 0 ? 0 : (hash(b * 7 + s2, jt) - 0.5) * R * 0.34;
          var x = cx + Math.cos(base) * r - Math.sin(base) * off, y = cy + Math.sin(base) * r + Math.cos(base) * off;
          if (s2 === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          if (s2 === 3){ px = x; py = y; }
        }
        // a fork from the middle of the bolt
        var fa = base + (hash(b, jt + 9) < 0.5 ? -0.5 : 0.5);
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(fa) * reach * 0.34, py + Math.sin(fa) * reach * 0.34);
      }
      ctx.stroke();
    }
  }

  // Halloween: strands of slime hang from the drop, each ending in a bead; they lengthen with the music
  function drips(cx, cy, R, rim, k, big, L){
    var xs = [-0.55, 0.05, 0.5];
    ctx.lineCap = 'round';
    for (var d = 0; d < 3; d++){
      var ext = 0.5 + 0.5 * Math.sin(tw * 0.35 + d * 2.1), ox = xs[d] * R;
      var y0 = cy + R * 0.7, len = R * (0.3 + 1.7 * big * ext), wd = R * 0.17, rb = R * 0.15 + wd * 0.2 * ext;
      var yb = y0 + len + R * 0.2;
      ctx.strokeStyle = U.rgba(rim, 0.9);
      ctx.lineWidth = wd + 2.4 * k;
      ctx.beginPath(); ctx.moveTo(cx + ox, y0); ctx.lineTo(cx + ox, yb - rb * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + ox, yb, rb + 1.2 * k, 0, 6.283); ctx.stroke();
      ctx.fillStyle = L.fill;
      ctx.strokeStyle = L.fill;
      ctx.lineWidth = wd;
      ctx.beginPath(); ctx.moveTo(cx + ox, y0); ctx.lineTo(cx + ox, yb - rb * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + ox, yb, rb, 0, 6.283); ctx.fill();
    }
  }

  // Nihilum: a thin tilted ring round the dark drop (back half behind it, front half over it)
  function ring(cx, cy, R, rim, k, calm, back){
    var a0 = back ? Math.PI : 0, a1 = back ? 6.283 : Math.PI;
    for (var pass = 0; pass < 2; pass++){
      ctx.strokeStyle = U.rgba(rim, pass ? (0.55 + 0.4 * calm).toFixed(3) : (0.12 + 0.12 * calm).toFixed(3));
      ctx.lineWidth = (pass ? 1.8 : 7) * k;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 2.3, R * 0.6, -0.3, a0, a1);
      ctx.stroke();
    }
  }

  function draw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.liquid;
    var mo = Cfg.CFG.look.motion, L = look();
    var cx = w / 2, cy = h / 2, minDim = Math.min(w, h);
    var R = minDim * 0.15 * cfg.size;
    var rim = U.hexRGB(L.rim), i;
    var form = cfg.followTheme && App.theme.look && App.theme.look.liquid ? App.theme.current : '';
    var calm = Math.min(1, A.drive * 2.2);      // 0 in a quiet passage, 1 once the music is clearly loud
    Can.backdrop(1);

    /* --- the whirlpool: streaks of lighter water circling the drop --- */
    // a soft passage has soft kicks too: the boom grows with how loud the music is, so a quiet verse stays calm
    swell = U.env(swell, A.kick * cfg.boom * (0.04 + 0.96 * calm), 34, 5, dt);
    var bgRGB = U.hexRGB(L.bg1), darkBG = bgRGB[0] + bgRGB[1] + bgRGB[2] < 380;
    var zoom = 1 + swell * 0.17;              // the water jumps towards the viewer on a boom
    if (cfg.swirl){
      spin += dt * mo * (0.01 + A.drive * 1.8 + swell * 1.4) * (form === 'nihilum' ? -1 : 1);
      ctx.lineCap = 'round';
      var far = Math.sqrt(w * w + h * h) / 2;
      for (i = 0; i < 46; i++){
        var f = (i * 0.618034) % 1, rr = (R * 1.5 + (far - R * 1.5) * f) * zoom;
        // inner water turns faster than outer water
        var a0 = i * 2.39996 + spin * (2.4 - f * 1.7), len = 0.35 + ((i * 0.37) % 1) * 0.9;
        ctx.strokeStyle = L.rainbow ? 'hsla(' + Math.round(f * 300 + hue * 0.6) % 360 + ',80%,62%,' + (0.1 + (1 - f) * 0.16).toFixed(3) + ')'
                                    : U.rgba(rim, (0.05 + (1 - f) * 0.13 + A.drive * 0.05).toFixed(3));
        ctx.lineWidth = (1.5 + ((i * 0.71) % 1) * 5) * k * (0.6 + f) * (1 + swell * 0.6);
        ctx.beginPath();
        // an oval, slightly squashed, so it reads as water seen from above at an angle
        ctx.ellipse(cx, cy, rr, rr * 0.9, 0, a0, a0 + len);
        ctx.stroke();
      }
    }

    /* --- specks in the water: they drift outward, and streak away on a boom --- */
    if (cfg.specks){
      if (!specks){
        specks = [];
        for (i = 0; i < 70; i++) specks.push({ a: i * 2.39996, r: (i * 0.618034) % 1, s: (i * 0.37) % 1 });
      }
      var farS = Math.sqrt(w * w + h * h) / 2;
      ctx.strokeStyle = darkBG ? 'rgba(255,255,255,0.8)' : U.rgba(rim, 0.8);
      ctx.lineCap = 'round';
      for (i = 0; i < specks.length; i++){
        var sk = specks[i], r0 = sk.r;
        var sv = dt * mo * (0.002 + A.drive * 0.12 + swell * 0.95) * (0.3 + sk.r);
        if (form === 'nihilum'){                 // the water runs inward, into the dark
          sk.r -= sv;
          if (sk.r < 0.1){ sk.r = 0.9 + Math.random() * 0.1; r0 = sk.r; sk.a = Math.random() * 6.283; }
        } else {
          sk.r += sv;
          if (sk.r > 1.05){ sk.r = 0.12 + Math.random() * 0.1; r0 = sk.r; sk.a = Math.random() * 6.283; }
        }
        var ca = Math.cos(sk.a + spin * 0.15), sa = Math.sin(sk.a + spin * 0.15);
        ctx.globalAlpha = (0.15 + 0.5 * sk.r) * (0.5 + sk.s * 0.5);
        ctx.lineWidth = (0.8 + sk.s * 1.6) * k * (1 + swell * 0.8);
        ctx.beginPath();
        ctx.moveTo(cx + ca * farS * r0, cy + sa * farS * r0);
        ctx.lineTo(cx + ca * farS * sk.r + 0.01, cy + sa * farS * sk.r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    /* --- the pale eye of the whirlpool, behind the drop: it brightens and widens on a boom --- */
    var eyeR = R * (2.5 + swell * 0.8) * zoom;
    var eye = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, eyeR);
    eye.addColorStop(0, U.rgba(rim, (0.3 + swell * 0.3).toFixed(3)));
    eye.addColorStop(0.55, U.rgba(rim, (0.12 + swell * 0.12).toFixed(3)));
    eye.addColorStop(1, U.rgba(rim, 0));
    ctx.fillStyle = eye;
    ctx.fillRect(cx - eyeR, cy - eyeR, eyeR * 2, eyeR * 2);

    if (form === 'newyear'){
      // twelve ticks, like the face of a clock at midnight: the top one is longer, a kick lights them
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba(rim, (0.55 + 0.3 * calm + swell * 0.15).toFixed(3));
      for (i = 0; i < 12; i++){
        var ta = i / 12 * 6.283 - Math.PI / 2 + spin * 0.06, tl = R * (i === 0 ? 0.42 : 0.17 + 0.1 * calm) * (1 + swell * 0.5);
        var t0r = R * 2.5 * zoom;
        ctx.lineWidth = (i === 0 ? 3.6 : 2.2) * k;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ta) * t0r, cy + Math.sin(ta) * t0r);
        ctx.lineTo(cx + Math.cos(ta) * (t0r + tl), cy + Math.sin(ta) * (t0r + tl));
        ctx.stroke();
      }
    }
    if (form === 'nihilum') ring(cx, cy, R, rim, k, calm, true);

    /* --- the edge of the drop --- */
    Aud.bars(vals, { lo: 40, hi: 9000, scale: 'log', blur: 0.35, state: valState, attack: 30, release: 5 });
    // calm music leaves a small round drop that only breathes; a loud passage opens it fully
    var big = Math.min(1, 0.06 + 1.5 * A.drive);
    tw += dt * mo * (0.08 + 1.2 * A.drive);
    hue += dt * mo * (2 + 60 * A.drive);
    var t = tw;
    for (i = 0; i < N; i++){
      // u: 0 at the bottom (bass), 1 at the top (treble); both sides alike
      var ang = i / N * 6.283;
      var phi = ang > Math.PI ? 6.283 - ang : ang;           // 0 at the top, pi at the bottom, both sides alike
      // The bass stands on the two "shoulders" (HORN from the top). From there the sound runs
      // down to the treble at the bottom; the lowest few bars fold back over the top.
      var u = phi >= HORN ? (phi - HORN) / (Math.PI - HORN) : (HORN - phi) / HORN * 0.2;
      var bf = u * (BARS - 1), b0 = Math.floor(bf), b1 = Math.min(BARS - 1, b0 + 1), fr = bf - b0;
      fr = fr * fr * (3 - 2 * fr);
      var v = vals[b0] + (vals[b1] - vals[b0]) * fr;
      // slow waves round the edge so it is never a dead circle
      var slow = Math.sin(ang * 3 + t * 0.9) * 0.5 + Math.sin(ang * 5 - t * 1.3) * 0.3 + Math.sin(ang * 2 + t * 0.5) * 0.4;
      // loud bars stand out far more than quiet ones, and the bass more than the treble
      // (the example's drop stays narrow and smooth below its shoulders: the sides carry little)
      v = Math.pow(v, 1.5) * (0.18 + 1.1 * Math.pow(1 - u, 2.2));
      var target = (v * 0.5 * big + slow * 0.035 * (0.12 + 1.5 * A.drive)) * cfg.wobble;
      // the boom: two sharp horns, pointed because the push falls away evenly on both sides
      target += Math.exp(-Math.abs(phi - HORN) / 0.24) * swell * 0.8;
      if (L.kind === 'slime'){
        // drips: three lobes hang from the lower half and stretch as they fill
        var down = Math.max(0, -Math.cos(ang));
        target += Math.pow(down, 3) * Math.pow(Math.abs(Math.sin(ang * 3.5 + 0.6)), 6) * (0.45 + 0.4 * Math.sin(t * 0.6 + Math.floor(ang * 1.1) * 2)) * cfg.wobble;
      } else if (L.kind === 'mercury'){
        target = Math.round(target * 9) / 9;
      } else if (L.kind === 'plasma'){
        var hx = Math.sin(i * 12.9898 + Math.floor(A.t * 20) * 78.233) * 43758.5453;
        target += ((hx - Math.floor(hx)) - 0.5) * 0.09 * (0.04 + 1.3 * A.drive) * cfg.wobble;
      }
      target += outline(form, ang, phi, spin);
      target += poke[i];
      poke[i] *= Math.exp(-3.5 * dt);
      // thick liquid: quick to rise, slow to settle
      rad[i] = U.env(rad[i], target, 22, 4.5, dt);
    }
    // keep a short history for the rings
    histAt = (histAt + 1) % HIST;
    hist[histAt].set(rad);

    /* --- rings of lighter liquid that follow the edge, widest and latest first --- */
    var rings = Math.round(cfg.rings), sw = 1 + swell * 0.34;
    for (var g = rings; g >= 1; g--){
      var old = hist[(histAt - Math.min(HIST - 1, g * 3) + HIST * 2) % HIST];
      // the nearest ring is the bright copy that flashes behind the drop on a boom
      var flash = g === 1 ? swell * 0.6 : swell * 0.18;
      blobPath(cx, cy, R * sw, old, 1 + g * 0.3, 1 + g * 0.25 + swell * 0.25);
      ctx.fillStyle = L.rainbow ? 'hsla(' + Math.round(g * 70 + hue * 0.8) % 360 + ',85%,62%,' + Math.min(1, 0.34 - g * 0.06 + flash).toFixed(3) + ')'
                                : U.rgba(rim, Math.min(1, 0.36 - g * 0.07 + A.drive * 0.06 + flash).toFixed(3));
      if (g === 1 && swell > 0.1){ ctx.shadowColor = L.rim; ctx.shadowBlur = swell * 34 * k * cfg.glow; }
      ctx.fill();
      ctx.shadowBlur = 0;
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

    if (form === 'tessa' && calm > 0.05) bolts(cx, cy, R * sw, rim, k, calm, swell);
    if (form === 'halloween') drips(cx, cy, R * sw, rim, k, big, L);

    /* --- the drop itself --- */
    blobPath(cx, cy, R * sw, rad, 1, 1);
    ctx.fillStyle = L.fill;
    ctx.shadowColor = L.rim;
    ctx.shadowBlur = (10 + A.drive * 22) * k * cfg.glow * Cfg.CFG.look.glow * 2;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = L.rainbow ? 'hsl(' + Math.round(hue) % 360 + ',90%,65%)' : U.rgba(rim, 0.9);
    ctx.lineWidth = (1.2 + A.drive * 1.6) * k;
    ctx.stroke();
    // a curved highlight: the drop is wet
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.1 + A.drive * 0.12).toFixed(3) + ')';
    ctx.lineWidth = R * 0.05;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, R * sw * 0.74, -2.6, -1.75);
    ctx.stroke();

    if (form === 'nihilum') ring(cx, cy, R, rim, k, calm, false);
    if (form === 'incertum'){
      // a second, small drop circles the first; it swells with the boom
      var sa = 1 + spin * 0.35, sr = R * 2.6, sd = R * 0.34 * (1 + swell * 0.4);
      var sx = cx + Math.cos(sa) * sr, sy = cy + Math.sin(sa) * sr * 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, sd, 0, 6.283);
      ctx.fillStyle = L.fill;
      ctx.fill();
      ctx.strokeStyle = 'hsl(' + Math.round(hue + 120) % 360 + ',90%,60%)';
      ctx.lineWidth = (1.6 + 1.4 * calm) * k;
      ctx.stroke();
    }

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

  App.modes.register('liquid', { draw: draw, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset, fx: 1,
    // for the browser probe: how far the boom has swollen the drop, and its longest horn
    probe: function(){ var mx = 0; for (var i = 0; i < N; i++) if (rad[i] > mx) mx = rad[i]; return { swell: swell, horn: mx }; } });

  App.cfg.registerDefaults('liquid', {
    followTheme: true, size: 1, wobble: 1, boom: 1, rings: 3, swirl: true, specks: true, droplets: true, mark: true, glow: 0.6,
    fill: '#07050F', rim: '#B06BFF', bg1: '#1B1140', bg2: '#06040E'
  });
  App.cfg.registerSchema({ id: 'liquid', label: 'Liquid', fields: [
    ['followTheme', 'Follow theme (the liquid, its colours and the water)', 'bool'],
    ['size', 'Drop size', 'range', 0.5, 1.8, 0.05],
    ['wobble', 'How far the edge moves', 'range', 0.2, 2.5, 0.05],
    ['boom', 'Boom: how hard a kick swells the drop', 'range', 0, 2, 0.05],
    ['rings', 'Rings that follow the edge', 'range', 0, 3, 1],
    ['specks', 'Specks in the water', 'bool'],
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
