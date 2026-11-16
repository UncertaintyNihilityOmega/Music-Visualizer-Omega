/* ---------- Rain: wind follows the treble balance by default ----------
   What falls follows the theme code (look.rain in themes.js):
     shape   'streak' rain | 'snow' flakes | 'glyph' characters or emoji
     color   drop colour, bolt = lightning colour, bg1 / bg2 = the sky
     fall    speed against rain (snow 0.3), glyphs = what a 'glyph' drop is
     up      true = everything rises instead of falling
     rainbow true = each drop takes its hue from where it is
   "Follow theme" off = plain rain in the user's own colours. */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var rainDrops = [], rainSplash = [], rainInited = false;
  var windVel = 0, gust = 0, boltFlash = 0, bolt = null, puddleH = 0;
  var ambient = 0, activeDrops = 0, boltCd = 0;

  var OWN = { shape: 'streak' };
  function look(){
    var cfg = Cfg.CFG.rain, th = App.theme && App.theme.look;
    if (cfg.followTheme && th && th.rain) return th.rain;
    OWN.color = cfg.color; OWN.bg1 = cfg.bg1; OWN.bg2 = cfg.bg2; OWN.bolt = '#FFFAE1';
    return OWN;
  }
  function bgColors(){ var L = look(); return { bg1: L.bg1, bg2: L.bg2 }; }

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
    ambient = count;
    activeDrops = count * 0.3;
    rainInited = true;
  }
  function drawRain(){
    if (!rainInited) initRain();
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.rain;
    var mo = Cfg.CFG.look.motion;
    var L = look(), shape = L.shape || 'streak', slow = L.fall || 1;
    Can.backdrop(shape === 'streak' ? cfg.trail : Math.max(cfg.trail, 0.55));
    // "up": the whole scene is drawn upside down, so drops rise and the water hangs from the top
    if (L.up){ ctx.save(); ctx.translate(0, h); ctx.scale(1, -1); }

    var src = cfg.source === 'treble' ? A.trebleTilt : (Aud.sourceValue(cfg.source) - 0.35);
    var dir = Math.sin(A.t * 0.19 * mo) * 0.4 + src * 2.2;
    var windTarget = dir * (0.25 + A.intensity * 2.2) * cfg.wind;
    if (A.beat) gust += (dir >= 0 ? 1 : -1) * A.beatStrength * 1.7 * cfg.gust;
    gust *= Math.exp(-2.4 * dt);
    windVel += ((windTarget + gust) - windVel) * (1 - Math.exp(-3.2 * dt));

    var fallPx = 330 * k * cfg.fall * mo * slow;
    var windPx = windVel * 240 * k * mo;
    puddleH = cfg.puddle ? U.env(puddleH, (4 + A.intensity * 22) * k, 1.4, 0.5, dt) : 0;

    // Idea A: how hard it rains follows how big the passage is. A calm
    // verse is a drizzle (a fifth of the drops), a loud chorus a downpour.
    // Drops from a tap sit at the end of the list and always fall.
    var share = cfg.follow ? 0.18 + 0.82 * A.drive : 1;
    activeDrops = U.env(activeDrops, ambient * share, 1.6, 0.7, dt);
    var activeN = Math.min(ambient, Math.round(activeDrops));

    // Kick drum: rings spread across the standing water, as wide as the kick is hard
    if (cfg.puddle && cfg.splash && A.kickHit > 0.3 && A.drive > 0.1){
      var rings = 1 + Math.round(A.kickHit * 3);
      for (var kr = 0; kr < rings && rainSplash.length < 160; kr++){
        rainSplash.push({ x: Math.random() * w, y: h - puddleH * (0.2 + Math.random() * 0.5), r: k,
                          max: (16 + A.kickHit * 46) * k * (0.5 + A.drive), a: 0.55 + A.kickHit * 0.3, tilt: windVel });
      }
      puddleH += A.kickHit * 5 * k;
    }

    var drop = U.hexRGB(L.color);
    var sprites = null;
    if (shape === 'glyph'){
      sprites = [];
      for (var gi = 0; gi < L.glyphs.length; gi++) sprites.push(Can.glyphSprite(L.glyphs[gi], L.color));
    }
    ctx.lineCap = 'round';
    for (var i = 0; i < rainDrops.length; i++){
      var d = rainDrops[i];
      if (!d.tap){
        if (i >= activeN){ d.idle = true; continue; }
        if (d.idle){ d.idle = false; d.y = -Math.random() * h * 0.4; d.x = Math.random() * w; }   // comes back in from the top
      }
      var vy = fallPx * (0.55 + d.z * 0.75);
      var vx = windPx * (1.45 - d.z * 0.7);
      d.x += vx * dt;
      d.y += vy * dt;

      if (shape === 'snow'){
        // flakes drift from side to side as they come down
        d.x += Math.sin(A.t * 1.3 + i * 1.7) * 16 * k * dt;
        ctx.fillStyle = U.rgba(drop, (0.3 + d.z * 0.6).toFixed(3));
        ctx.beginPath();
        ctx.arc(d.x, d.y, (0.9 + d.z * 2.4) * k * cfg.len, 0, 6.283);
        ctx.fill();
      } else if (shape === 'glyph'){
        if (i % 2 === 0 || d.tap){
          var gs = (9 + d.z * 13) * k * cfg.len;
          ctx.globalAlpha = 0.3 + d.z * 0.65;
          if (L.spin){
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(Math.sin(A.t * 1.1 + i) * 0.7 + (L.up ? Math.PI : 0));
            ctx.drawImage(sprites[i % sprites.length], -gs / 2, -gs / 2, gs, gs);
            ctx.restore();
          } else {
            ctx.drawImage(sprites[(i + Math.floor(A.t * 3 + i * 0.37)) % sprites.length], d.x - gs / 2, d.y - gs / 2, gs, gs);
          }
          ctx.globalAlpha = 1;
        }
      } else {
        var sp = Math.sqrt(vx * vx + vy * vy) || 1;
        var SL = (5 + d.len * 13) * k * cfg.len * (0.6 + sp / (620 * k));
        var nx = vx / sp, ny = vy / sp;
        ctx.strokeStyle = L.rainbow ? 'hsla(' + Math.round(d.x / w * 300 + A.t * 20) % 360 + ',85%,55%,' + (0.25 + d.z * 0.5).toFixed(3) + ')'
                                    : U.rgba(drop, (0.12 + d.z * 0.38).toFixed(3));
        ctx.lineWidth = (0.6 + d.z * 1.5) * k;
        ctx.beginPath();
        ctx.moveTo(d.x - nx * SL, d.y - ny * SL);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      if (d.y > h - puddleH * 0.35){
        if (d.tap){
          if (cfg.splash && rainSplash.length < 140){
            rainSplash.push({ x: d.x, y: h - puddleH * 0.35, r: k, max: 18 * k, a: 0.8, tilt: windVel });
          }
          rainDrops.splice(i, 1);
          i--;
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

    // Lightning strikes on a hard snare in a loud passage (a crack of sound
    // for a crack of light), a few seconds apart at most, and the thunder
    // shakes the picture.
    boltCd -= dt;
    if (cfg.lightning && A.snareHit > cfg.boltAt && A.drive > 0.5 && boltCd <= 0){
      boltCd = 1.6 + Math.random() * 2.4;
      App.fx.jolt(0.5 + A.snareHit * 0.6);
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
      var bc = U.hexRGB(L.bolt || '#FFFAE1');
      ctx.fillStyle = U.rgba(bc, (boltFlash * 0.32).toFixed(3));
      ctx.fillRect(0, 0, w, h);
      if (bolt && bolt.length >= 4){
        ctx.strokeStyle = U.rgba(bc, (boltFlash * 0.95).toFixed(3));
        ctx.shadowColor = L.bolt || '#FFFAE1';
        ctx.shadowBlur = 12 * k * Cfg.CFG.look.glow;
        ctx.lineWidth = 2.2 * k;
        ctx.beginPath();
        ctx.moveTo(bolt[0], bolt[1]);
        for (var bi = 2; bi < bolt.length; bi += 2) ctx.lineTo(bolt[bi], bolt[bi + 1]);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    if (L.up) ctx.restore();
  }

  function paintBG(c, w, h, k){
    // overcast bands + a distant skyline so the drops have depth to fall past
    var L = look(), sky = U.hexRGB(L.bg1), darkSky = sky[0] + sky[1] + sky[2] < 300;
    for (var cl = 0; cl < 7; cl++){
      var cy = h * (0.05 + cl * 0.055), cw = w * (0.3 + (cl % 3) * 0.22);
      c.fillStyle = darkSky ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.10)';
      c.beginPath();
      c.ellipse((cl * 197) % w, cy, cw, h * 0.05, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = darkSky ? 'rgba(0,0,0,0.42)' : 'rgba(70,58,66,0.16)';
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
    App.taps.spawnRing(x, y, look().color);
    if (look().up) y = canvas.height - y;      // the scene is drawn upside down
    rainDrops.push({ x: x, y: y, z: 0.95, len: 1.25, tap: true });
    for (var sq = 0; sq < 8 && rainSplash.length < 200; sq++){
      rainSplash.push({ x: x + (Math.random() - 0.5) * 22 * k, y: y, r: k,
                        max: (9 + Math.random() * 22) * k, a: 0.65, tilt: windVel });
    }
  }

  function reset(){ rainInited = false; }
  Can.addResizeHook(reset);

  App.modes.register('rain', { draw: drawRain, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset, fx: 0.6 });

  App.cfg.registerDefaults('rain', {
    followTheme: true, drops: 1, follow: true, fall: 1, wind: 1, gust: 1, source: 'treble', len: 1,
    color: '#5A2130', splash: true, puddle: true, lightning: true,
    boltAt: 0.6, trail: 0.3, bg1: '#B9C7D4', bg2: '#EDE7E3'
  });
  App.cfg.registerSchema({ id: 'rain', label: 'Rain', fields: [
    ['followTheme', 'Follow theme (what falls, colours and sky)', 'bool'],
    ['drops', 'Drop count (in a downpour)', 'range', 0.2, 2.5, 0.05],
    ['follow', 'Drizzle when calm, downpour when loud', 'bool'],
    ['fall', 'Fall speed', 'range', 0.3, 2.5, 0.05],
    ['source', 'Wind follows', 'select', Aud.SOURCES],
    ['wind', 'Wind strength', 'range', 0, 3, 0.05],
    ['gust', 'Beat gusts', 'range', 0, 3, 0.05],
    ['len', 'Streak length', 'range', 0.3, 2.5, 0.05],
    ['splash', 'Splashes', 'bool'],
    ['puddle', 'Standing water', 'bool'],
    ['lightning', 'Lightning on a hard snare', 'bool'],
    ['boltAt', 'Lightning threshold (snare strength)', 'range', 0.2, 1, 0.02],
    ['trail', 'Trail fade', 'range', 0.05, 1, 0.02],
    ['color', 'Drop colour', 'color'],
    ['bg1', 'Sky top', 'color'],
    ['bg2', 'Sky bottom', 'color']
  ]});
  App.cfg.onGroupChange('rain', function(key){
    if (key === 'drops' || key === null) rainInited = false;
    if (key === 'followTheme' || key === 'bg1' || key === 'bg2' || key === null) Can.invalidateBG();
  });
})();
