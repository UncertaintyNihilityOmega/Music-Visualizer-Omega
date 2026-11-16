/* ---------- Fire: sway follows bass by default, blue is rare ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var fireParts = [], fireSparks = [], warmSprite = null, coldSprite = null;
  var spriteKey = '', fireSway = 0, heatShown = 0, flameVals = null, flameState = null;
  var FLAME_LEAN = 0.22;     // how far the tongues and embers lean to the hot colour at full heat

  function makeGlowSprite(rgb){
    var s = document.createElement('canvas');
    s.width = s.height = 64;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    // the centre is a pale tint of the flame colour, not white: hundreds of
    // these are added together, and a white centre turned the fire into a
    // white block in a loud passage
    var pale = [Math.round(U.lerp(rgb[0], 255, 0.45)), Math.round(U.lerp(rgb[1], 255, 0.45)), Math.round(U.lerp(rgb[2], 255, 0.45))];
    g.addColorStop(0, U.rgba(pale, 0.8));
    g.addColorStop(0.28, U.rgba(rgb, 0.62));
    g.addColorStop(1, U.rgba(rgb, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    return s;
  }
  function fireCol(idx, heat, a){
    var warm = U.hexRGB(Cfg.CFG.fire.warm), cool = U.hexRGB(Cfg.CFG.fire.cool);
    var tone = [0.62, 1, 1.5][idx];
    var r = U.lerp(warm[0], cool[0], heat) * tone, g = U.lerp(warm[1], cool[1], heat) * tone, b = U.lerp(warm[2], cool[2], heat) * tone;
    return 'rgba(' + Math.min(255, Math.round(r)) + ',' + Math.min(255, Math.round(g)) + ',' + Math.min(255, Math.round(b)) + ',' + a + ')';
  }
  function drawFire(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.fire;
    var mo = Cfg.CFG.look.motion;
    var key = cfg.warm + cfg.cool;
    if (!warmSprite || spriteKey !== key){
      warmSprite = makeGlowSprite(U.hexRGB(cfg.warm));
      coldSprite = makeGlowSprite(U.hexRGB(cfg.cool));
      spriteKey = key;
    }
    Can.backdrop(cfg.trail);

    // Blue needs a big passage: it follows drive (how loud this part of the
    // song is), so a verse stays orange and only a loud chorus burns blue.
    var hard = A.drive * 0.8 + A.intensity * 0.2;
    var heat = U.clamp01((hard - cfg.blueAt) / cfg.blueRange);
    heatShown = U.env(heatShown, heat, 3, 1.2, dt);
    var coreHeat = heatShown;
    // The flames themselves only lean toward the hot colour. Halfway between
    // orange and blue is grey, and added light turns grey into white, so the
    // blue is shown by the core at the base and the tongues stay fire-coloured.
    heat = heatShown * FLAME_LEAN;
    // Everything here is added light on top of a picture that keeps
    // (1 - trail) of the last frame, so brightness builds up to 1 / trail of
    // what one frame draws. Scale what is drawn so a busy fire stays under white.
    var expo = Math.min(1, (0.25 + cfg.trail) / 0.55);

    fireSway = U.env(fireSway, (Math.sin(A.t * 1.1 * mo) * 0.4 + (Aud.sourceValue(cfg.source) - 0.3) * 1.8), 6, 6, dt);
    var swayPx = fireSway * w * 0.035 * cfg.sway * (0.4 + A.intensity);
    var baseY = h - 3 * k;
    // idea A: a small fire in a calm passage, a tall one in a loud passage
    var flameH = h * (0.17 + A.level * 0.34 + A.drive * 0.3 + A.punch * 0.14) * cfg.height;

    ctx.globalCompositeOperation = 'lighter';

    // The line of flames is a spectrum of the bass (30 to 800 Hz, the range
    // the studied videos show): the lowest notes burn in the middle, higher
    // ones toward the sides, so a kick drum throws up the centre flames.
    var tongues = Math.round(cfg.tongues), halfT = Math.ceil(tongues / 2);
    if (!flameVals || flameVals.length !== halfT){ flameVals = new Float32Array(halfT); flameState = new Float32Array(halfT); }
    Aud.bars(flameVals, { lo: 30, hi: 800, scale: 'lin', blur: 0.4, state: flameState, attack: 55, release: 8 });
    // each kick makes the air shimmer: the flames wobble sideways for a moment
    var haze = 1 + A.kick * 1.8 * (0.3 + 0.7 * A.drive);
    for (var ti = 0; ti < tongues; ti++){
      var f = tongues === 1 ? 0.5 : ti / (tongues - 1);
      var band = flameVals[Math.min(halfT - 1, Math.round(Math.abs(f - 0.5) * 2 * (halfT - 1)))];
      var centre = w * 0.5 + (f - 0.5) * w * (0.34 + A.intensity * 0.2) + swayPx;
      var wave = Math.sin(A.t * (2.1 + ti * 0.41) * mo + ti * 1.7) * w * 0.022 * (0.35 + A.intensity * 1.6) * haze;
      var hgt = flameH * (0.3 + band * 1.05) * (0.8 + Math.sin(f * Math.PI) * 0.36);
      var halfW = w * (0.032 + band * 0.028) * (0.7 + A.level * 0.6);
      var tipX = centre + wave, tipY = baseY - hgt;

      var g = ctx.createLinearGradient(0, baseY, 0, tipY);
      g.addColorStop(0, fireCol(2, heat, ((0.2 + A.level * 0.1) * expo).toFixed(3)));
      g.addColorStop(0.32, fireCol(1, heat, (0.17 * expo).toFixed(3)));
      g.addColorStop(1, fireCol(0, heat, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(centre - halfW, baseY);
      ctx.bezierCurveTo(centre - halfW * 0.95, baseY - hgt * 0.45, tipX - halfW * 0.38, baseY - hgt * 0.78, tipX, tipY);
      ctx.bezierCurveTo(tipX + halfW * 0.38, baseY - hgt * 0.78, centre + halfW * 0.95, baseY - hgt * 0.45, centre + halfW, baseY);
      ctx.closePath();
      ctx.fill();
    }

    var bedH = (14 + A.level * 38) * k;
    var bed = ctx.createLinearGradient(0, baseY - bedH, 0, baseY + 2 * k);
    bed.addColorStop(0, fireCol(1, heat, 0));
    bed.addColorStop(1, fireCol(2, heat, ((0.14 + A.level * 0.14) * expo).toFixed(3)));
    ctx.fillStyle = bed;
    ctx.fillRect(w * 0.08, baseY - bedH, w * 0.84, bedH + 2 * k);

    var cap = Math.round(300 * cfg.spawn);
    var spawn = Math.round((A.level * 4 + A.drive * 5 + A.punch * 16 * (0.3 + 0.7 * A.drive)) * cfg.spawn);
    for (var s = 0; s < spawn && fireParts.length < cap; s++){
      var spread = w * (0.12 + A.level * 0.2);
      fireParts.push({
        x: w * 0.5 + (Math.random() - 0.5) * 2 * spread + swayPx,
        y: h - Math.random() * 8 * k,
        vx: (Math.random() - 0.5) * 26 * k,
        vy: -(70 + Math.random() * 95 + A.level * 230 + A.punch * 260) * k * mo,
        life: 1,
        decay: (0.6 + Math.random() * 0.8) / cfg.life,
        size: (7 + Math.random() * 11 + A.level * 15) * k * cfg.size,
        spin: Math.random() * 6.283,
        heat: heat
      });
    }
    // many overlapping embers add up, so each one is fainter in a crowd
    var crowd = expo / (1 + fireParts.length / 110);
    for (var i = fireParts.length - 1; i >= 0; i--){
      var p = fireParts[i];
      p.vx += Math.sin(p.y * 0.011 / k + A.t * 3.1 + p.spin) * (70 + A.high * 300) * k * cfg.turb * dt;
      p.vx += fireSway * 26 * k * cfg.sway * dt;
      p.vy -= (12 + A.level * 55) * k * dt;
      p.vx *= Math.pow(0.28, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt * (1 + A.high * 0.6);
      if (p.life <= 0 || p.y < -20 * k){ fireParts.splice(i, 1); continue; }

      var r = p.size * (0.35 + p.life * 0.95);
      var a = p.life * p.life * 0.85 * crowd;
      if (p.heat < 0.98){
        ctx.globalAlpha = a * (1 - p.heat);
        ctx.drawImage(warmSprite, p.x - r, p.y - r, r * 2, r * 2);
      }
      if (p.heat > 0.02){
        ctx.globalAlpha = a * p.heat;
        ctx.drawImage(coldSprite, p.x - r, p.y - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;

    if (cfg.sparks && A.beat && A.beatStrength > 0.18){
      var n = Math.round((3 + A.beatStrength * 20) * cfg.sparkAmt);
      for (var q = 0; q < n && fireSparks.length < 220; q++){
        fireSparks.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.3 + swayPx,
          y: h - 6 * k,
          vx: (Math.random() - 0.5) * 220 * k * mo,
          vy: -(200 + Math.random() * 420 + A.beatStrength * 400) * k * mo,
          life: 1,
          decay: (0.4 + Math.random() * 0.55) / cfg.life,
          heat: heat
        });
      }
    }
    // Hi-hat: a few light embers flicked up off the top of the flames
    if (cfg.hatEmbers && A.hatHit > 0.25 && A.drive > 0.08){
      var hn = Math.round((1 + A.hatHit * 5) * cfg.sparkAmt);
      for (var hq = 0; hq < hn && fireSparks.length < 240; hq++){
        fireSparks.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.5 + swayPx,
          y: baseY - flameH * (0.35 + Math.random() * 0.5),
          vx: (Math.random() - 0.5) * 120 * k * mo,
          vy: -(90 + Math.random() * 190) * k * mo,
          life: 1, decay: (0.9 + Math.random() * 0.9) / cfg.life, heat: heat, light: true
        });
      }
    }
    for (var j = fireSparks.length - 1; j >= 0; j--){
      var sk = fireSparks[j];
      sk.vy += (sk.light ? 60 : 210) * k * dt;   // hi-hat embers are light: they float
      sk.vx *= Math.pow(0.5, dt);
      sk.x += sk.vx * dt;
      sk.y += sk.vy * dt;
      sk.life -= sk.decay * dt;
      if (sk.life <= 0 || sk.y > h + 10 * k){ fireSparks.splice(j, 1); continue; }
      var flick = 0.55 + 0.45 * Math.sin(A.t * 40 + j);
      ctx.fillStyle = fireCol(2, sk.heat, (sk.life * flick).toFixed(3));
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, (0.9 + sk.life * 1.5) * k, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    // The blue core: a hot heart at the base that only shows in a loud
    // passage. Painted last and as paint, not added light: added to a base
    // that is already bright it would only make white.
    if (coreHeat > 0.02){
      var coreH = flameH * (0.36 + A.kick * 0.1), coreW = w * (0.15 + A.level * 0.07);
      var ccx = w * 0.5 + swayPx;
      var core = ctx.createRadialGradient(ccx, baseY, 0, ccx, baseY, coreH);
      var coolRGB = U.hexRGB(cfg.cool);
      var coreTop = [Math.round(U.lerp(coolRGB[0], 255, 0.45)), Math.round(U.lerp(coolRGB[1], 255, 0.45)), Math.round(U.lerp(coolRGB[2], 255, 0.45))];
      core.addColorStop(0, U.rgba(coreTop, (coreHeat * 0.3).toFixed(3)));
      core.addColorStop(0.45, U.rgba(coolRGB, (coreHeat * 0.2).toFixed(3)));
      core.addColorStop(1, U.rgba(coolRGB, 0));
      ctx.save();
      ctx.translate(ccx, baseY);
      ctx.scale(coreW / coreH, 1);
      ctx.translate(-ccx, -baseY);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(ccx, baseY, coreH, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  function paintBG(c, w, h, k){
    // a hearth rather than a black rectangle: cave walls, back wall glow,
    // a stone arch and scattered cooling embers
    var wall = c.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, w * 0.75);
    wall.addColorStop(0, 'rgba(120,46,20,0.42)');
    wall.addColorStop(0.45, 'rgba(58,22,16,0.3)');
    wall.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = wall;
    c.fillRect(0, 0, w, h);
    for (var br = 0; br < 34; br++){        // brickwork on the back wall
      var bx = (br * 137) % w, by = h * 0.12 + ((br * 71) % Math.round(h * 0.6));
      c.fillStyle = 'rgba(255,190,140,0.028)';
      c.fillRect(bx, by, w * 0.075, h * 0.05);
    }
    c.strokeStyle = 'rgba(255,170,110,0.07)';
    c.lineWidth = 2 * k;
    c.beginPath();                          // arch over the fire
    c.moveTo(w * 0.1, h);
    c.quadraticCurveTo(w * 0.5, h * 0.06, w * 0.9, h);
    c.stroke();
    for (var em = 0; em < 60; em++){        // cooling embers on the floor
      var ex = (em * 211) % w, ey = h - ((em * 53) % Math.round(h * 0.16)) - 2 * k;
      c.fillStyle = 'rgba(255,' + (90 + (em % 6) * 22) + ',40,' + (0.06 + (em % 5) * 0.03).toFixed(3) + ')';
      c.beginPath();
      c.arc(ex, ey, (0.8 + (em % 4) * 0.7) * k, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(12,6,8,0.8)';       // hearth stones
    for (var st = 0; st < 11; st++){
      c.beginPath();
      c.ellipse(w * (0.03 + st * 0.095), h - 1 * k, w * 0.052, 8 * k, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(255,150,90,0.12)';
      c.lineWidth = 1 * k;
      c.stroke();
    }
    var vig = c.createRadialGradient(w / 2, h * 0.6, w * 0.2, w / 2, h * 0.6, w * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = vig;
    c.fillRect(0, 0, w, h);
  }

  function onTap(x, y){
    var k = Can.dpr(), cfg = Cfg.CFG.fire;
    App.taps.spawnRing(x, y, '#FFC46B');
    for (var i = 0; i < 26; i++){
      if (fireSparks.length >= 240) break;
      var a = Math.random() * 6.283, sp = (60 + Math.random() * 260) * k;
      fireSparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * k,
                        life: 1, decay: 0.5 + Math.random() * 0.6,
                        heat: U.clamp01((A.intensity - cfg.blueAt) / cfg.blueRange) });
    }
    for (var pf = 0; pf < 14 && fireParts.length < 320; pf++){
      fireParts.push({ x: x + (Math.random() - 0.5) * 30 * k, y: y, vx: (Math.random() - 0.5) * 60 * k,
                       vy: -(40 + Math.random() * 120) * k, life: 1, decay: 0.9 + Math.random(),
                       size: (6 + Math.random() * 12) * k * cfg.size, spin: Math.random() * 6.283,
                       heat: U.clamp01((A.intensity - cfg.blueAt) / cfg.blueRange) });
    }
  }

  function reset(){ fireParts = []; fireSparks = []; heatShown = 0; flameState = null; flameVals = null; }

  App.modes.register('fire', { draw: drawFire, paintBG: paintBG, onTap: onTap, reset: reset });

  App.cfg.registerDefaults('fire', {
    tongues: 9, height: 1, spawn: 1, life: 1, size: 1, sparks: true, hatEmbers: true, sparkAmt: 1,
    blueAt: 0.72, blueRange: 0.2, warm: '#FF7E14', cool: '#3E9CFF',
    sway: 1, turb: 1, trail: 0.3, source: 'bass', bg1: '#170B10', bg2: '#05030A'
  });
  App.cfg.registerSchema({ id: 'fire', label: 'Fire', fields: [
    ['tongues', 'Flame tongues', 'range', 3, 15, 1],
    ['height', 'Flame height', 'range', 0.3, 2.5, 0.05],
    ['spawn', 'Ember amount', 'range', 0.2, 3, 0.05],
    ['life', 'Ember lifespan', 'range', 0.3, 3, 0.05],
    ['size', 'Ember size', 'range', 0.3, 2.5, 0.05],
    ['turb', 'Turbulence', 'range', 0, 3, 0.05],
    ['source', 'Sway follows', 'select', Aud.SOURCES],
    ['sway', 'Sway amount', 'range', 0, 3, 0.05],
    ['sparks', 'Beat sparks', 'bool'],
    ['hatEmbers', 'Hi-hat embers', 'bool'],
    ['sparkAmt', 'Spark amount', 'range', 0.2, 3, 0.05],
    ['blueAt', 'Blue core starts at (how loud the passage is)', 'range', 0.3, 1, 0.01],
    ['blueRange', 'Blue transition width', 'range', 0.03, 0.6, 0.01],
    ['warm', 'Warm flame colour', 'color'],
    ['cool', 'Hot (blue) colour', 'color'],
    ['trail', 'Trail fade', 'range', 0.05, 1, 0.02],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
})();
