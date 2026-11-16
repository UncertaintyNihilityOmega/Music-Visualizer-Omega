/* ---------- Aquatic ----------
   An underwater scene that listens the way docs/MODES.md describes:
     water surface   a line drawn from the bass (30-800 Hz), like Basic's bass range
     fish            swim as one school while the music is calm; a kick drum scatters them
     bubbles         a steady stream that follows how loud the passage is, plus a
                     quick burst of small ones on every hi-hat
     light shafts    brighten as the passage gets louder
     rings           spread from a beat, as before
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var aquaBubbles = [], aquaRings = [], aquaFish = [];
  var surf = new Float32Array(56), surfState = new Float32Array(56);
  var FISH_COLORS = ['#F2A65A', '#7BD3F7', '#E8757F', '#8FE3B0', '#F5D06F', '#B79CE8'];

  function seedFish(){
    aquaFish = [];
    var n = Math.max(3, Math.round(Cfg.CFG.aqua.fish));
    for (var i = 0; i < n; i++){
      aquaFish.push({
        x: Math.random() * canvas.width,
        y: canvas.height * (0.18 + Math.random() * 0.62),
        vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1,
        dir: Math.random() < 0.5 ? -1 : 1,
        sp: 12 + Math.random() * 26,
        size: 0.6 + Math.random() * 0.9,
        ph: Math.random() * 6.283,
        // this fish's own place in the school, around its centre
        ox: (Math.random() - 0.5) * 2, oy: (Math.random() - 0.5) * 2,
        color: FISH_COLORS[i % FISH_COLORS.length]
      });
    }
  }
  function drawFish(dt, k){
    var cfg = Cfg.CFG.aqua;
    if (aquaFish.length !== Math.max(3, Math.round(cfg.fish))) seedFish();
    var w = canvas.width, h = canvas.height, mo = Cfg.CFG.look.motion;
    // 1 while the music is calm (swim together), 0 when it is loud (each to its own)
    var together = cfg.school ? 1 - U.clamp01((A.drive - 0.22) / 0.33) : 0;
    // the school's centre wanders slowly round the tank
    var scx = w * (0.5 + 0.3 * Math.sin(A.t * 0.13 * mo)), scy = h * (0.46 + 0.17 * Math.sin(A.t * 0.19 * mo + 1));
    var heading = Math.cos(A.t * 0.13 * mo) >= 0 ? 1 : -1;
    var scatter = cfg.school && A.kickHit > 0.32 && A.drive > 0.2 ? (240 + 380 * A.kickHit) * k * (0.4 + 0.6 * A.drive) : 0;
    for (var i = 0; i < aquaFish.length; i++){
      var f = aquaFish[i];
      // pulled toward its place in the school when calm...
      var ax = (scx + f.ox * w * 0.15 - f.x) * 1.1 * together;
      var ay = (scy + f.oy * h * 0.13 - f.y) * 1.1 * together;
      // ...and toward its own cruising speed when not
      ax += (f.dir * f.sp * k * (1 + A.level * 0.8) - f.vx) * 1.6 * (1 - together * 0.9);
      ay += (Math.sin(A.t * 0.8 + f.ph) * 9 * k - f.vy) * 1.3;
      if (together > 0.05){ ax -= f.vx * 1.4 * together; ay -= f.vy * 0.6 * together; }
      if (scatter){
        var dx = f.x - scx, dy = f.y - scy, d = Math.sqrt(dx * dx + dy * dy) || 1;
        f.vx += dx / d * scatter * (0.6 + Math.random() * 0.6);
        f.vy += dy / d * scatter * 0.55;
        f.dir = dx >= 0 ? 1 : -1;
      }
      f.vx += ax * dt; f.vy += ay * dt;
      f.x += f.vx * dt * mo;
      f.y += f.vy * dt * mo;
      // keep off the surface and the seabed; swim off one side and come back on the other
      if (f.y < h * 0.17) f.vy += (h * 0.17 - f.y) * 6 * dt;
      if (f.y > h * 0.86) f.vy -= (f.y - h * 0.86) * 6 * dt;
      if (together < 0.3){
        if (f.x > w + 40 * k){ f.x = -40 * k; f.y = h * (0.2 + Math.random() * 0.6); }
        else if (f.x < -40 * k){ f.x = w + 40 * k; f.y = h * (0.2 + Math.random() * 0.6); }
      }
      if (Math.abs(f.vx) > 5 * k) f.face = f.vx > 0 ? 1 : -1;
      else if (together > 0.6) f.face = heading;

      var L = 13 * k * f.size, H = 6.5 * k * f.size;
      var speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      var wag = Math.sin(A.t * (6 + Math.min(10, speed / (14 * k))) + f.ph) * 0.35;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.face, 1);
      ctx.rotate(Math.max(-0.5, Math.min(0.5, f.vy / (Math.abs(f.vx) + 30 * k))));
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(L, 0);
      ctx.quadraticCurveTo(0, -H, -L * 0.7, 0);
      ctx.quadraticCurveTo(0, H, L, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-L * 0.65, 0);
      ctx.lineTo(-L * 1.15, -H * (0.8 + wag));
      ctx.lineTo(-L * 1.15, H * (0.8 - wag));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(L * 0.55, -H * 0.22, 1.1 * k * f.size, 0, 6.283);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  function spawnBubble(x, y, v, small){
    var k = Can.dpr();
    if (aquaBubbles.length > 280) return;
    aquaBubbles.push({
      x: x, y: y,
      r: small ? (1 + Math.random() * 2.2) * k * Cfg.CFG.aqua.bubbleSize
               : (2 + Math.random() * 7) * k * Cfg.CFG.aqua.bubbleSize * (0.6 + (v || 0.4)),
      vy: -(small ? 60 + Math.random() * 70 : 16 + Math.random() * 40) * k,
      ph: Math.random() * 6.283, wob: 0.5 + Math.random(),
      age: 0, life: small ? 1.2 + Math.random() * 1.2 : 3 + Math.random() * 5
    });
  }
  function spawnAquaRing(x, y, power){
    if (aquaRings.length > 26) return;
    aquaRings.push({ x: x, y: y, age: 0, life: Cfg.CFG.aqua.ringLife * (0.7 + Math.random() * 0.6), power: power });
  }
  // the five shafts of light, shared by the cached background and the live brightening
  function shafts(c, w, h, alpha){
    for (var ry = 0; ry < 5; ry++){
      var sx = w * (0.1 + ry * 0.2);
      var sg = c.createLinearGradient(sx, 0, sx + w * 0.1, h);
      sg.addColorStop(0, 'rgba(190,245,255,' + alpha.toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(190,245,255,0)');
      c.fillStyle = sg;
      c.beginPath();
      c.moveTo(sx - w * 0.03, 0);
      c.lineTo(sx + w * 0.05, 0);
      c.lineTo(sx + w * 0.16, h);
      c.lineTo(sx + w * 0.02, h);
      c.closePath();
      c.fill();
    }
  }
  function drawAqua(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.aqua;
    Can.backdrop(1);
    var mo = Cfg.CFG.look.motion;

    // light shafts brighten with the passage (the cached background holds the dim ones)
    if (A.drive > 0.03) shafts(ctx, w, h, A.drive * 0.13 + A.kick * 0.04 * A.drive);

    if (cfg.caustics){
      ctx.globalAlpha = 0.06 + A.level * 0.1;
      ctx.strokeStyle = '#CFF6FF';
      ctx.lineWidth = 2 * k;
      for (var c = 0; c < 6; c++){
        ctx.beginPath();
        for (var x = 0; x <= w; x += 16 * k){
          var y = h * (0.16 + c * 0.13) + Math.sin(x * 0.008 / k + A.t * (0.6 + c * 0.2) * mo) * 10 * k
                  + Math.sin(x * 0.02 / k - A.t * 0.9) * 5 * k * (0.4 + A.mid);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // the water surface: its shape is the bass spectrum, low notes on the left
    if (cfg.surface){
      Aud.bars(surf, { lo: 30, hi: 800, scale: 'lin', blur: 0.6, state: surfState, attack: 45, release: 7 });
      var sy = h * 0.085, n = surf.length, amp = h * 0.075;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (var s = 0; s < n; s++){
        var px = s / (n - 1) * w;
        var py = sy + Math.sin(px * 0.01 / k + A.t * 1.3 * mo) * 2.5 * k - surf[s] * amp;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(w, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200,244,255,' + (0.1 + A.drive * 0.1).toFixed(3) + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(215,248,255,' + (0.4 + A.level * 0.4).toFixed(3) + ')';
      ctx.lineWidth = 1.6 * k;
      ctx.stroke();
    }

    drawFish(dt, k);

    // idea A: a few bubbles in a calm passage, a stream of them in a loud one
    var want = (0.3 + A.drive * 3.4) * cfg.bubbles * dt * 16;
    while (want > 0){
      if (Math.random() < Math.min(1, want)) spawnBubble(Math.random() * w, h + 6 * k, A.level);
      want -= 1;
    }
    // hi-hat: a quick burst of small bubbles off the seabed
    if (cfg.hatBubbles && A.hatHit > 0.25 && A.drive > 0.06){
      var hb = 2 + Math.round(A.hatHit * 5 * cfg.bubbles), hx = w * (0.08 + Math.random() * 0.84);
      for (var q = 0; q < hb; q++) spawnBubble(hx + (Math.random() - 0.5) * 26 * k, h - Math.random() * 14 * k, 0.3, true);
    }
    var drift = Math.sin(A.t * 0.3) * cfg.drift * (0.4 + A.trebleTilt + 0.4);
    var bub = U.hexRGB(cfg.color);
    for (var b = aquaBubbles.length - 1; b >= 0; b--){
      var bb = aquaBubbles[b];
      bb.age += dt;
      bb.y += bb.vy * dt * cfg.rise * mo * (1 + A.bass * 0.5);
      bb.x += (Math.sin(A.t * bb.wob + bb.ph) * 12 * k + drift * 26 * k) * dt;
      if (bb.age > bb.life || bb.y < h * 0.085){ aquaBubbles.splice(b, 1); continue; }
      var fade = Math.min(1, (bb.life - bb.age) / 0.6);
      ctx.strokeStyle = U.rgba(bub, (0.32 * fade).toFixed(3));
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, bb.r, 0, 6.283);
      ctx.stroke();
      ctx.fillStyle = U.rgba(bub, (0.10 * fade).toFixed(3));
      ctx.fill();
      if (bb.r > 2.5 * k){
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * fade).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(bb.x - bb.r * 0.32, bb.y - bb.r * 0.32, bb.r * 0.22, 0, 6.283);
        ctx.fill();
      }
    }

    // expanding rings with their own lifespan
    if (cfg.rings > 0 && A.beat && A.beatStrength > 0.2 && Math.random() < cfg.rings * (0.25 + 0.75 * A.drive)){
      spawnAquaRing(w * (0.1 + Math.random() * 0.8), h * (0.2 + Math.random() * 0.65), A.beatStrength);
    }
    var rc = U.hexRGB(cfg.ringColor);
    for (var r2 = aquaRings.length - 1; r2 >= 0; r2--){
      var rg = aquaRings[r2];
      rg.age += dt;
      if (rg.age > rg.life){ aquaRings.splice(r2, 1); continue; }
      var f = rg.age / rg.life;
      var rad = f * Math.min(w, h) * 0.42 * (0.5 + rg.power);
      ctx.strokeStyle = U.rgba(rc, ((1 - f) * 0.5).toFixed(3));
      ctx.lineWidth = (2.4 * (1 - f) + 0.4) * k;
      ctx.beginPath();
      ctx.arc(rg.x, rg.y, rad, 0, 6.283);
      ctx.stroke();
      if (f < 0.6){
        ctx.strokeStyle = U.rgba(rc, ((0.6 - f) * 0.4).toFixed(3));
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rad * 0.62, 0, 6.283);
        ctx.stroke();
      }
    }
  }

  function paintBG(c, w, h, k){
    shafts(c, w, h, 0.10);                  // light shafts from the surface
    c.fillStyle = 'rgba(0,25,40,0.45)';     // seabed
    c.beginPath();
    c.moveTo(0, h);
    c.quadraticCurveTo(w * 0.3, h - 26 * k, w * 0.6, h - 12 * k);
    c.quadraticCurveTo(w * 0.85, h - 4 * k, w, h - 20 * k);
    c.lineTo(w, h);
    c.closePath();
    c.fill();
    for (var sw = 0; sw < 16; sw++){        // seaweed silhouettes
      var wx = (sw * 173) % w;
      c.strokeStyle = 'rgba(20,90,80,0.35)';
      c.lineWidth = (1.5 + (sw % 3)) * k;
      c.beginPath();
      c.moveTo(wx, h);
      c.quadraticCurveTo(wx + 14 * k, h - 40 * k, wx + ((sw % 2) ? 10 : -10) * k, h - (50 + (sw % 5) * 22) * k);
      c.stroke();
    }
  }

  // Touch: a ring, a puff of bubbles, and the fish dart away from your finger
  function onTap(x, y){
    var k = Can.dpr();
    App.taps.spawnRing(x, y, '#CFF6FF');
    spawnAquaRing(x, y, 0.9);
    for (var b = 0; b < 18; b++) spawnBubble(x + (Math.random() - 0.5) * 40 * k, y + (Math.random() - 0.5) * 20 * k, 0.9);
    for (var i = 0; i < aquaFish.length; i++){
      var f = aquaFish[i], dx = f.x - x, dy = f.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 220 * k){ f.vx += dx / d * 330 * k; f.vy += dy / d * 200 * k; f.dir = dx >= 0 ? 1 : -1; }
    }
  }

  function reset(){ aquaBubbles = []; aquaRings = []; }
  Can.addResizeHook(function(){ aquaFish = []; });

  App.modes.register('aqua', { draw: drawAqua, paintBG: paintBG, onTap: onTap, reset: reset, fx: 0.5 });

  App.cfg.registerDefaults('aqua', {
    bubbles: 1, bubbleSize: 1, hatBubbles: true, rings: 1, ringLife: 2.4, drift: 1, caustics: true,
    surface: true, fish: 11, school: true,
    rise: 1, color: '#8FE8E3', ringColor: '#CFF6FF', bg1: '#0B4056', bg2: '#01131E'
  });
  App.cfg.registerSchema({ id: 'aqua', label: 'Aquatic', fields: [
    ['bubbles', 'Bubble amount', 'range', 0.2, 3, 0.05],
    ['bubbleSize', 'Bubble size', 'range', 0.3, 3, 0.05],
    ['hatBubbles', 'Hi-hat bubble bursts', 'bool'],
    ['rise', 'Rise speed', 'range', 0.3, 3, 0.05],
    ['surface', 'Water surface follows the bass', 'bool'],
    ['fish', 'Fish', 'range', 3, 24, 1],
    ['school', 'Fish school when calm, scatter on a kick', 'bool'],
    ['rings', 'Ring amount', 'range', 0, 3, 0.05],
    ['ringLife', 'Ring lifespan (seconds)', 'range', 0.5, 8, 0.1],
    ['drift', 'Current strength', 'range', 0, 3, 0.05],
    ['caustics', 'Light ripples', 'bool'],
    ['color', 'Bubble colour', 'color'],
    ['ringColor', 'Ring colour', 'color'],
    ['bg1', 'Water top', 'color'],
    ['bg2', 'Deep', 'color']
  ]});
})();
