/* ---------- Rain: wind follows the treble balance by default ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var rainDrops = [], rainSplash = [], rainInited = false;
  var windVel = 0, gust = 0, boltFlash = 0, bolt = null, puddleH = 0;

  function initRain(){
    rainDrops = [];
    rainSplash = [];
    var w = canvas.width, h = canvas.height;
    var count = Math.max(30, Math.min(500, Math.round(canvas.clientWidth / 5 * Cfg.CFG.rain.drops)));
    for (var i = 0; i < count; i++){
      rainDrops.push({
        x: Math.random() * w, y: Math.random() * h,
        z: 0.28 + Math.random() * 0.72,
        len: 0.7 + Math.random() * 0.6
      });
    }
    rainInited = true;
  }
  function drawRain(){
    if (!rainInited) initRain();
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.rain;
    var mo = Cfg.CFG.look.motion;
    Can.backdrop(cfg.trail);

    var src = cfg.source === 'treble' ? A.trebleTilt : (Aud.sourceValue(cfg.source) - 0.35);
    var dir = Math.sin(A.t * 0.19 * mo) * 0.4 + src * 2.2;
    var windTarget = dir * (0.25 + A.intensity * 2.2) * cfg.wind;
    if (A.beat) gust += (dir >= 0 ? 1 : -1) * A.beatStrength * 1.7 * cfg.gust;
    gust *= Math.exp(-2.4 * dt);
    windVel += ((windTarget + gust) - windVel) * (1 - Math.exp(-3.2 * dt));

    var fallPx = 330 * k * cfg.fall * mo;
    var windPx = windVel * 240 * k * mo;
    puddleH = cfg.puddle ? U.env(puddleH, (4 + A.intensity * 22) * k, 1.4, 0.5, dt) : 0;

    var drop = U.hexRGB(cfg.color);
    ctx.lineCap = 'round';
    for (var i = 0; i < rainDrops.length; i++){
      var d = rainDrops[i];
      var vy = fallPx * (0.55 + d.z * 0.75);
      var vx = windPx * (1.45 - d.z * 0.7);
      d.x += vx * dt;
      d.y += vy * dt;

      var sp = Math.sqrt(vx * vx + vy * vy) || 1;
      var L = (5 + d.len * 13) * k * cfg.len * (0.6 + sp / (620 * k));
      var nx = vx / sp, ny = vy / sp;
      ctx.strokeStyle = U.rgba(drop, (0.12 + d.z * 0.38).toFixed(3));
      ctx.lineWidth = (0.6 + d.z * 1.5) * k;
      ctx.beginPath();
      ctx.moveTo(d.x - nx * L, d.y - ny * L);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();

      if (d.y > h - puddleH * 0.35){
        if (d.tap){
          if (cfg.splash && rainSplash.length < 140){
            rainSplash.push({ x: d.x, y: h - puddleH * 0.35, r: k, max: 18 * k, a: 0.8, tilt: windVel });
          }
          rainDrops.splice(i, 1);
          continue;
        }
        if (cfg.splash && rainSplash.length < 140){
          rainSplash.push({ x: d.x, y: h - puddleH * 0.35, r: k, max: (5 + d.z * 9 + A.intensity * 14) * k, a: 0.4 + d.z * 0.3, tilt: windVel });
        }
        d.y = -Math.random() * h * 0.25;
        if (Math.random() < Math.min(0.55, Math.abs(windVel) * 0.28)){
          d.x = windVel > 0 ? -10 * k : w + 10 * k;
          d.y = Math.random() * h * 0.8;
        } else {
          d.x = Math.random() * w;
        }
      }
      if (d.x < -40 * k) d.x = w + 20 * k;
      else if (d.x > w + 40 * k) d.x = -20 * k;
    }

    for (var s = rainSplash.length - 1; s >= 0; s--){
      var sp2 = rainSplash[s];
      sp2.r += (sp2.max * 2.4) * dt;
      sp2.a -= 1.5 * dt;
      if (sp2.a <= 0 || sp2.r > sp2.max){ rainSplash.splice(s, 1); continue; }
      ctx.strokeStyle = U.rgba(drop, Math.max(0, sp2.a * 0.8).toFixed(3));
      ctx.lineWidth = k;
      ctx.beginPath();
      ctx.ellipse(sp2.x, sp2.y, sp2.r * (1 + Math.abs(sp2.tilt) * 0.4), sp2.r * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (puddleH > 1){
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (var px = 0; px <= w; px += 10 * k){
        var wave = Math.sin(px * 0.012 / k + A.t * (1.6 + Math.abs(windVel) * 2) - windVel * 3) * puddleH * 0.18;
        ctx.lineTo(px, h - puddleH + wave);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = U.rgba(drop, 0.12);
      ctx.fill();
    }

    if (cfg.lightning && A.beat && A.beatStrength > cfg.boltAt && A.intensity > 0.5 && Math.random() < 0.3){
      boltFlash = 1;
      bolt = [];
      var bx = w * (0.15 + Math.random() * 0.7), by = 0;
      while (by < h * (0.5 + Math.random() * 0.4)){
        bolt.push(bx, by);
        by += h * (0.06 + Math.random() * 0.09);
        bx += (Math.random() - 0.5) * w * 0.09 + windVel * 6 * k;
      }
    }
    if (boltFlash > 0){
      boltFlash = Math.max(0, boltFlash - dt * 3.4);
      ctx.fillStyle = 'rgba(255,255,255,' + (boltFlash * 0.4).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
      if (bolt && bolt.length >= 4){
        ctx.strokeStyle = 'rgba(255,250,225,' + (boltFlash * 0.95).toFixed(3) + ')';
        ctx.lineWidth = 2.2 * k;
        ctx.beginPath();
        ctx.moveTo(bolt[0], bolt[1]);
        for (var bi = 2; bi < bolt.length; bi += 2) ctx.lineTo(bolt[bi], bolt[bi + 1]);
        ctx.stroke();
      }
    }
  }

  function paintBG(c, w, h, k){
    // overcast bands + a distant skyline so the drops have depth to fall past
    for (var cl = 0; cl < 7; cl++){
      var cy = h * (0.05 + cl * 0.055), cw = w * (0.3 + (cl % 3) * 0.22);
      c.fillStyle = 'rgba(255,255,255,0.10)';
      c.beginPath();
      c.ellipse((cl * 197) % w, cy, cw, h * 0.05, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(70,58,66,0.16)';
    var bx2 = 0;
    while (bx2 < w){
      var bw = (26 + (bx2 * 7 % 40)) * k, bh = (26 + (bx2 * 13 % 70)) * k;
      c.fillRect(bx2, h - bh, bw, bh);
      bx2 += bw + 3 * k;
    }
  }

  // Touch: releases one real drop of rain from the touch point, which falls
  // and splashes just like the ambient drops.
  function onTap(x, y){
    var k = Can.dpr();
    App.taps.spawnRing(x, y, '#C2626F');
    rainDrops.push({ x: x, y: y, z: 0.95, len: 1.25, tap: true });
    for (var sq = 0; sq < 8 && rainSplash.length < 200; sq++){
      rainSplash.push({ x: x + (Math.random() - 0.5) * 22 * k, y: y, r: k,
                        max: (9 + Math.random() * 22) * k, a: 0.65, tilt: windVel });
    }
  }

  function reset(){ rainInited = false; }
  Can.addResizeHook(reset);

  App.modes.register('rain', { draw: drawRain, paintBG: paintBG, onTap: onTap, reset: reset });

  App.cfg.registerDefaults('rain', {
    drops: 1, fall: 1, wind: 1, gust: 1, source: 'treble', len: 1,
    color: '#5A2130', splash: true, puddle: true, lightning: true,
    boltAt: 0.6, trail: 0.3, bg1: '#B9C7D4', bg2: '#EDE7E3'
  });
  App.cfg.registerSchema({ id: 'rain', label: 'Rain', fields: [
    ['drops', 'Drop count', 'range', 0.2, 2.5, 0.05],
    ['fall', 'Fall speed', 'range', 0.3, 2.5, 0.05],
    ['source', 'Wind follows', 'select', Aud.SOURCES],
    ['wind', 'Wind strength', 'range', 0, 3, 0.05],
    ['gust', 'Beat gusts', 'range', 0, 3, 0.05],
    ['len', 'Streak length', 'range', 0.3, 2.5, 0.05],
    ['splash', 'Splashes', 'bool'],
    ['puddle', 'Standing water', 'bool'],
    ['lightning', 'Lightning', 'bool'],
    ['boltAt', 'Lightning threshold', 'range', 0.2, 1, 0.02],
    ['trail', 'Trail fade', 'range', 0.05, 1, 0.02],
    ['color', 'Drop colour', 'color'],
    ['bg1', 'Sky top', 'color'],
    ['bg2', 'Sky bottom', 'color']
  ]});
  App.cfg.onGroupChange('rain', function(key){
    if (key === 'drops' || key === null) rainInited = false;
  });
})();
