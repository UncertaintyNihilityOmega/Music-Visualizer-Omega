/* ---------- Ice: every crack has its own lifespan ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var iceImpacts = [], iceFlash = 0, iceMotes = [], iceAcc = 0;
  var frost = 0, midReach = 1, glints = [], ferns = null, fernKey = '';

  function addGlint(x, y, power){
    if (glints.length > 60) return;
    glints.push({ x: x, y: y, age: 0, life: 0.28 + Math.random() * 0.3, power: power, rot: Math.random() * 0.8 });
  }
  // a glint is a small four-pointed star that flares and goes
  function drawGlints(k, dt){
    if (!glints.length) return;
    ctx.lineCap = 'round';
    for (var i = glints.length - 1; i >= 0; i--){
      var g = glints[i];
      g.age += dt;
      if (g.age > g.life){ glints.splice(i, 1); continue; }
      var f = Math.sin(g.age / g.life * Math.PI), r = (4 + g.power * 11) * k * f;
      ctx.strokeStyle = 'rgba(240,252,255,' + (0.85 * f).toFixed(3) + ')';
      ctx.lineWidth = (0.8 + g.power) * k * f;
      ctx.beginPath();
      ctx.moveTo(g.x - Math.cos(g.rot) * r, g.y - Math.sin(g.rot) * r);
      ctx.lineTo(g.x + Math.cos(g.rot) * r, g.y + Math.sin(g.rot) * r);
      ctx.moveTo(g.x + Math.sin(g.rot) * r * 0.6, g.y - Math.cos(g.rot) * r * 0.6);
      ctx.lineTo(g.x - Math.sin(g.rot) * r * 0.6, g.y + Math.cos(g.rot) * r * 0.6);
      ctx.stroke();
    }
  }
  // Frost: a pale haze growing in from all four edges, with fern-like ice
  // crystals reaching toward the middle. amount 0..1.
  function drawFrost(w, h, k, amount){
    var depth = Math.min(w, h) * 0.34 * amount, a = (0.16 + amount * 0.3).toFixed(3);
    var edges = [[0, 0, 0, depth, 0, 0, w, depth], [0, h, 0, h - depth, 0, h - depth, w, depth],
                 [0, 0, depth, 0, 0, 0, depth, h], [w, 0, w - depth, 0, w - depth, 0, depth, h]];
    for (var e = 0; e < 4; e++){
      var q = edges[e], g = ctx.createLinearGradient(q[0], q[1], q[2], q[3]);
      g.addColorStop(0, 'rgba(225,244,255,' + a + ')');
      g.addColorStop(1, 'rgba(225,244,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(q[4], q[5], q[6], q[7]);
    }
    var key = w + 'x' + h;
    if (!ferns || fernKey !== key){
      ferns = [];
      for (var i = 0; i < 64; i++){
        var side = i % 4, u = ((i * 0.618034) % 1), jit = ((i * 7.13) % 1 - 0.5) * 0.9;
        var x = side === 2 ? 0 : (side === 3 ? w : u * w), y = side === 0 ? 0 : (side === 1 ? h : u * h);
        var ang = (side === 0 ? Math.PI / 2 : (side === 1 ? -Math.PI / 2 : (side === 2 ? 0 : Math.PI))) + jit;
        ferns.push({ x: x, y: y, a: ang, len: Math.min(w, h) * (0.12 + ((i * 3.77) % 1) * 0.2) });
      }
      fernKey = key;
    }
    ctx.strokeStyle = 'rgba(235,250,255,' + (0.25 + amount * 0.4).toFixed(3) + ')';
    ctx.lineWidth = 1 * k;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (var f = 0; f < ferns.length; f++){
      var fe = ferns[f], L = fe.len * amount, cs = Math.cos(fe.a), sn = Math.sin(fe.a);
      ctx.moveTo(fe.x, fe.y);
      ctx.lineTo(fe.x + cs * L, fe.y + sn * L);
      for (var b = 1; b <= 4; b++){
        var bx = fe.x + cs * L * b / 5, by = fe.y + sn * L * b / 5, bl = L * 0.22 * (1 - b / 6);
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(fe.a + 0.9) * bl, by + Math.sin(fe.a + 0.9) * bl);
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(fe.a - 0.9) * bl, by + Math.sin(fe.a - 0.9) * bl);
      }
    }
    ctx.stroke();
  }

  function makeImpact(x, y, power){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), cfg = Cfg.CFG.ice;
    var lines = [];
    var maxLen = Math.min(w, h) * (0.2 + power * 0.55) * (0.75 + Math.random() * 0.7) * cfg.length;
    var spokes = Math.max(3, Math.round((5 + Math.random() * 5) * cfg.spokes));
    var baseAng = Math.random() * 6.283;

    function grow(px, py, ang, budget, startD, width, gen){
      if (lines.length > 70 || budget < 6 * k) return;
      var pts = [px, py], d = 0, cx = px, cy = py, a = ang;
      while (d < budget){
        a += (Math.random() - 0.5) * (0.4 + gen * 0.22);
        var step = (7 + Math.random() * 17) * k;
        if (step > budget - d) step = budget - d;
        cx += Math.cos(a) * step;
        cy += Math.sin(a) * step;
        d += step;
        pts.push(cx, cy);
        if (gen < 2 && budget - d > 26 * k && Math.random() < 0.15){
          grow(cx, cy, a + (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.75),
               (budget - d) * (0.3 + Math.random() * 0.45), startD + d, width * 0.55, gen + 1);
        }
        if (cx < -20 * k || cx > w + 20 * k || cy < -20 * k || cy > h + 20 * k) break;
      }
      lines.push({ p: pts, d0: startD, len: d, w: width });
    }

    for (var i = 0; i < spokes; i++){
      grow(x, y, baseAng + (i / spokes) * 6.283 + (Math.random() - 0.5) * 0.55,
           maxLen * (0.45 + Math.random() * 0.85), 0, (1.1 + power * 1.9) * cfg.width, 0);
    }
    var total = 1;
    for (var j = 0; j < lines.length; j++) total = Math.max(total, lines[j].d0 + lines[j].len);
    return {
      x: x, y: y, lines: lines, total: total, power: power,
      age: 0, life: cfg.life * (0.75 + Math.random() * 0.5), open: cfg.open, prog: 0, flash: 1
    };
  }
  function strokeCrack(ln, avail, k, widthMul){
    if (avail <= 0) return;
    var p = ln.p;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    var acc = 0;
    for (var i = 2; i < p.length; i += 2){
      var dx = p[i] - p[i - 2], dy = p[i + 1] - p[i - 1];
      var seg = Math.sqrt(dx * dx + dy * dy);
      if (acc + seg <= avail){ ctx.lineTo(p[i], p[i + 1]); acc += seg; }
      else {
        var f = (avail - acc) / seg;
        if (f > 0) ctx.lineTo(p[i - 2] + dx * f, p[i - 1] + dy * f);
        break;
      }
    }
    ctx.lineWidth = Math.max(0.4 * k, ln.w * k * widthMul);
    ctx.stroke();
  }
  function drawIce(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.ice;
    Can.backdrop(1);

    if (cfg.motes){
      if (!iceMotes.length){
        for (var m = 0; m < 50; m++){
          iceMotes.push({ x: Math.random() * w, y: Math.random() * h, z: 0.3 + Math.random() * 0.7, ph: Math.random() * 6.283 });
        }
      }
      ctx.fillStyle = 'rgba(220,240,255,0.3)';
      ctx.beginPath();
      for (var mi = 0; mi < iceMotes.length; mi++){
        var mo2 = iceMotes[mi];
        mo2.y += (8 + mo2.z * 22) * k * dt * Cfg.CFG.look.motion;
        mo2.x += Math.sin(A.t * 0.6 + mo2.ph) * 14 * k * dt;
        if (mo2.y > h + 4 * k){ mo2.y = -4 * k; mo2.x = Math.random() * w; }
        ctx.moveTo(mo2.x, mo2.y);
        ctx.arc(mo2.x, mo2.y, mo2.z * 1.5 * k, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    /* --- frost: creeps in from the edges while the music is calm --- */
    var calm = A.drive < 0.3;
    if (cfg.frost){
      frost = U.clamp01(frost + (calm ? 0.07 : -0.25 * A.drive) * dt * cfg.frostSpeed);
      // ...and shatters on the first hard hit once the music is loud again
      if (frost > 0.3 && A.drive > 0.42 && (A.kickHit > 0.3 || A.snareHit > 0.4 || A.beat)){
        var burst = 3 + Math.round(frost * 3);
        for (var sb = 0; sb < burst && iceImpacts.length < cfg.max + 8; sb++){
          var side = sb % 4, e1 = 0.12 + Math.random() * 0.76;
          iceImpacts.push(makeImpact(side === 0 ? w * 0.06 : (side === 1 ? w * 0.94 : w * e1),
                                     side === 2 ? h * 0.08 : (side === 3 ? h * 0.92 : h * e1), 0.8 + Math.random() * 0.2));
        }
        for (var sg = 0; sg < 14; sg++) addGlint(Math.random() * w, Math.random() * h, 1);
        if (cfg.flash) iceFlash = 1;
        App.fx.jolt(0.5 + frost * 0.6);
        frost = 0;
      }
      if (frost > 0.01) drawFrost(w, h, k, frost);
    } else frost = 0;

    /* --- glints: a hi-hat makes the ice sparkle --- */
    if (cfg.glints && A.hatHit > 0.25){
      var gn = 1 + Math.round(A.hatHit * 2 * (0.4 + A.drive));
      for (var gq = 0; gq < gn; gq++) addGlint(Math.random() * w, Math.random() * h, 0.4 + A.hatHit * 0.6);
    }
    drawGlints(k, dt);

    // Cracking: a crack is a sharp sound, so a snare starts one. Behind
    // that, pressure still builds while the track is above crackAt (as blue
    // fire does), so music with no snare at all cracks the ice too.
    var hardIce = A.intensity * 0.72 + A.high * 0.28;
    var pressure = U.clamp01((hardIce - cfg.crackAt) / cfg.crackRange);
    iceAcc += pressure * cfg.rate * dt * 0.35;
    if (A.snareHit > 0.3) iceAcc += A.snareHit * (0.35 + A.drive * 0.9);
    if (iceAcc >= 1 && iceImpacts.length < cfg.max){
      iceAcc -= 1;
      var best = null, bestD = -1;
      for (var tries = 0; tries < 6; tries++){
        var px = w * (0.08 + Math.random() * 0.84), py = h * (0.12 + Math.random() * 0.76), dmin = 1e12;
        for (var q = 0; q < iceImpacts.length; q++){
          var ddx = iceImpacts[q].x - px, ddy = iceImpacts[q].y - py, dd = ddx * ddx + ddy * ddy;
          if (dd < dmin) dmin = dd;
        }
        if (dmin > bestD){ bestD = dmin; best = [px, py]; }
      }
      var pw = U.clamp01(0.2 + Math.max(pressure * 0.5, A.snare * 0.5) + A.drive * 0.35);
      iceImpacts.push(makeImpact(best[0], best[1], pw));
      if (cfg.flash) iceFlash = Math.max(iceFlash, 0.15 + pw * 0.4);
    } else if (iceAcc > 1){ iceAcc = 1; }
    // how far the cracks reach follows the middle of the sound (voices, guitars)
    midReach = U.env(midReach, U.clamp01(0.5 + A.mid * 1.1), 8, 2.5, dt);
    if (cfg.shatter && A.beat && A.beatStrength > 0.62 && A.drive > 0.7 && Math.random() < 0.3){
      for (var b = 0; b < 3 && iceImpacts.length < cfg.max + 6; b++){
        iceImpacts.push(makeImpact(w * (0.15 + Math.random() * 0.7), h * (0.15 + Math.random() * 0.7), 0.85 + Math.random() * 0.15));
      }
      if (cfg.flash) iceFlash = 1;
    }

    var core = U.hexRGB(cfg.color), glow = U.hexRGB(cfg.glowColor);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var ii = iceImpacts.length - 1; ii >= 0; ii--){
      var im = iceImpacts[ii];
      im.age += dt;
      if (im.age >= im.life){ iceImpacts.splice(ii, 1); continue; }
      // snap open, then shrink steadily back to nothing over its own lifetime
      if (im.age < im.open){
        im.prog = Math.pow(im.age / im.open, 0.55);
      } else {
        im.prog = 1 - Math.pow((im.age - im.open) / Math.max(0.05, im.life - im.open), 1.4);
      }
      im.prog = U.clamp01(im.prog);
      im.flash = Math.max(0, im.flash - dt * 3.2);

      var fade = U.clamp01(im.prog * 1.6);
      var reveal = im.prog * im.total * midReach;
      var lns = im.lines;

      ctx.strokeStyle = U.rgba(glow, (0.08 + fade * 0.2).toFixed(3));
      for (var l1 = 0; l1 < lns.length; l1++) strokeCrack(lns[l1], Math.min(reveal - lns[l1].d0, lns[l1].len), k, 3.2);
      ctx.strokeStyle = U.rgba(core, (0.25 + fade * 0.6).toFixed(3));
      for (var l2 = 0; l2 < lns.length; l2++) strokeCrack(lns[l2], Math.min(reveal - lns[l2].d0, lns[l2].len), k, 1);

      var cr = (6 + im.power * 24) * k * im.prog;
      if (cr > 0.5){
        var cg = ctx.createRadialGradient(im.x, im.y, 0, im.x, im.y, cr);
        cg.addColorStop(0, U.rgba(core, (0.45 * fade).toFixed(3)));
        cg.addColorStop(1, U.rgba(glow, 0));
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(im.x, im.y, cr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cfg.flash && im.flash > 0){
        ctx.strokeStyle = U.rgba(core, (im.flash * 0.5).toFixed(3));
        ctx.lineWidth = 1.6 * k * im.flash;
        ctx.beginPath();
        ctx.arc(im.x, im.y, (1 - im.flash) * (40 + im.power * 90) * k, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (iceFlash > 0){
      iceFlash = Math.max(0, iceFlash - dt * 2.6);
      ctx.fillStyle = U.rgba(glow, (iceFlash * 0.14).toFixed(3));
      ctx.fillRect(0, 0, w, h);
    }
  }

  function paintBG(c, w, h){
    for (var j = 0; j < 26; j++){
      c.fillStyle = 'rgba(255,255,255,' + (0.012 + (j % 5) * 0.006).toFixed(3) + ')';
      c.beginPath();
      c.arc((j * 313) % w, (j * 197) % h, 10 + (j % 6) * 9, 0, Math.PI * 2);
      c.fill();
    }
    for (var fr = 0; fr < 90; fr++){
      var x = (fr * 173) % w, y = (fr * 251) % h, a = (fr * 1.37) % 6.283, len = 14 + (fr % 7) * 9;
      c.strokeStyle = 'rgba(190,228,255,' + (0.03 + (fr % 5) * 0.01).toFixed(3) + ')';
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(x, y);
      for (var s = 0; s < 5; s++){
        x += Math.cos(a) * len / 5;
        y += Math.sin(a) * len / 5;
        a += ((fr * s * 7) % 10 - 5) * 0.05;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  function onTap(x, y){
    App.taps.spawnRing(x, y, '#CFF2FF');
    var cfg = Cfg.CFG.ice;
    if (iceImpacts.length < cfg.max + 6){
      iceImpacts.push(makeImpact(x, y, 0.55 + Math.random() * 0.45));
      if (cfg.flash) iceFlash = Math.max(iceFlash, 0.6);
    }
  }

  function reset(){ iceAcc = 0; iceImpacts = []; iceFlash = 0; frost = 0; glints = []; midReach = 1; }
  Can.addResizeHook(function(){ iceMotes = []; });

  App.modes.register('ice', { draw: drawIce, paintBG: paintBG, onTap: onTap, reset: reset, fx: 0.8 });

  App.cfg.registerDefaults('ice', {
    crackAt: 0.3, crackRange: 0.35, rate: 4,
    life: 2.6, open: 0.13, max: 9, spokes: 1, length: 1, width: 1,
    color: '#EEFBFF', glowColor: '#74CBFF', flash: true, motes: true,
    shatter: true, frost: true, frostSpeed: 1, glints: true, bg1: '#0C2038', bg2: '#040A16'
  });
  App.cfg.registerSchema({ id: 'ice', label: 'Ice', fields: [
    ['crackAt', 'Cracking starts at', 'range', 0.05, 1, 0.01],
    ['crackRange', 'Cracking ramp width', 'range', 0.05, 0.6, 0.01],
    ['rate', 'Cracks per second at full', 'range', 0.5, 12, 0.5],
    ['life', 'Crack lifespan (seconds)', 'range', 0.4, 8, 0.1],
    ['open', 'Time to crack open', 'range', 0.04, 1, 0.01],
    ['max', 'Max cracks at once', 'range', 1, 20, 1],
    ['spokes', 'Spokes per hit', 'range', 0.4, 2, 0.05],
    ['length', 'Crack length', 'range', 0.3, 2.5, 0.05],
    ['width', 'Crack thickness', 'range', 0.3, 3, 0.05],
    ['flash', 'Impact flash', 'bool'],
    ['motes', 'Frost drift', 'bool'],
    ['shatter', 'Big shatter on drops', 'bool'],
    ['frost', 'Frost creeps in when calm, shatters when loud', 'bool'],
    ['frostSpeed', 'Frost speed', 'range', 0.3, 3, 0.05],
    ['glints', 'Hi-hat glints', 'bool'],
    ['color', 'Crack colour', 'color'],
    ['glowColor', 'Crack glow', 'color'],
    ['bg1', 'Ice top', 'color'],
    ['bg2', 'Ice bottom', 'color']
  ]});
})();
