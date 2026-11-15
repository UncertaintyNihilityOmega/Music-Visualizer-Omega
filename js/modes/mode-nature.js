/* ---------- Nature (was "Tree"): stands still, grows, sheds ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var natGrowth = 0.14, natVit = 0, natLeaves = [], natFalling = [], natFlowers = [];
  var natTips = [], tipsById = {}, branchBudget = 0, leafSeq = 0;

  function hashRnd(seed){
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
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
    var x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
    var cx = x + Math.cos(a - 0.13) * L * 0.55, cy = y + Math.sin(a - 0.13) * L * 0.55;

    ctx.strokeStyle = 'hsla(' + (26 + natVit * 12) + ',' + (24 + natVit * 18) + '%,' +
                      (20 + natVit * 10 + depth * 1.5) + '%,' + (0.35 + reveal * 0.6) + ')';
    ctx.lineWidth = Math.max(0.6 * Can.dpr(), wid * (0.3 + reveal * 0.7));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();

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
  function drawLeafShape(l, k, alpha){
    var cfg = Cfg.CFG.nature;
    var s = l.size;
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.ang);
    if (l.bloom){
      var bc = U.hexRGB(cfg.bloomColor);
      ctx.fillStyle = U.rgba(bc, alpha.toFixed(3));
      for (var p = 0; p < 5; p++){
        var pa = p * 1.2566;
        ctx.beginPath();
        ctx.ellipse(Math.cos(pa) * s * 0.5, Math.sin(pa) * s * 0.5, s * 0.46, s * 0.3, pa, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,222,130,' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, 6.283);
      ctx.fill();
    } else {
      var lc = U.hexRGB(cfg.leafColor);
      var wilt = l.life > 0 ? U.clamp01(l.age / l.life) : 0;
      var r = Math.round(U.lerp(lc[0], 150, wilt * 0.8)),
          g = Math.round(U.lerp(lc[1], 96, wilt * 0.8)),
          b = Math.round(U.lerp(lc[2], 40, wilt * 0.8));
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(s * 0.7, 0, s, s * 0.42, 0, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }
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

    natVit = U.env(natVit, U.clamp01(A.level * 0.8 + A.intensity * 0.35), 2.2 * cfg.growth, 0.5 * cfg.decay, dt);
    natGrowth = U.env(natGrowth, 0.12 + natVit * 1.15, 0.55 * cfg.growth, 0.3 * cfg.decay, dt);
    natGrowth = Math.max(0.06, Math.min(1, natGrowth));

    var maxDepth = Math.round(cfg.depth);
    if (w < 900) maxDepth = Math.min(maxDepth, 7);
    var depthF = 1.2 + natGrowth * (maxDepth - 0.7);
    var bands = [A.sub, A.bass, A.lowMid, A.mid, A.high, A.air, A.air, A.air, A.air];
    var groundY = h - 10 * k;

    natTips.length = 0;
    tipsById = {};
    branchBudget = 1600;
    ctx.lineCap = 'round';
    branch(w / 2, groundY, -Math.PI / 2, h * 0.235 * (0.72 + natGrowth * 0.5),
           (9 + natGrowth * 13) * k, 0, 1.7, 1, depthF, bands, maxDepth);

    /* --- leaves: attached until their lifespan runs out, then they fall --- */
    var occupied = {};
    for (var li = natLeaves.length - 1; li >= 0; li--){
      var l = natLeaves[li];
      var tip = tipsById[l.id];
      l.age += dt;
      if (!tip || l.age > l.life){
        if (natFalling.length > 110) natFalling.shift();
        natFalling.push({
          x: l.x, y: l.y, ang: l.ang, size: l.size, bloom: l.bloom, age: 0, life: 1,
          vx: (Math.random() - 0.5) * 26 * k, vy: (10 + Math.random() * 20) * k,
          vr: (Math.random() - 0.5) * 2.4, fade: 1
        });
        natLeaves.splice(li, 1);
        continue;
      }
      occupied[l.id] = 1;
      l.x = tip.x;
      l.y = tip.y;
      l.ang = tip.a;
      drawLeafShape(l, k, 0.9 * U.clamp01(l.age / 0.4) * (0.25 + 0.75 * (1 - U.clamp01((l.age - (l.life - 1)) / 1))));
    }
    if (natLeaves.length < cfg.leafMax){
      var want = cfg.leafRate * (0.4 + natVit * 3) * 24 * dt;
      for (var sp = 0; sp < natTips.length && natLeaves.length < cfg.leafMax; sp++){
        if (Math.random() > want / Math.max(1, natTips.length)) continue;
        var t2 = natTips[sp];
        if (occupied[t2.id]) continue;
        occupied[t2.id] = 1;
        leafSeq++;
        natLeaves.push({
          id: t2.id, x: t2.x, y: t2.y, ang: t2.a, age: 0,
          life: cfg.leafLife * (0.6 + Math.random() * 0.8),
          size: (4 + Math.random() * 6) * k * cfg.leafSize,
          bloom: Math.random() < cfg.bloomChance * U.clamp01(natVit * 1.6)
        });
      }
    }
    for (var fi = natFalling.length - 1; fi >= 0; fi--){
      var fl2 = natFalling[fi];
      fl2.x += (fl2.vx + Math.sin(A.t * 1.7 + fl2.y * 0.01) * 24 * k) * dt;
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
          hue: [340, 48, 268, 12, 190][Math.floor(Math.random() * 5)] + Math.random() * 16,
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
  }

  function paintBG(c, w, h, k){
    var sun = c.createRadialGradient(w * 0.78, h * 0.18, 0, w * 0.78, h * 0.18, w * 0.32);
    sun.addColorStop(0, 'rgba(255,238,190,0.55)');
    sun.addColorStop(1, 'rgba(255,238,190,0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(140,170,140,0.16)';   // far hills
    c.beginPath();
    c.moveTo(0, h * 0.82);
    c.quadraticCurveTo(w * 0.25, h * 0.66, w * 0.5, h * 0.8);
    c.quadraticCurveTo(w * 0.78, h * 0.92, w, h * 0.74);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(120,150,90,0.22)';    // near ground
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
    App.taps.spawnRing(x, y, '#9AD46A');
    for (var lf = 0; lf < 9; lf++){
      natFalling.push({
        x: x + (Math.random() - 0.5) * 46 * k, y: y + (Math.random() - 0.5) * 30 * k,
        ang: Math.random() * 6.283, size: (3.5 + Math.random() * 5) * k * cfg.leafSize,
        bloom: Math.random() < 0.4, age: 0, life: 1,
        vx: (Math.random() - 0.5) * 40 * k, vy: (8 + Math.random() * 24) * k,
        vr: (Math.random() - 0.5) * 2.6, fade: 1
      });
    }
    if (cfg.flowers){
      natFlowers.push({
        x: x, size: (4 + Math.random() * 4) * k,
        hue: [340, 48, 268, 12, 190][Math.floor(Math.random() * 5)] + Math.random() * 16,
        type: Math.floor(Math.random() * 3), petals: 5 + Math.floor(Math.random() * 3),
        rot: Math.random() * 6.283, bend: (Math.random() - 0.5) * 0.8,
        age: 0, life: cfg.flowerLife * (0.8 + Math.random() * 0.6), scale: 0, alpha: 0
      });
    }
  }

  Can.addResizeHook(function(){ natFlowers = []; });

  App.modes.register('nature', { draw: drawNature, paintBG: paintBG, onTap: onTap });

  App.cfg.registerDefaults('nature', {
    growth: 1, decay: 1, depth: 8, angle: 1, ratio: 1, sway: 0,
    leafLife: 9, leafSize: 1, leafColor: '#5FA32E', leafMax: 200, leafRate: 1,
    bloomChance: 0.3, bloomColor: '#E8557F',
    flowers: true, flowerLife: 13, flowerMax: 22,
    bg1: '#E7F0F7', bg2: '#F9F0E1'
  });
  App.cfg.registerSchema({ id: 'nature', label: 'Nature', fields: [
    ['growth', 'Growth speed', 'range', 0.2, 3, 0.05],
    ['decay', 'Die-back speed', 'range', 0.2, 3, 0.05],
    ['depth', 'Max branch levels', 'range', 3, 9, 1],
    ['angle', 'Branch spread', 'range', 0.4, 2, 0.05],
    ['ratio', 'Branch length ratio', 'range', 0.6, 1.3, 0.02],
    ['sway', 'Sway with music', 'range', 0, 2, 0.05],
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
  });
})();
