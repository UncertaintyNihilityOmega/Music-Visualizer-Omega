/* ---------- Nature (was "Tree"): stands still, grows, sheds ----------
   The tree follows the theme code (look.nature in themes.js):
     trunk, leaf, bloom   colours;  bloomChance  share of leaves that are blossoms (1 = a cherry tree)
     bg1, bg2             sky and ground;  hill = colour of the hills and ground
     dark     true = a night scene: stars and fireflies always, no sun
     glow     true = leaves give off light
     branch   'curve' (wood) | 'straight' (drawn with a ruler) | 'bolt' (jagged, flickers like lightning)
     leafShape 'leaf' | 'square' | 'spark'
     shed     pieces a second that fall from the tree on their own (petals, snow)
     rainbow  true = each leaf has its own hue;  fly = firefly colour "r,g,b"
   "Follow theme" off = the user's own colours on a plain green tree. */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var natGrowth = 0.14, natVit = 0, natLeaves = [], natFalling = [], natFlowers = [];
  var natTips = [], tipsById = {}, branchBudget = 0, leafSeq = 0;
  var natWind = 0, natDay = 0.6, fireflies = [], stars = null, swing = 0;

  var OWN = { branch: 'curve', leafShape: 'leaf', fly: '236,255,150', hill: '#8CAA8C' };
  function look(){
    var cfg = Cfg.CFG.nature, th = App.theme && App.theme.look;
    if (cfg.followTheme && th && th.nature) return th.nature;
    OWN.leaf = cfg.leafColor; OWN.bloom = cfg.bloomColor; OWN.bloomChance = cfg.bloomChance;
    OWN.bg1 = cfg.bg1; OWN.bg2 = cfg.bg2; OWN.trunk = null;
    return OWN;
  }
  function bgColors(){ var L = look(); return { bg1: L.bg1, bg2: L.bg2 }; }

  // Day and night follow how big the passage is, slowly: a long calm
  // stretch brings dusk and stars, a loud one brings the day back.
  function drawSky(w, h, k, dt){
    var cfg = Cfg.CFG.nature;
    natDay = cfg.dayNight ? U.env(natDay, A.drive, 0.22, 0.04, dt) : 1;
    var L = look();
    var night = L.dark ? 1 : U.clamp01(1 - natDay * 1.5);
    if (night > 0.01){
      if (!L.dark){
        var g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(10,14,44,' + (night * 0.78).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(34,26,60,' + (night * 0.6).toFixed(3) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      if (!stars){
        stars = [];
        for (var i = 0; i < 46; i++) stars.push([(i * 0.618034) % 1, ((i * 0.754877) % 1) * 0.62, 0.5 + ((i * 3.3) % 1), (i * 1.7) % 6.283]);
      }
      ctx.fillStyle = '#FFFFFF';
      for (var s = 0; s < stars.length; s++){
        var st = stars[s];
        ctx.globalAlpha = night * (0.35 + 0.45 * Math.sin(A.t * 1.3 + st[3]) * 0.5 + 0.2);
        ctx.fillRect(st[0] * w, st[1] * h, st[2] * 1.6 * k, st[2] * 1.6 * k);
      }
      ctx.globalAlpha = 1;
      // the moon sits where the day's sun glow is painted
      ctx.fillStyle = 'rgba(244,240,214,' + (night * 0.85).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.18, Math.min(w, h) * 0.045, 0, 6.283);
      ctx.fill();
    }
    return night;
  }
  // Fireflies: at night, each hi-hat lights one; a few drift about on their own.
  function drawFireflies(w, h, k, dt, night){
    var cfg = Cfg.CFG.nature;
    if (cfg.fireflies && night > 0.25 && fireflies.length < 40){
      var n = (A.hatHit > 0.2 ? 1 + Math.round(A.hatHit * 2) : 0) + (Math.random() < night * dt * 1.2 ? 1 : 0);
      for (var i = 0; i < n; i++){
        fireflies.push({ x: w * (0.05 + Math.random() * 0.9), y: h * (0.3 + Math.random() * 0.6), ph: Math.random() * 6.283,
                         age: 0, life: 2 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 22 * k, vy: -(4 + Math.random() * 12) * k });
      }
    }
    for (var f = fireflies.length - 1; f >= 0; f--){
      var ff = fireflies[f];
      ff.age += dt;
      if (ff.age > ff.life){ fireflies.splice(f, 1); continue; }
      ff.x += (ff.vx + Math.sin(A.t * 1.4 + ff.ph) * 14 * k + natWind * 18 * k) * dt;
      ff.y += (ff.vy + Math.cos(A.t * 1.1 + ff.ph) * 9 * k) * dt;
      var a = Math.sin(ff.age / ff.life * Math.PI) * (0.55 + 0.45 * Math.sin(A.t * 6 + ff.ph)) * Math.min(1, night * 2);
      var r = 7 * k;
      var g = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, r);
      var fly = look().fly || '236,255,150';
      g.addColorStop(0, 'rgba(' + fly + ',' + a.toFixed(3) + ')');
      g.addColorStop(0.3, 'rgba(' + fly + ',' + (a * 0.45).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + fly + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(ff.x - r, ff.y - r, r * 2, r * 2);
    }
  }

  function flowerHue(){
    var hs = look().flowerHues || [340, 48, 268, 12, 190];
    return hs[Math.floor(Math.random() * hs.length)] + Math.random() * 16;
  }
  function hashRnd(seed){
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  var branchPaths = [];
  function drawBranches(){
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var d = 0; d < branchPaths.length; d++){
      var bp = branchPaths[d];
      if (!bp) continue;
      ctx.strokeStyle = bp.style;
      ctx.lineWidth = bp.width;
      ctx.stroke(bp.path);
    }
  }
  function branch(x, y, ang, len, wid, depth, seed, id, depthF, bands, maxDepth){
    if (branchBudget-- <= 0) return;
    var reveal = U.clamp01(depthF - depth);
    if (reveal <= 0.02) return;

    var cfg = Cfg.CFG.nature;
    var L = len * (0.3 + reveal * 0.7);
    var a = ang;
    if (cfg.sway > 0){
      var bi = Math.min(bands.length - 1, depth);
      a += Math.sin(A.t * (0.55 + depth * 0.42) + seed * 6.283) * (0.028 + depth * 0.032) * (0.4 + bands[bi] * 2.6) * cfg.sway;
    }
    // wind leans the whole tree: thin outer branches bend most, the trunk hardly at all
    if (depth > 0) a += natWind * (0.012 + depth * 0.011);
    // a lively passage rocks the branches, the outer ones most, each at its own pace
    if (swing > 0.01) a += Math.sin(A.t * (1.3 + depth * 0.45) + seed * 6.283) * (0.03 + depth * 0.065) * swing;
    var x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
    var cx = x + Math.cos(a - 0.13) * L * 0.55, cy = y + Math.sin(a - 0.13) * L * 0.55;

    // Every branch of one depth has the same colour and width, so each depth is
    // collected into one path and drawn with one stroke after the walk (drawBranches).
    // Measured 2026-11-16: a full tree was up to 1600 separate strokes, 35 to 50 ms a frame.
    var LK = curLook, bp = branchPaths[depth];
    if (!bp){
      bp = branchPaths[depth] = {
        path: new Path2D(),
        style: LK.trunk ? U.rgba(trunkRGB, (0.4 + reveal * 0.6).toFixed(3))
                        : 'hsla(' + (26 + natVit * 12) + ',' + (24 + natVit * 18) + '%,' +
                          (20 + natVit * 10 + depth * 1.5) + '%,' + (0.35 + reveal * 0.6) + ')',
        // a lightning tree is thin: a bolt, not a trunk
        width: Math.max(0.6 * Can.dpr(), wid * (0.3 + reveal * 0.7) * (LK.branch === 'bolt' ? 0.42 : 1))
      };
    }
    var P2 = bp.path;
    P2.moveTo(x, y);
    if (LK.branch === 'straight') P2.lineTo(x2, y2);
    else if (LK.branch === 'bolt'){
      // a lightning tree: each branch has two kinks that jump to new places a few times a second
      var jt = Math.floor(A.t * (5 + A.drive * 9)), px = -Math.sin(a), py = Math.cos(a);
      var j1 = (hashRnd(seed * 3.7 + jt) - 0.5) * L * 0.34, j2 = (hashRnd(seed * 9.1 + jt) - 0.5) * L * 0.34;
      P2.lineTo(x + (x2 - x) * 0.33 + px * j1, y + (y2 - y) * 0.33 + py * j1);
      P2.lineTo(x + (x2 - x) * 0.66 + px * j2, y + (y2 - y) * 0.66 + py * j2);
      P2.lineTo(x2, y2);
    }
    else P2.quadraticCurveTo(cx, cy, x2, y2);

    var childReveal = depthF - (depth + 1);
    if (childReveal <= 0.6 || depth >= maxDepth){
      // Cap generously: the old 320 limit was reached partway through a
      // depth-first walk, so a fully grown tree registered tips on one side
      // only and the rest of the canopy could never hold leaves.
      if (natTips.length < 700){
        var tip = { id: id, x: x2, y: y2, a: a };
        natTips.push(tip);
        tipsById[id] = tip;
      }
      if (childReveal <= 0.02 || depth >= maxDepth) return;
    }

    var n = hashRnd(seed * 3.1) < 0.14 ? 3 : 2;
    for (var i = 0; i < n; i++){
      var r1 = hashRnd(seed * 7.3 + i * 13.7), r2 = hashRnd(seed * 11.9 + i * 5.1);
      var side = n === 2 ? (i === 0 ? -1 : 1) : (i - 1);
      var childAng = a + side * (0.4 + r1 * 0.5) * cfg.angle + (r2 - 0.5) * 0.26;
      branch(x2, y2, childAng, len * (0.66 + r2 * 0.15) * cfg.ratio, wid * 0.68, depth + 1,
             seed * 1.618 + i * 2.71 + 0.31, id * 4 + i + 1, depthF, bands, maxDepth);
    }
  }
  var curLook = OWN, trunkRGB = [90, 60, 40], leafRGB = [95, 163, 46], bloomRGB = [232, 85, 127];
  // No save / translate / rotate / restore: 300 leaves and petals with a transform each cost 4.7 ms a frame
  // under New Year; the turn is worked out here instead, and ellipse() takes the angle itself.
  function drawLeafShape(l, k, alpha){
    var LK = curLook;
    var s = l.size, x = l.x, y = l.y, an = l.ang, ca = Math.cos(an), sa = Math.sin(an);
    if (LK.glow){
      // light given off by the leaf: a wide faint disc under it
      var gc = l.bloom ? bloomRGB : leafRGB;
      ctx.fillStyle = LK.rainbow ? 'hsla(' + (l.hue || 0) + ',90%,65%,' + (alpha * 0.16).toFixed(3) + ')' : U.rgba(gc, (alpha * 0.16).toFixed(3));
      ctx.beginPath();
      ctx.arc(x + ca * s * 0.5, y + sa * s * 0.5, s * 2.1, 0, 6.283);
      ctx.fill();
    }
    if (l.bloom){
      var bc = bloomRGB;
      ctx.fillStyle = U.rgba(bc, alpha.toFixed(3));
      // five petals in one path: a cherry tree is 200 blossoms, so one fill each, not five
      ctx.beginPath();
      for (var p = 0; p < 5; p++){
        var pa = p * 1.2566 + an, cp = Math.cos(pa), sp = Math.sin(pa);
        ctx.moveTo(x + cp * s * 0.96, y + sp * s * 0.96);
        ctx.ellipse(x + cp * s * 0.5, y + sp * s * 0.5, s * 0.46, s * 0.3, pa, 0, 6.283);
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(255,222,130,' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, s * 0.2, 0, 6.283);
      ctx.fill();
    } else {
      var lc = leafRGB;
      var wilt = LK.glow ? 0 : (l.life > 0 ? U.clamp01(l.age / l.life) : 0);
      var r = Math.round(U.lerp(lc[0], 150, wilt * 0.8)),
          g = Math.round(U.lerp(lc[1], 96, wilt * 0.8)),
          b = Math.round(U.lerp(lc[2], 40, wilt * 0.8));
      ctx.fillStyle = LK.rainbow ? 'hsla(' + (l.hue || 0) + ',85%,58%,' + alpha.toFixed(3) + ')'
                                 : 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
      if (LK.leafShape === 'square'){
        // the corners of a square that starts 0.1 s in front of the stem, turned by the leaf's angle
        var x0 = s * 0.1, x1 = s * 1.1, y0 = -s * 0.5, y1 = s * 0.5;
        ctx.beginPath();
        ctx.moveTo(x + x0 * ca - y0 * sa, y + x0 * sa + y0 * ca);
        ctx.lineTo(x + x1 * ca - y0 * sa, y + x1 * sa + y0 * ca);
        ctx.lineTo(x + x1 * ca - y1 * sa, y + x1 * sa + y1 * ca);
        ctx.lineTo(x + x0 * ca - y1 * sa, y + x0 * sa + y1 * ca);
        ctx.closePath();
        ctx.fill();
      } else if (LK.leafShape === 'spark'){
        // a four-pointed spark
        ctx.beginPath();
        for (var q = 0; q < 8; q++){
          var px = SPARK[q * 2] * s, py = SPARK[q * 2 + 1] * s;
          if (q === 0) ctx.moveTo(x + px * ca - py * sa, y + px * sa + py * ca);
          else ctx.lineTo(x + px * ca - py * sa, y + px * sa + py * ca);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(x + ca * s * 0.7, y + sa * s * 0.7, s, s * 0.42, an, 0, 6.283);
        ctx.fill();
      }
    }
  }
  var SPARK = [1.5, 0, 0.72, 0.2, 0.5, 1, 0.28, 0.2, -0.5, 0, 0.28, -0.2, 0.5, -1, 0.72, -0.2];
  function drawFlower(fl, k, groundY){
    var alpha = fl.alpha;
    if (alpha <= 0.02) return;
    var s = fl.size * fl.scale;
    var stemH = s * 3.2;
    ctx.strokeStyle = 'rgba(94,132,60,' + (alpha * 0.8).toFixed(3) + ')';
    ctx.lineWidth = Math.max(0.7 * k, s * 0.16);
    ctx.beginPath();
    ctx.moveTo(fl.x, groundY);
    ctx.quadraticCurveTo(fl.x + fl.bend * s, groundY - stemH * 0.6, fl.x + fl.bend * s * 1.4, groundY - stemH);
    ctx.stroke();
    var hx = fl.x + fl.bend * s * 1.4, hy = groundY - stemH;
    ctx.fillStyle = 'hsla(' + fl.hue + ',72%,' + (60 + fl.scale * 8) + '%,' + alpha.toFixed(3) + ')';
    if (fl.type === 0){
      for (var p = 0; p < fl.petals; p++){
        var pa = (p / fl.petals) * 6.283 + fl.rot;
        ctx.beginPath();
        ctx.ellipse(hx + Math.cos(pa) * s * 0.55, hy + Math.sin(pa) * s * 0.55, s * 0.5, s * 0.3, pa, 0, 6.283);
        ctx.fill();
      }
    } else if (fl.type === 1){
      ctx.beginPath();
      for (var q = 0; q < fl.petals; q++){
        var qa = (q / fl.petals) * 6.283 + fl.rot;
        ctx.moveTo(hx, hy);
        ctx.quadraticCurveTo(hx + Math.cos(qa - 0.3) * s, hy + Math.sin(qa - 0.3) * s,
                             hx + Math.cos(qa) * s * 1.15, hy + Math.sin(qa) * s * 1.15);
        ctx.quadraticCurveTo(hx + Math.cos(qa + 0.3) * s, hy + Math.sin(qa + 0.3) * s, hx, hy);
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(hx, hy, s * 0.55, s * 0.9, fl.rot, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,226,140,' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(hx, hy, s * 0.22, 0, 6.283);
    ctx.fill();
  }
  function drawNature(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.nature;
    Can.backdrop(1);
    var LK = curLook = look();
    if (LK.trunk) trunkRGB = U.hexRGB(LK.trunk);
    leafRGB = U.hexRGB(LK.leaf);
    bloomRGB = U.hexRGB(LK.bloom);
    var bloomChance = LK.bloomChance === undefined ? cfg.bloomChance : LK.bloomChance;
    var night = drawSky(w, h, k, dt);

    // Wind follows the balance of treble against the middle (like Rain's
    // wind): bright, airy music blows one way, dark music the other, with a
    // slow drift underneath so it is never perfectly still.
    var gustNow = Math.sin(A.t * 0.23) * 0.35 + A.trebleTilt * 2.4;
    natWind = U.env(natWind, gustNow * (0.08 + A.drive * 1.5) * cfg.wind, 2.2, 2.2, dt);

    // in a quiet passage the tree grows and dies back at a quarter of the pace (full pace from a drive of 0.45 up), so a calm
    // picture holds still and the tree still changes over a whole song
    var pace = 0.25 + 0.75 * Math.min(1, A.drive * 2.2);
    natVit = U.env(natVit, U.clamp01(A.level * 0.8 + A.intensity * 0.35), 2.2 * cfg.growth * pace, 0.5 * cfg.decay * pace, dt);
    natGrowth = U.env(natGrowth, 0.12 + natVit * 1.15, 0.55 * cfg.growth * pace, 0.3 * cfg.decay * pace, dt);
    natGrowth = Math.max(0.06, Math.min(1, natGrowth));

    // how lively the passage is: 0 below a drive of 0.15, 1 from 0.5 up. The tree sways and the leaves flutter by it, so a loud
    // passage moves a lot and a quiet one only grows and sheds.
    swing = U.clamp01((A.drive - 0.15) / 0.35);
    var maxDepth = Math.round(cfg.depth);
    if (w < 900) maxDepth = Math.min(maxDepth, 7);
    var depthF = 1.2 + natGrowth * (maxDepth - 0.7);
    var bands = [A.sub, A.bass, A.lowMid, A.mid, A.high, A.air, A.air, A.air, A.air];
    var groundY = h - 10 * k;

    natTips.length = 0;
    tipsById = {};
    branchBudget = 1600;
    branchPaths = [];
    ctx.lineCap = 'round';
    branch(w / 2, groundY, -Math.PI / 2, h * 0.235 * (0.72 + natGrowth * 0.5),
           (9 + natGrowth * 13) * k, 0, 1.7, 1, depthF, bands, maxDepth);
    drawBranches();

    /* --- leaves: attached until their lifespan runs out, then they fall --- */
    // a snare shakes a few leaves loose (more of them in a loud passage)
    var shed = cfg.snareLeaves && A.snareHit > 0.4 && natLeaves.length > 6 ? 1 + Math.round(A.snareHit * 3 * (0.3 + A.drive)) : 0;
    // and in a lively passage a few leaves let go on their own, about nine a second (they grow back quickly)
    if (swing > 0.01 && natLeaves.length > 6){
      var letGo = swing * 9 * dt;
      shed += Math.floor(letGo) + (Math.random() < letGo % 1 ? 1 : 0);
    }
    for (var sh = 0; sh < shed; sh++){
      var pick = natLeaves[Math.floor(Math.random() * natLeaves.length)];
      pick.age = pick.life + 1;
    }
    var occupied = {};
    for (var li = natLeaves.length - 1; li >= 0; li--){
      var l = natLeaves[li];
      var tip = tipsById[l.id];
      l.age += dt * pace;   // leaves live longer and are replaced more slowly in a quiet passage
      if (!tip || l.age > l.life){
        if (natFalling.length > 110) natFalling.shift();
        natFalling.push({
          x: l.x, y: l.y, ang: l.ang, size: l.size, bloom: l.bloom, hue: l.hue, age: 0, life: 1,
          vx: (Math.random() - 0.5) * 26 * k, vy: (10 + Math.random() * 20) * k,
          vr: (Math.random() - 0.5) * 2.4, fade: 1
        });
        natLeaves.splice(li, 1);
        continue;
      }
      occupied[l.id] = 1;
      l.x = tip.x;
      l.y = tip.y;
      l.ang = tip.a + (swing > 0.01 ? Math.sin(A.t * 4.2 + l.id * 1.9) * 0.9 * swing : 0);   // leaves flutter in a lively passage
      var sz0 = l.size;
      l.size = sz0 * (1 + 0.8 * A.kick * swing);   // every kick makes the leaves swell for a moment
      drawLeafShape(l, k, 0.9 * U.clamp01(l.age / 0.4) * (0.25 + 0.75 * (1 - U.clamp01((l.age - (l.life - 1)) / 1))));
      l.size = sz0;
    }
    if (natLeaves.length < cfg.leafMax){
      var want = cfg.leafRate * (0.4 + natVit * 3) * 24 * dt * pace;
      for (var sp = 0; sp < natTips.length && natLeaves.length < cfg.leafMax; sp++){
        if (Math.random() > want / Math.max(1, natTips.length)) continue;
        var t2 = natTips[sp];
        if (occupied[t2.id]) continue;
        occupied[t2.id] = 1;
        leafSeq++;
        natLeaves.push({
          id: t2.id, x: t2.x, y: t2.y, ang: t2.a, age: 0,
          life: cfg.leafLife * (0.6 + Math.random() * 0.8),
          size: (4 + Math.random() * 6) * k * cfg.leafSize, hue: (t2.id * 47) % 360,
          bloom: Math.random() < (bloomChance >= 1 ? 1 : bloomChance * U.clamp01(natVit * 1.6))
        });
      }
    }
    // the theme's own slow fall (cherry petals, snow): more of it when the music is big
    if (LK.shed && natTips.length && natFalling.length < 110){
      var nShed = LK.shed * (0.4 + A.drive * 1.6) * dt;
      nShed = Math.floor(nShed) + (Math.random() < nShed % 1 ? 1 : 0);
      for (var sd = 0; sd < nShed; sd++){
        var st2 = natTips[Math.floor(Math.random() * natTips.length)];
        natFalling.push({ x: st2.x, y: st2.y, ang: Math.random() * 6.283, size: (2.5 + Math.random() * 3.5) * k * cfg.leafSize,
                          bloom: bloomChance >= 1, hue: (st2.id * 47) % 360, age: 0, life: 1,
                          vx: (Math.random() - 0.5) * 30 * k, vy: (8 + Math.random() * 16) * k, vr: (Math.random() - 0.5) * 3, fade: 1 });
      }
    }
    for (var fi = natFalling.length - 1; fi >= 0; fi--){
      var fl2 = natFalling[fi];
      fl2.x += (fl2.vx + Math.sin(A.t * 1.7 + fl2.y * 0.01) * 24 * k + (fl2.y < groundY ? natWind * 70 * k : 0)) * dt;
      fl2.y += fl2.vy * dt;
      fl2.vy = Math.min(fl2.vy + 16 * k * dt, 95 * k);
      fl2.ang += fl2.vr * dt;
      if (fl2.y > groundY){ fl2.y = groundY; fl2.vy = 0; fl2.vx *= 0.2; fl2.fade -= dt * 0.9; }
      if (fl2.fade <= 0 || fl2.y > h + 20 * k){ natFalling.splice(fi, 1); continue; }
      drawLeafShape(fl2, k, U.clamp01(fl2.fade) * 0.75);
    }

    /* --- ground flowers: grow, bloom, wither, vanish --- */
    if (cfg.flowers){
      if (natFlowers.length < cfg.flowerMax && Math.random() < (0.2 + natVit * 2.5) * dt * 3){
        natFlowers.push({
          x: w * (0.04 + Math.random() * 0.92),
          size: (3 + Math.random() * 4) * k,
          hue: flowerHue(),
          type: Math.floor(Math.random() * 3),
          petals: 5 + Math.floor(Math.random() * 3),
          rot: Math.random() * 6.283,
          bend: (Math.random() - 0.5) * 0.8,
          age: 0, life: cfg.flowerLife * (0.6 + Math.random() * 0.8),
          scale: 0, alpha: 0
        });
      }
      for (var gi = natFlowers.length - 1; gi >= 0; gi--){
        var g2 = natFlowers[gi];
        g2.age += dt * (0.5 + natVit * 1.2);
        if (g2.age > g2.life){ natFlowers.splice(gi, 1); continue; }
        var up = U.clamp01(g2.age / (g2.life * 0.25));
        var down = U.clamp01((g2.life - g2.age) / (g2.life * 0.3));
        g2.scale = up * (0.55 + natVit * 0.7);
        g2.alpha = U.clamp01(up * down);
        drawFlower(g2, k, groundY + 2 * k);
      }
    }
    drawFireflies(w, h, k, dt, night);
  }

  function paintBG(c, w, h, k){
    var L = look(), hill = U.hexRGB(L.hill || '#8CAA8C');
    if (!L.dark){
      var sun = c.createRadialGradient(w * 0.78, h * 0.18, 0, w * 0.78, h * 0.18, w * 0.32);
      sun.addColorStop(0, 'rgba(255,238,190,0.55)');
      sun.addColorStop(1, 'rgba(255,238,190,0)');
      c.fillStyle = sun;
      c.fillRect(0, 0, w, h);
    }
    c.fillStyle = U.rgba(hill, L.dark ? 0.3 : 0.16);   // far hills
    c.beginPath();
    c.moveTo(0, h * 0.82);
    c.quadraticCurveTo(w * 0.25, h * 0.66, w * 0.5, h * 0.8);
    c.quadraticCurveTo(w * 0.78, h * 0.92, w, h * 0.74);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    c.fillStyle = U.rgba(hill, L.dark ? 0.5 : 0.24);    // near ground
    c.beginPath();
    c.moveTo(0, h - 14 * k);
    c.quadraticCurveTo(w * 0.5, h - 26 * k, w, h - 14 * k);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
  }

  // Touch: shakes leaves and blossoms loose, and plants a flower where you touched
  function onTap(x, y){
    var k = Can.dpr(), cfg = Cfg.CFG.nature;
    App.taps.spawnRing(x, y, look().leaf);
    for (var lf = 0; lf < 9; lf++){
      natFalling.push({
        x: x + (Math.random() - 0.5) * 46 * k, y: y + (Math.random() - 0.5) * 30 * k,
        ang: Math.random() * 6.283, size: (3.5 + Math.random() * 5) * k * cfg.leafSize,
        bloom: Math.random() < Math.max(0.4, look().bloomChance || 0), hue: Math.random() * 360, age: 0, life: 1,
        vx: (Math.random() - 0.5) * 40 * k, vy: (8 + Math.random() * 24) * k,
        vr: (Math.random() - 0.5) * 2.6, fade: 1
      });
    }
    if (cfg.flowers){
      natFlowers.push({
        x: x, size: (4 + Math.random() * 4) * k,
        hue: flowerHue(),
        type: Math.floor(Math.random() * 3), petals: 5 + Math.floor(Math.random() * 3),
        rot: Math.random() * 6.283, bend: (Math.random() - 0.5) * 0.8,
        age: 0, life: cfg.flowerLife * (0.8 + Math.random() * 0.6), scale: 0, alpha: 0
      });
    }
  }

  Can.addResizeHook(function(){ natFlowers = []; });

  App.modes.register('nature', { draw: drawNature, paintBG: paintBG, bgColors: bgColors, onTap: onTap, fx: 0.35,
                                 reset: function(){ fireflies = []; } });

  App.cfg.registerDefaults('nature', {
    followTheme: true, growth: 1, decay: 1, depth: 8, angle: 1, ratio: 1, sway: 0, wind: 0.6,
    dayNight: true, fireflies: true, snareLeaves: true,
    leafLife: 9, leafSize: 1, leafColor: '#5FA32E', leafMax: 200, leafRate: 1,
    bloomChance: 0.3, bloomColor: '#E8557F',
    flowers: true, flowerLife: 13, flowerMax: 22,
    bg1: '#E7F0F7', bg2: '#F9F0E1'
  });
  App.cfg.registerSchema({ id: 'nature', label: 'Nature', fields: [
    ['followTheme', 'Follow theme (the tree, its colours and the sky)', 'bool'],
    ['growth', 'Growth speed', 'range', 0.2, 3, 0.05],
    ['decay', 'Die-back speed', 'range', 0.2, 3, 0.05],
    ['depth', 'Max branch levels', 'range', 3, 9, 1],
    ['angle', 'Branch spread', 'range', 0.4, 2, 0.05],
    ['ratio', 'Branch length ratio', 'range', 0.6, 1.3, 0.02],
    ['sway', 'Sway with music', 'range', 0, 2, 0.05],
    ['wind', 'Wind (follows treble)', 'range', 0, 2, 0.05],
    ['dayNight', 'Night when calm, day when loud', 'bool'],
    ['fireflies', 'Fireflies at night (hi-hat)', 'bool'],
    ['snareLeaves', 'Snare shakes leaves loose', 'bool'],
    ['leafLife', 'Leaf lifespan (seconds)', 'range', 1, 40, 0.5],
    ['leafRate', 'Leaf growth rate', 'range', 0.2, 3, 0.05],
    ['leafMax', 'Max leaves', 'range', 20, 400, 10],
    ['leafSize', 'Leaf size', 'range', 0.3, 2.5, 0.05],
    ['bloomChance', 'Blossom chance', 'range', 0, 1, 0.02],
    ['flowers', 'Ground flowers', 'bool'],
    ['flowerMax', 'Flower count', 'range', 0, 60, 1],
    ['flowerLife', 'Flower lifespan (seconds)', 'range', 2, 40, 0.5],
    ['leafColor', 'Leaf colour', 'color'],
    ['bloomColor', 'Blossom colour', 'color'],
    ['bg1', 'Sky', 'color'],
    ['bg2', 'Ground', 'color']
  ]});
  // Bug fix: this used to check group === 'tree', a leftover from before the
  // Tree -> Nature rename, so it silently never fired.
  App.cfg.onGroupChange('nature', function(key){
    if (key === 'depth' || key === 'ratio' || key === 'angle' || key === null) natLeaves = [];
    if (key === 'followTheme' || key === null) App.canvas.invalidateBG();
  });
})();
