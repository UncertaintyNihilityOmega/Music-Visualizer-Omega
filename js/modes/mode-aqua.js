/* ---------- Aquatic ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var aquaBubbles = [], aquaRings = [], aquaFish = [];
  var FISH_COLORS = ['#F2A65A', '#7BD3F7', '#E8757F', '#8FE3B0', '#F5D06F', '#B79CE8'];

  function seedFish(){
    aquaFish = [];
    var n = 7;
    for (var i = 0; i < n; i++){
      aquaFish.push({
        x: Math.random() * canvas.width,
        y: canvas.height * (0.12 + Math.random() * 0.7),
        dir: Math.random() < 0.5 ? -1 : 1,
        sp: 10 + Math.random() * 26,
        size: 0.6 + Math.random() * 0.9,
        ph: Math.random() * 6.283,
        color: FISH_COLORS[i % FISH_COLORS.length]
      });
    }
  }
  function drawFish(dt, k){
    if (!aquaFish.length) seedFish();
    var w = canvas.width, h = canvas.height;
    for (var i = 0; i < aquaFish.length; i++){
      var f = aquaFish[i];
      f.x += f.dir * f.sp * k * dt * Cfg.CFG.look.motion * (1 + A.level * 0.8);
      f.y += Math.sin(A.t * 0.8 + f.ph) * 6 * k * dt;
      if (f.dir > 0 && f.x > w + 40 * k){ f.x = -40 * k; f.y = h * (0.12 + Math.random() * 0.7); }
      if (f.dir < 0 && f.x < -40 * k){ f.x = w + 40 * k; f.y = h * (0.12 + Math.random() * 0.7); }
      var L = 13 * k * f.size, H = 6.5 * k * f.size;
      var wag = Math.sin(A.t * 6 + f.ph) * 0.35;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(f.dir, 1);
      ctx.globalAlpha = 0.75;
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
  function spawnBubble(x, y, v){
    var k = Can.dpr();
    if (aquaBubbles.length > 260) return;
    aquaBubbles.push({
      x: x, y: y,
      r: (2 + Math.random() * 7) * k * Cfg.CFG.aqua.bubbleSize * (0.6 + (v || 0.4)),
      vy: -(16 + Math.random() * 40) * k,
      ph: Math.random() * 6.283, wob: 0.5 + Math.random(),
      age: 0, life: 3 + Math.random() * 5
    });
  }
  function spawnAquaRing(x, y, power){
    if (aquaRings.length > 26) return;
    aquaRings.push({ x: x, y: y, age: 0, life: Cfg.CFG.aqua.ringLife * (0.7 + Math.random() * 0.6), power: power });
  }
  function drawAqua(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.aqua;
    Can.backdrop(1);
    var mo = Cfg.CFG.look.motion;

    if (cfg.caustics){
      ctx.globalAlpha = 0.06 + A.level * 0.1;
      ctx.strokeStyle = '#CFF6FF';
      ctx.lineWidth = 2 * k;
      for (var c = 0; c < 6; c++){
        ctx.beginPath();
        for (var x = 0; x <= w; x += 16 * k){
          var y = h * (0.1 + c * 0.14) + Math.sin(x * 0.008 / k + A.t * (0.6 + c * 0.2) * mo) * 10 * k
                  + Math.sin(x * 0.02 / k - A.t * 0.9) * 5 * k * (0.4 + A.mid);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    drawFish(dt, k);

    // bubbles rise with the music, same idea as the fire embers
    var want = (0.4 + A.level * 3.4) * cfg.bubbles * dt * 16;
    while (want > 0){
      if (Math.random() < Math.min(1, want)) spawnBubble(Math.random() * w, h + 6 * k, A.level);
      want -= 1;
    }
    var drift = Math.sin(A.t * 0.3) * cfg.drift * (0.4 + A.trebleTilt + 0.4);
    var bub = U.hexRGB(cfg.color);
    for (var b = aquaBubbles.length - 1; b >= 0; b--){
      var bb = aquaBubbles[b];
      bb.age += dt;
      bb.y += bb.vy * dt * cfg.rise * mo * (1 + A.bass * 0.5);
      bb.x += (Math.sin(A.t * bb.wob + bb.ph) * 12 * k + drift * 26 * k) * dt;
      if (bb.age > bb.life || bb.y < -10 * k){ aquaBubbles.splice(b, 1); continue; }
      var fade = Math.min(1, (bb.life - bb.age) / 0.6);
      ctx.strokeStyle = U.rgba(bub, (0.32 * fade).toFixed(3));
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, bb.r, 0, 6.283);
      ctx.stroke();
      ctx.fillStyle = U.rgba(bub, (0.10 * fade).toFixed(3));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * fade).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(bb.x - bb.r * 0.32, bb.y - bb.r * 0.32, bb.r * 0.22, 0, 6.283);
      ctx.fill();
    }

    // expanding surface rings with their own lifespan
    if (cfg.rings > 0 && A.beat && A.beatStrength > 0.2 && Math.random() < cfg.rings * 0.8){
      spawnAquaRing(w * (0.1 + Math.random() * 0.8), h * (0.15 + Math.random() * 0.7), A.beatStrength);
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
    for (var ry = 0; ry < 5; ry++){         // light shafts from the surface
      var sx = w * (0.1 + ry * 0.2);
      var sg = c.createLinearGradient(sx, 0, sx + w * 0.1, h);
      sg.addColorStop(0, 'rgba(190,245,255,0.10)');
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

  function onTap(x, y){
    var k = Can.dpr();
    App.taps.spawnRing(x, y, '#CFF6FF');
    spawnAquaRing(x, y, 0.9);
    for (var b = 0; b < 18; b++) spawnBubble(x + (Math.random() - 0.5) * 40 * k, y + (Math.random() - 0.5) * 20 * k, 0.9);
  }

  function reset(){ aquaBubbles = []; aquaRings = []; }
  Can.addResizeHook(function(){ aquaFish = []; });

  App.modes.register('aqua', { draw: drawAqua, paintBG: paintBG, onTap: onTap, reset: reset });

  App.cfg.registerDefaults('aqua', {
    bubbles: 1, bubbleSize: 1, rings: 1, ringLife: 2.4, drift: 1, caustics: true,
    rise: 1, color: '#8FE8E3', ringColor: '#CFF6FF', bg1: '#0B4056', bg2: '#01131E'
  });
  App.cfg.registerSchema({ id: 'aqua', label: 'Aquatic', fields: [
    ['bubbles', 'Bubble amount', 'range', 0.2, 3, 0.05],
    ['bubbleSize', 'Bubble size', 'range', 0.3, 3, 0.05],
    ['rise', 'Rise speed', 'range', 0.3, 3, 0.05],
    ['rings', 'Ring amount', 'range', 0, 3, 0.05],
    ['ringLife', 'Ring lifespan (seconds)', 'range', 0.5, 8, 0.1],
    ['drift', 'Current strength', 'range', 0, 3, 0.05],
    ['caustics', 'Light shafts', 'bool'],
    ['color', 'Bubble colour', 'color'],
    ['ringColor', 'Ring colour', 'color'],
    ['bg1', 'Water top', 'color'],
    ['bg2', 'Deep', 'color']
  ]});
})();
