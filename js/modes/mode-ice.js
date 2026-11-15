/* ---------- Ice: every crack has its own lifespan ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var iceImpacts = [], iceFlash = 0, iceMotes = [], iceAcc = 0;

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

    // Cracking is driven by a threshold curve exactly like blue fire:
    // pressure builds while the track is above crackAt, and cracks appear at
    // a steady rate instead of waiting for a beat that may never be detected.
    var hardIce = A.intensity * 0.72 + A.high * 0.28;
    var pressure = U.clamp01((hardIce - cfg.crackAt) / cfg.crackRange);
    iceAcc += pressure * cfg.rate * dt;
    if (A.beat) iceAcc += pressure * A.beatStrength * 0.8;
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
      iceImpacts.push(makeImpact(best[0], best[1], U.clamp01(0.25 + pressure * 0.75)));
      if (cfg.flash) iceFlash = Math.max(iceFlash, 0.2 + pressure * 0.45);
    } else if (iceAcc > 1){ iceAcc = 1; }
    if (cfg.shatter && A.beat && A.beatStrength > 0.62 && A.intensity > 0.72 && Math.random() < 0.3){
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
      var reveal = im.prog * im.total;
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

  function reset(){ iceAcc = 0; iceImpacts = []; iceFlash = 0; }
  Can.addResizeHook(function(){ iceMotes = []; });

  App.modes.register('ice', { draw: drawIce, paintBG: paintBG, onTap: onTap, reset: reset });

  App.cfg.registerDefaults('ice', {
    crackAt: 0.3, crackRange: 0.35, rate: 4,
    life: 2.6, open: 0.13, max: 9, spokes: 1, length: 1, width: 1,
    color: '#EEFBFF', glowColor: '#74CBFF', flash: true, motes: true,
    shatter: true, bg1: '#0C2038', bg2: '#040A16'
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
    ['color', 'Crack colour', 'color'],
    ['glowColor', 'Crack glow', 'color'],
    ['bg1', 'Ice top', 'color'],
    ['bg2', 'Ice bottom', 'color']
  ]});
})();
