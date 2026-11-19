/* ---------- Fire: sway follows bass by default, blue is rare ----------
   When "Follow theme" is on and the active theme code has a fire of its own
   (look.fire in themes.js), the flames, the hot core and the hearth take
   its colours; a theme with rainbow: true gives every flame its own hue.
   The default theme has none, so it burns in the user's own colours.

   The fire also has a STYLE: where the flames stand and which way they
   point, what the embers are, and what else is drawn. "theme" takes the
   style the active code names (look.fire.style); the rest can be picked by
   hand in the layout bar of the Settings page.
     hearth     a row of flames on the floor (the default)
     fireworks  a low fire; every kick drum bursts a firework in the sky
     cauldron   a narrow fire under a hanging cauldron that glows with the music
     candles    one small flame on each of a row of candles
     sun        a sun rising from the floor, the flames its rays
     pixels     flames built of square blocks, embers of 1s and 0s
     vortex     a ring of flames pointing inward, falling into a dark disc
     aurora     curtains of flame hanging from the top of the picture */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var fireParts = [], fireSparks = [], warmSprites = [], coldSprite = null;
  var spriteKey = '', fireSway = 0, heatShown = 0, flameVals = null, flameState = null;
  var P = null;              // the colours in use this frame (see palette)
  var RAINBOW = 6;           // how many ember colours a rainbow fire has
  var burstCd = 0;
  var ringSpin = 0;          // how far the vortex has turned (advances slowly in a calm passage)
  var calm = 1;              // 0.1 in a quiet passage, 1 in a loud one (follows drive): scales what moves on its own

  // place: where the flames stand (left out = a row on the floor)
  // glyphs: embers are these characters instead of glowing dots
  var STYLES = {
    hearth:    {},
    fireworks: { glyphs: ['✦', '✧'], bursts: true, low: 0.62 },
    cauldron:  { glyphs: ['👻', '✦'], narrow: 0.5, front: 'cauldron' },
    candles:   { glyphs: ['♥'], place: 'candles' },
    sun:       { place: 'sun' },
    pixels:    { glyphs: ['1', '0'], blocks: true },
    vortex:    { place: 'vortex', front: 'hole' },
    aurora:    { glyphs: ['✧'], place: 'aurora' },
    plasma:    { place: 'plasma' }
  };
  var STYLE_IDS = ['theme', 'hearth', 'fireworks', 'cauldron', 'candles', 'sun', 'pixels', 'vortex', 'aurora', 'plasma'];
  function styleId(){
    var id = Cfg.CFG.fire.style;
    if (id === 'theme'){ var th = App.theme.look; id = (th && th.fire && th.fire.style) || 'hearth'; }
    return STYLES[id] ? id : 'hearth';
  }
  // the circle the sun's rays and the vortex's flames stand on
  function ringOf(st, w, h){
    return st.place === 'sun' ? { x: w / 2, y: h * 1.02, r: Math.min(w * 0.2, h * 0.46) }
                              : { x: w / 2, y: h / 2, r: Math.min(w, h) * 0.47 };
  }
  // Where flame number ti of n stands: x, y = its foot, ang = which way it
  // points (0 = up), s and ws = how tall and wide it is against a hearth flame.
  function placeFlame(st, f, w, h, baseY, swayPx){
    var th, rg;
    if (st.place === 'candles') return { x: w * (0.1 + 0.8 * f), y: h * 0.64, ang: 0, s: 0.4, ws: 0.5 };
    if (st.place === 'aurora') return { x: w * (0.05 + 0.9 * f) + swayPx * 2, y: 0, ang: Math.PI, s: 0.95, ws: 1.7 };
    if (st.place === 'sun'){
      rg = ringOf(st, w, h); th = Math.PI * (1.08 + 0.84 * f);
      return { x: rg.x + Math.cos(th) * rg.r, y: rg.y + Math.sin(th) * rg.r, ang: th + Math.PI / 2, s: 0.62, ws: 0.8 };
    }
    if (st.place === 'vortex'){
      rg = ringOf(st, w, h); th = f * 6.283 + ringSpin;
      return { x: rg.x + Math.cos(th) * rg.r, y: rg.y + Math.sin(th) * rg.r, ang: th - Math.PI / 2, s: 0.5, ws: 0.7 };
    }
    return { x: w * 0.5 + (f - 0.5) * w * (0.34 + A.intensity * 0.2) * (st.narrow || 1) + swayPx, y: baseY, ang: 0, s: st.low || 1, ws: st.narrow ? 0.8 : 1 };
  }
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
  // The colours in use: the theme code's fire when "Follow theme" is on and
  // the theme has one, otherwise the user's own. Parsed once per change.
  function palette(){
    var cfg = Cfg.CFG.fire, th = App.theme.look;
    var f = cfg.followTheme && th && th.fire ? th.fire : null;
    var key = f ? 'theme|' + App.theme.current : 'own|' + cfg.warm + cfg.cool;
    if (P && P.key === key) return P;
    P = { key: key, themed: !!f, rainbow: !!(f && f.rainbow),
          warm: U.hexRGB(f ? f.warm : cfg.warm), cool: U.hexRGB(f ? f.cool : cfg.cool),
          bg1: f ? f.bg1 : null, bg2: f ? f.bg2 : null };
    return P;
  }
  // a full-strength colour for a place on the colour wheel (0 to 360)
  function hueRGB(hue){
    var hh = ((hue % 360) + 360) % 360 / 60, x = 1 - Math.abs(hh % 2 - 1);
    var c = hh < 1 ? [1, x, 0] : hh < 2 ? [x, 1, 0] : hh < 3 ? [0, 1, x] : hh < 4 ? [0, x, 1] : hh < 5 ? [x, 0, 1] : [1, 0, x];
    return [Math.round(16 + c[0] * 239), Math.round(16 + c[1] * 239), Math.round(16 + c[2] * 239)];
  }
  // idx 0 = the dim tip, 1 = the body, 2 = the bright base. base: this
  // flame's own colour (rainbow fire), left out = the palette's warm colour
  function fireCol(idx, heat, a, base){
    var warm = base || P.warm, cool = P.cool;
    var tone = [0.62, 1, 1.5][idx];
    var r = U.lerp(warm[0], cool[0], heat) * tone, g = U.lerp(warm[1], cool[1], heat) * tone, b = U.lerp(warm[2], cool[2], heat) * tone;
    return 'rgba(' + Math.min(255, Math.round(r)) + ',' + Math.min(255, Math.round(g)) + ',' + Math.min(255, Math.round(b)) + ',' + a + ')';
  }
  /* Plasma globe (the Tessa code): a glass ball with a bright electrode in
     the middle. Threads of light run from it to the glass, one per slice of
     the sound: a thread is as bright and as restless as its slice is loud.
     A kick makes every thread fatter; a tap pulls threads towards the finger. */
  var plasmaAng = null, plasmaPull = { x: 0, y: 0, t: 0 }, plasmaVals = null, plasmaState = null;
  function drawPlasma(w, h, k, dt, cfg){
    var cx = w / 2, cy = h * 0.46, R = Math.min(w * 0.42, h * 0.4), n = Math.max(5, Math.round(cfg.tongues));
    var i, j;
    if (!plasmaAng || plasmaAng.length !== n){
      plasmaAng = new Float32Array(n);
      for (i = 0; i < n; i++) plasmaAng[i] = i / n * 6.283;
      plasmaVals = new Float32Array(n); plasmaState = new Float32Array(n);
    }
    Aud.bars(plasmaVals, { lo: 45, hi: 9000, scale: 'log', blur: 0.2, state: plasmaState, attack: 40, release: 7 });
    // the stand
    ctx.fillStyle = 'rgba(16,22,40,0.95)';
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.42, cy + R * 0.9);
    ctx.lineTo(cx + R * 0.42, cy + R * 0.9);
    ctx.lineTo(cx + R * 0.6, h);
    ctx.lineTo(cx - R * 0.6, h);
    ctx.closePath();
    ctx.fill();
    // the glass: a soft glow inside that swells with the music
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    glow.addColorStop(0, fireCol(2, 0.5, (0.3 + A.drive * 0.35).toFixed(3)));
    glow.addColorStop(0.5, fireCol(1, 0, (0.1 + A.drive * 0.14).toFixed(3)));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fill();

    plasmaPull.t = Math.max(0, plasmaPull.t - dt);
    var pullAng = Math.atan2(plasmaPull.y - cy, plasmaPull.x - cx);
    var jt = Math.floor(A.t * (2 + 16 * calm)), mo = Cfg.CFG.look.motion;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (i = 0; i < n; i++){
      var v = plasmaVals[i] * calm;
      // each thread wanders round the ball; a touch pulls the nearest ones over
      plasmaAng[i] += (Math.sin(A.t * (0.31 + i * 0.07) + i * 2.1) * 0.5 + (i % 2 ? 0.12 : -0.12)) * dt * mo * (0.06 + A.drive * 1.6) * cfg.sway;
      if (plasmaPull.t > 0){
        var dA = Math.atan2(Math.sin(pullAng - plasmaAng[i]), Math.cos(pullAng - plasmaAng[i]));
        if (Math.abs(dA) < 1.3) plasmaAng[i] += dA * Math.min(1, dt * 5);
      }
      var a = plasmaAng[i], px = -Math.sin(a), py = Math.cos(a);
      var bend = Math.sin(A.t * 0.8 + i * 1.7) * 0.35 * (0.15 + 0.85 * calm);
      var wig = R * 0.05 * cfg.turb * (0.4 + v * 1.6 + A.drive) * calm;
      var width = (0.9 + v * 2.2 + A.kick * 1.8 * calm) * k * cfg.size;
      for (var pass = 0; pass < 2; pass++){
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (j = 1; j <= 14; j++){
          var u = j / 14, env = Math.sin(u * Math.PI);
          var rr = R * 0.985 * u;
          var hx = Math.sin(i * 12.9898 + j * 78.233 + jt * 37.719) * 43758.5453;
          var off = (bend * R * 0.3 + ((hx - Math.floor(hx)) - 0.5) * 2 * wig) * env;
          ctx.lineTo(cx + Math.cos(a) * rr + px * off, cy + Math.sin(a) * rr + py * off);
        }
        if (pass === 0){
          ctx.strokeStyle = fireCol(1, heatShown, (0.14 + v * 0.3).toFixed(3));
          ctx.lineWidth = width * 5;
        } else {
          ctx.strokeStyle = fireCol(2, 0.55 + heatShown * 0.45, (0.5 + v * 0.5).toFixed(3));
          ctx.lineWidth = width;
        }
        ctx.stroke();
      }
      // the bright spot where the thread meets the glass
      var ex = cx + Math.cos(a) * R * 0.985, ey = cy + Math.sin(a) * R * 0.985, er = (5 + v * 12 + A.kick * 6 * calm) * k;
      var sp = ctx.createRadialGradient(ex, ey, 0, ex, ey, er);
      sp.addColorStop(0, fireCol(2, 0.7, (0.5 + v * 0.4).toFixed(3)));
      sp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sp;
      ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    }
    // the electrode
    var er0 = R * (0.09 + A.kick * 0.03 * calm);
    var el = ctx.createRadialGradient(cx, cy, 0, cx, cy, er0 * 2.2);
    el.addColorStop(0, 'rgba(255,255,255,0.95)');
    el.addColorStop(0.35, fireCol(2, 0.6, 0.8));
    el.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = el;
    ctx.fillRect(cx - er0 * 2.2, cy - er0 * 2.2, er0 * 4.4, er0 * 4.4);
    ctx.restore();
    // the glass edge and its highlight
    ctx.strokeStyle = 'rgba(190,220,255,0.3)';
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3 * k;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.9, -2.5, -1.9);
    ctx.stroke();
  }

  function drawFire(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.fire;
    var mo = Cfg.CFG.look.motion;
    calm = 0.1 + 0.9 * Math.min(1, A.drive * 2.2);
    ringSpin += dt * 0.25 * calm;
    palette();
    if (spriteKey !== P.key){
      warmSprites = [];
      if (P.rainbow) for (var si = 0; si < RAINBOW; si++) warmSprites.push(makeGlowSprite(hueRGB(si * 360 / RAINBOW)));
      else warmSprites.push(makeGlowSprite(P.warm));
      coldSprite = makeGlowSprite(P.cool);
      spriteKey = P.key;
    }
    Can.backdrop(cfg.trail);

    // Blue needs a big passage: it follows drive (how loud this part of the
    // song is), so a verse stays orange and only a loud chorus burns blue.
    var hard = A.drive * 0.8 + A.intensity * 0.2;
    var heat = U.clamp01((hard - cfg.blueAt) / cfg.blueRange);
    heatShown = U.env(heatShown, heat, 3, 1.2, dt);
    var coreHeat = heatShown;
    if (styleId() === 'plasma'){ drawPlasma(w, h, k, dt, cfg); return; }
    // The flames themselves only lean toward the hot colour. Halfway between
    // orange and blue is grey, and added light turns grey into white, so the
    // blue is shown by the core at the base and the tongues stay fire-coloured.
    heat = heatShown * FLAME_LEAN;
    // Everything here is added light on top of a picture that keeps
    // (1 - trail) of the last frame, so brightness builds up to 1 / trail of
    // what one frame draws. Scale what is drawn so a busy fire stays under white.
    var expo = Math.min(1, (0.25 + cfg.trail) / 0.55);
    // red, green and blue flames side by side add up to white where they
    // overlap, so a rainbow fire is drawn a little dimmer
    if (P.rainbow) expo *= 0.6;

    fireSway = U.env(fireSway, (Math.sin(A.t * 1.1 * mo) * 0.4 + (Aud.sourceValue(cfg.source) - 0.3) * 1.8), 6, 6, dt);
    var swayPx = fireSway * w * 0.035 * cfg.sway * (0.4 + A.intensity) * (0.25 + 0.75 * calm);
    var baseY = h - 3 * k;
    // idea A: a small fire in a calm passage, a tall one in a loud passage
    var flameH = h * (0.17 + A.level * 0.34 + A.drive * 0.3 + A.punch * 0.14) * cfg.height;

    ctx.globalCompositeOperation = 'lighter';

    // The line of flames is a spectrum of the bass (30 to 800 Hz, the range
    // the studied videos show): the lowest notes burn in the middle, higher
    // ones toward the sides, so a kick drum throws up the centre flames.
    var st = STYLES[styleId()];
    var ring = st.place === 'sun' || st.place === 'vortex';
    var tongues = Math.round(cfg.tongues) * (ring ? 2 : 1), halfT = Math.ceil(tongues / 2);
    if (!flameVals || flameVals.length !== halfT){ flameVals = new Float32Array(halfT); flameState = new Float32Array(halfT); }
    Aud.bars(flameVals, { lo: 30, hi: 800, scale: 'lin', blur: 0.4, state: flameState, attack: 55, release: 8 });
    // each kick makes the air shimmer: the flames wobble sideways for a moment
    var haze = 1 + A.kick * 1.8 * (0.3 + 0.7 * A.drive);

    if (st.place === 'sun'){
      // the sun itself: a glowing half disc the rays stand on
      var sr = ringOf(st, w, h);
      var sg = ctx.createRadialGradient(sr.x, sr.y, sr.r * 0.2, sr.x, sr.y, sr.r * (1.05 + A.kick * 0.06));
      sg.addColorStop(0, fireCol(2, 0, (0.3 * expo).toFixed(3)));
      sg.addColorStop(0.8, fireCol(1, 0, (0.24 * expo).toFixed(3)));
      sg.addColorStop(1, fireCol(0, 0, 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(sr.x, sr.y, sr.r * 1.12, 0, 6.283);
      ctx.fill();
    }

    for (var ti = 0; ti < tongues; ti++){
      var f = tongues === 1 ? 0.5 : (st.place === 'vortex' ? ti / tongues : ti / (tongues - 1));
      var band = flameVals[Math.min(halfT - 1, Math.round(Math.abs(f - 0.5) * 2 * (halfT - 1)))];
      var pl = placeFlame(st, f, w, h, baseY, swayPx);
      var wave = Math.sin(A.t * (2.1 + ti * 0.41) * mo + ti * 1.7) * w * 0.022 * (0.35 + A.intensity * 1.6) * haze * pl.s * calm;
      var hgt = flameH * (0.3 + band * 1.05 * (0.25 + 0.75 * calm)) * (ring ? 1 : 0.8 + Math.sin(f * Math.PI) * 0.36) * pl.s;
      var halfW = w * (0.032 + band * 0.028) * (0.7 + A.level * 0.6) * pl.ws;

      // a rainbow fire: the colour wheel runs across the flames and turns slowly
      var own = P.rainbow ? hueRGB(f * 300 + A.t * 24 * mo) : null;
      // each flame is drawn standing at 0,0 and pointing up, then turned into place
      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.rotate(pl.ang);
      var g = ctx.createLinearGradient(0, 0, 0, -hgt);
      g.addColorStop(0, fireCol(2, heat, ((0.2 + A.level * 0.1) * expo).toFixed(3), own));
      g.addColorStop(0.32, fireCol(1, heat, (0.17 * expo).toFixed(3), own));
      g.addColorStop(1, fireCol(0, heat, 0, own));
      ctx.fillStyle = g;
      if (st.blocks){
        // square blocks: three wide at the foot, one at the tip, a few missing so it flickers
        var cell = Math.max(5 * k, halfW * 0.72), rows = Math.max(2, Math.round(hgt / cell));
        for (var rw = 0; rw < rows; rw++){
          var fr = rw / rows, across = fr < 0.35 ? 3 : (fr < 0.7 ? 2 : 1);
          for (var cl = 0; cl < across; cl++){
            if (Math.sin(A.t * 11 + ti * 7.3 + rw * 3.1 + cl * 5.7) > 0.72 + (1 - fr) * 0.2) continue;
            ctx.fillRect((cl - across / 2) * cell + Math.round(wave * fr / cell) * cell + 1, -(rw + 1) * cell + 1, cell - 2, cell - 2);
          }
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(-halfW, 0);
        ctx.bezierCurveTo(-halfW * 0.95, -hgt * 0.45, wave - halfW * 0.38, -hgt * 0.78, wave, -hgt);
        ctx.bezierCurveTo(wave + halfW * 0.38, -hgt * 0.78, halfW * 0.95, -hgt * 0.45, halfW, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    if (!st.place){
      var bedH = (14 + A.level * 38) * k, bedW = 0.84 * (st.narrow || 1);
      var bed = ctx.createLinearGradient(0, baseY - bedH, 0, baseY + 2 * k);
      bed.addColorStop(0, fireCol(1, heat, 0));
      bed.addColorStop(1, fireCol(2, heat, ((0.14 + A.level * 0.14) * expo).toFixed(3)));
      ctx.fillStyle = bed;
      ctx.fillRect(w * (0.5 - bedW / 2), baseY - bedH, w * bedW, bedH + 2 * k);
    }

    // Fireworks: a kick drum bursts one in the sky, a ring of sparks in one of three colours
    burstCd -= dt;
    if (st.bursts && A.kickHit > 0.3 && A.drive > 0.2 && burstCd <= 0){
      burstCd = 0.28;
      var bx0 = w * (0.12 + Math.random() * 0.76), by0 = h * (0.1 + Math.random() * 0.4);
      var bn = Math.round(16 + A.kickHit * 22), bsp = (90 + A.kickHit * 170 + A.drive * 80) * k * mo;
      var bcol = [P.warm, P.cool, [255, 244, 214]][Math.floor(Math.random() * 3)];
      for (var bq = 0; bq < bn && fireSparks.length < 320; bq++){
        var ba = bq / bn * 6.283, bv = bsp * (0.75 + Math.random() * 0.35);
        fireSparks.push({ x: bx0, y: by0, vx: Math.cos(ba) * bv, vy: Math.sin(ba) * bv, life: 1,
                          decay: (0.8 + Math.random() * 0.5) / cfg.life, heat: 0, light: true, rgb: bcol, big: 1.5 });
      }
    }

    var cap = Math.round(300 * cfg.spawn);
    var spawnF = (A.level * 4 + A.drive * 5 + A.punch * 16 * (0.3 + 0.7 * A.drive)) * cfg.spawn * calm;   // a quiet passage sheds few embers
    var spawn = Math.floor(spawnF) + (Math.random() < spawnF % 1 ? 1 : 0);
    // characters are counted one by one by the eye, so far fewer of them are needed
    if (st.glyphs) spawn = Math.random() < spawn * 0.16 ? 1 + (A.punch > 0.5 ? 1 : 0) : 0;
    for (var s = 0; s < spawn && fireParts.length < cap; s++){
      var spread = w * (0.12 + A.level * 0.2) * (st.narrow || 1);
      var np = {
        x: w * 0.5 + (Math.random() - 0.5) * 2 * spread + swayPx,
        y: h - Math.random() * 8 * k,
        vx: (Math.random() - 0.5) * 26 * k,
        vy: -(70 + Math.random() * 95 + A.level * 230 + A.punch * 260) * k * mo,
        life: 1,
        decay: (0.6 + Math.random() * 0.8) / cfg.life,
        size: (7 + Math.random() * 11 + A.level * 15) * k * cfg.size,
        spin: Math.random() * 6.283,
        heat: heat,
        hi: Math.floor(Math.random() * RAINBOW),
        g: st.glyphs ? st.glyphs[Math.floor(Math.random() * st.glyphs.length)] : null
      };
      if (st.place === 'candles'){
        np.x = w * (0.1 + 0.8 * Math.floor(Math.random() * tongues) / Math.max(1, tongues - 1));
        np.y = h * 0.6; np.vy *= 0.45;
      } else if (st.place === 'aurora'){
        // embers drift down out of the curtains like slow snow
        np.x = w * Math.random(); np.y = h * 0.1 * Math.random(); np.vy = (26 + Math.random() * 40 + A.level * 60) * k * mo; np.free = true;
        np.decay *= 0.6;
      } else if (st.place){
        // off the ring: outward from the sun, inward and round for the vortex
        var rg2 = ringOf(st, w, h), ea = st.place === 'sun' ? Math.PI * (1.05 + 0.9 * Math.random()) : Math.random() * 6.283;
        var ev = (50 + Math.random() * 70 + A.level * 160 + A.punch * 120) * k * mo;
        np.x = rg2.x + Math.cos(ea) * rg2.r; np.y = rg2.y + Math.sin(ea) * rg2.r; np.free = true;
        if (st.place === 'sun'){ np.vx = Math.cos(ea) * ev; np.vy = Math.sin(ea) * ev; }
        else { np.vx = -Math.cos(ea) * ev - Math.sin(ea) * ev * 0.7; np.vy = -Math.sin(ea) * ev + Math.cos(ea) * ev * 0.7; np.decay *= 0.8; }
      }
      fireParts.push(np);
    }
    // many overlapping embers add up, so each one is fainter in a crowd
    // "A crowd" is how much of the picture the embers would cover laid side
    // by side, not how many there are: on a phone the canvas is small and
    // the same 300 embers sit four times as thick as on a desktop.
    var emberR = (12.5 + A.level * 15) * k * cfg.size * 0.8;
    var cover = fireParts.length * Math.PI * emberR * emberR / (w * h);
    var crowd = expo / (1 + cover * 3.4);
    for (var i = fireParts.length - 1; i >= 0; i--){
      var p = fireParts[i];
      p.vx += Math.sin(p.y * 0.011 / k + A.t * 3.1 + p.spin) * (70 + A.high * 300) * k * cfg.turb * dt * (p.free ? 0.3 : 1);
      if (!p.free){
        p.vx += fireSway * 26 * k * cfg.sway * dt;
        p.vy -= (12 + A.level * 55) * k * dt;      // hot air rises
        p.vx *= Math.pow(0.28, dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt * (1 + A.high * 0.6);
      if (p.life <= 0 || p.y < -20 * k || p.y > h + 20 * k){ fireParts.splice(i, 1); continue; }

      var r = p.size * (0.35 + p.life * 0.95);
      if (p.g){
        // a character ember: painted, not added light, so a dark emoji shows too
        var gc = P.rainbow ? hueRGB(p.hi * 360 / RAINBOW) : P.warm;
        var gs = Can.glyphSprite(p.g, 'rgb(' + Math.round(U.lerp(gc[0], 255, 0.35)) + ',' + Math.round(U.lerp(gc[1], 255, 0.35)) + ',' + Math.round(U.lerp(gc[2], 255, 0.35)) + ')');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, p.life * 1.6) * Math.min(1, (1 - p.life) * 6 + 0.25) * 0.9;
        var gr = p.size * 0.62 * (0.8 + A.punch * 0.25);
        ctx.drawImage(gs, p.x - gr, p.y - gr, gr * 2, gr * 2);
        ctx.globalCompositeOperation = 'lighter';
        continue;
      }
      var a = p.life * p.life * 0.85 * crowd;
      if (p.heat < 0.98){
        ctx.globalAlpha = a * (1 - p.heat);
        ctx.drawImage(warmSprites[(p.hi || 0) % warmSprites.length], p.x - r, p.y - r, r * 2, r * 2);
      }
      if (p.heat > 0.02){
        ctx.globalAlpha = a * p.heat;
        ctx.drawImage(coldSprite, p.x - r, p.y - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;

    if (cfg.sparks && !st.place && A.beat && A.beatStrength > 0.18){
      var n = Math.round((3 + A.beatStrength * 20) * cfg.sparkAmt * calm);
      for (var q = 0; q < n && fireSparks.length < 220; q++){
        fireSparks.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.3 * (st.narrow || 1) + swayPx,
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
    if (cfg.hatEmbers && !st.place && A.hatHit > 0.25 && A.drive > 0.08){
      var hn = Math.round((1 + A.hatHit * 5) * cfg.sparkAmt);
      for (var hq = 0; hq < hn && fireSparks.length < 240; hq++){
        fireSparks.push({
          x: w * 0.5 + (Math.random() - 0.5) * w * 0.5 * (st.narrow || 1) + swayPx,
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
      ctx.fillStyle = sk.rgb ? U.rgba(sk.rgb, (sk.life * flick).toFixed(3)) : fireCol(2, sk.heat, (sk.life * flick).toFixed(3));
      ctx.beginPath();
      ctx.arc(sk.x, sk.y, (0.9 + sk.life * 1.5) * k * (sk.big || 1), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';

    // The blue core: a hot heart at the base that only shows in a loud
    // passage. Painted last and as paint, not added light: added to a base
    // that is already bright it would only make white.
    if (coreHeat > 0.02 && !st.place){
      var coreH = flameH * (0.36 + A.kick * 0.1), coreW = w * (0.15 + A.level * 0.07);
      var ccx = w * 0.5 + swayPx;
      var core = ctx.createRadialGradient(ccx, baseY, 0, ccx, baseY, coreH);
      var coolRGB = P.cool;
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

    if (st.front === 'cauldron'){
      // a cauldron hanging over the fire; what is in it glows with the music
      var cx0 = w / 2, cy0 = h * 0.46, crx = Math.min(w * 0.13, h * 0.36), cry = crx * 0.74;
      ctx.strokeStyle = 'rgba(8,5,10,0.95)';
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(cx0 - crx * 0.9, cy0 - cry * 0.5); ctx.lineTo(cx0 - crx * 0.35, 0);
      ctx.moveTo(cx0 + crx * 0.9, cy0 - cry * 0.5); ctx.lineTo(cx0 + crx * 0.35, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgb(9,6,12)';
      ctx.beginPath();
      ctx.ellipse(cx0, cy0, crx, cry, 0, 0, 6.283);
      ctx.fill();
      ctx.fillRect(cx0 - crx * 1.06, cy0 - cry * 0.62, crx * 2.12, cry * 0.2);
      ctx.strokeStyle = tint(1, 0.35, 0.2);
      ctx.lineWidth = 1.2 * k;
      ctx.beginPath();
      ctx.ellipse(cx0, cy0, crx, cry, 0, 0.25, Math.PI - 0.25);
      ctx.stroke();
      var brew = ctx.createRadialGradient(cx0, cy0 - cry * 0.56, 0, cx0, cy0 - cry * 0.56, crx);
      brew.addColorStop(0, U.rgba(P.cool, (0.45 + A.level * 0.5).toFixed(3)));
      brew.addColorStop(1, U.rgba(P.cool, 0.05));
      ctx.fillStyle = brew;
      ctx.beginPath();
      ctx.ellipse(cx0, cy0 - cry * 0.56, crx * 0.93, cry * (0.16 + A.kick * 0.05), 0, 0, 6.283);
      ctx.fill();
    } else if (st.front === 'hole'){
      // the dark disc the flames fall into, with a thin bright edge that jumps with the kick
      var hr = ringOf(st, w, h), hrad = hr.r * (0.4 + A.kick * 0.03);
      var hole = ctx.createRadialGradient(hr.x, hr.y, hrad * 0.75, hr.x, hr.y, hrad * 1.25);
      hole.addColorStop(0, 'rgba(0,0,0,1)');
      hole.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hole;
      ctx.beginPath();
      ctx.arc(hr.x, hr.y, hrad * 1.25, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = U.rgba(P.cool, (0.3 + A.kick * 0.5 + A.drive * 0.2).toFixed(3));
      ctx.lineWidth = (1 + A.kick * 2) * k;
      ctx.beginPath();
      ctx.arc(hr.x, hr.y, hrad * 0.98, 0, 6.283);
      ctx.stroke();
    }
  }

  // a share of the flame colour, for the hearth: tint(0.47, 0.42) is a dim glow of it
  function tint(strength, alpha, towardWhite){
    var m = P.warm, t = towardWhite || 0;
    return 'rgba(' + Math.round(U.lerp(m[0], 255, t) * strength) + ',' + Math.round(U.lerp(m[1], 255, t) * strength) + ',' +
           Math.round(U.lerp(m[2], 255, t) * strength) + ',' + alpha + ')';
  }
  function bgColors(){
    palette();
    return P.themed ? { bg1: P.bg1, bg2: P.bg2 } : null;
  }
  function paintBG(c, w, h, k){
    palette();
    // a hearth rather than a black rectangle: cave walls, back wall glow,
    // a stone arch and scattered cooling embers, all lit in the flame's colour
    var wall = c.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, w * 0.75);
    wall.addColorStop(0, tint(0.47, 0.42));
    wall.addColorStop(0.45, tint(0.23, 0.3));
    wall.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = wall;
    c.fillRect(0, 0, w, h);
    var st = STYLES[styleId()];
    if (st.place === 'candles'){
      // a row of candles, one under each flame, on a dark shelf
      var nc = Math.round(Cfg.CFG.fire.tongues), cw = Math.max(5 * k, w * 0.026);
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(0, h * 0.93, w, h * 0.07);
      for (var ci = 0; ci < nc; ci++){
        var cxx = w * (0.1 + 0.8 * (nc === 1 ? 0.5 : ci / (nc - 1))), top = h * (0.66 + ((ci * 37) % 5) * 0.012);
        var wax = c.createLinearGradient(cxx - cw / 2, 0, cxx + cw / 2, 0);
        wax.addColorStop(0, tint(0.5, 0.9, 0.75));
        wax.addColorStop(0.5, tint(0.86, 0.95, 0.85));
        wax.addColorStop(1, tint(0.4, 0.9, 0.7));
        c.fillStyle = wax;
        c.fillRect(cxx - cw / 2, top, cw, h * 0.93 - top);
        c.fillStyle = 'rgba(20,12,10,0.9)';
        c.fillRect(cxx - 0.6 * k, top - 5 * k, 1.2 * k, 5 * k);      // the wick
      }
    }
    if (st.place === 'aurora' || st.place === 'vortex' || st.place === 'sun'){
      // open sky instead of a hearth: stars, and for the aurora a line of dark hills
      for (var sx = 0; sx < 70; sx++){
        c.fillStyle = 'rgba(255,255,255,' + (0.12 + (sx % 5) * 0.07).toFixed(2) + ')';
        c.fillRect((sx * 197.3) % w, (sx * 89.7) % (h * (st.place === 'sun' ? 0.6 : 1)), (1 + (sx % 3) * 0.5) * k, (1 + (sx % 3) * 0.5) * k);
      }
      if (st.place === 'aurora'){
        c.fillStyle = 'rgba(4,6,12,0.92)';
        c.beginPath();
        c.moveTo(0, h);
        for (var hx = 0; hx <= 24; hx++) c.lineTo(w * hx / 24, h * (0.86 - 0.07 * Math.abs(Math.sin(hx * 1.7)) - 0.04 * Math.sin(hx * 0.6)));
        c.lineTo(w, h);
        c.closePath();
        c.fill();
      }
    }
    if (st.place) return;                   // the rest is the hearth itself
    for (var br = 0; br < 34; br++){        // brickwork on the back wall
      var bx = (br * 137) % w, by = h * 0.12 + ((br * 71) % Math.round(h * 0.6));
      c.fillStyle = tint(1, 0.028, 0.5);
      c.fillRect(bx, by, w * 0.075, h * 0.05);
    }
    c.strokeStyle = tint(1, 0.07, 0.4);
    c.lineWidth = 2 * k;
    c.beginPath();                          // arch over the fire
    c.moveTo(w * 0.1, h);
    c.quadraticCurveTo(w * 0.5, h * 0.06, w * 0.9, h);
    c.stroke();
    for (var em = 0; em < 60; em++){        // cooling embers on the floor
      var ex = (em * 211) % w, ey = h - ((em * 53) % Math.round(h * 0.16)) - 2 * k;
      c.fillStyle = tint(0.8 + (em % 6) * 0.04, (0.06 + (em % 5) * 0.03).toFixed(3), (em % 6) * 0.06);
      c.beginPath();
      c.arc(ex, ey, (0.8 + (em % 4) * 0.7) * k, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(12,6,8,0.8)';       // hearth stones
    for (var st = 0; st < 11; st++){
      c.beginPath();
      c.ellipse(w * (0.03 + st * 0.095), h - 1 * k, w * 0.052, 8 * k, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = tint(1, 0.12, 0.3);
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
    if (styleId() === 'plasma'){ plasmaPull.x = x; plasmaPull.y = y; plasmaPull.t = 2.5; App.taps.spawnRing(x, y, '#9FE4FF'); return; }
    var k = Can.dpr(), cfg = Cfg.CFG.fire;
    palette();
    App.taps.spawnRing(x, y, P.themed ? 'rgb(' + P.warm.join(',') + ')' : '#FFC46B');
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
                       hi: Math.floor(Math.random() * RAINBOW),
                       heat: U.clamp01((A.intensity - cfg.blueAt) / cfg.blueRange) });
    }
  }

  function reset(){ fireParts = []; fireSparks = []; heatShown = 0; flameState = null; flameVals = null; burstCd = 0; }

  App.modes.register('fire', { draw: drawFire, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset });

  App.cfg.registerDefaults('fire', {
    followTheme: true, style: 'theme', tongues: 9, height: 1, spawn: 1, life: 1, size: 1, sparks: true, hatEmbers: true, sparkAmt: 1,
    blueAt: 0.72, blueRange: 0.2, warm: '#FF7E14', cool: '#3E9CFF',
    sway: 1, turb: 1, trail: 0.3, source: 'bass', bg1: '#170B10', bg2: '#05030A'
  });
  App.cfg.registerSchema({ id: 'fire', label: 'Fire', fields: [
    ['style', 'Style', 'layout', STYLE_IDS],
    ['followTheme', 'Follow theme (flame colours and background)', 'bool'],
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
    ['warm', 'Warm flame colour - when not following a theme', 'color'],
    ['cool', 'Hot core colour - when not following a theme', 'color'],
    ['trail', 'Trail fade', 'range', 0.05, 1, 0.02],
    ['bg1', 'Background top - when not following a theme', 'color'],
    ['bg2', 'Background bottom - when not following a theme', 'color']
  ]});
})();
