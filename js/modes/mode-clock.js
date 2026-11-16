/* ---------- Clock ----------
   A roman-numeral analog clock driven by the device's real time, restyled
   completely by four "style" skins (Golden/Solarpunk/Cyberpunk/Heaven) that
   each supply a palette, their own decorations, and their own take on
   "the music visualizer" as an ambient particle system. The face + hands
   renderer is shared; only paintFace's palette argument changes per style.

   Interlocking gears (Golden) rotate at speeds that are actually derived
   from their radii, the way a real gear train works: for two meshed gears,
   angular velocity is inversely proportional to radius and the rotation
   direction alternates. Because that ratio between any two gears in a
   chain never changes, only the ROOT gear's angle needs integrating every
   frame (persistent state); every other gear's angle is just that root
   angle times a fixed constant computed from the radii.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  var THEMES = {
    golden: { pal: {
      accent: '#F0C866', faceCenter: '#3A3122', faceMid: '#241E15', faceEdge: '#100D08', rim: '#C99A3F',
      numeral: '#F0D28A', numeralShadow: 'rgba(0,0,0,0.6)', tick: 'rgba(240,200,102,0.6)',
      hourHand: '#F0D28A', minuteHand: '#E3C06A', secondHand: '#C7CAD3',
      bezelOuter: '#4A3B22', bezelInner: '#8A6A34', bezelHighlight: '#F5DA96', bezelStud: '#F5DA96',
      bg1: '#2C2417', bg2: '#0A0805'
    }},
    solarpunk: { pal: {
      accent: '#FFC857', faceCenter: '#FBFEF2', faceMid: '#EAF6DE', faceEdge: '#C9E8BC', rim: '#3E7C4C',
      numeral: '#1F5C3D', numeralShadow: 'rgba(31,92,61,0.3)', tick: 'rgba(31,92,61,0.55)',
      hourHand: '#1F5C3D', minuteHand: '#3E7C4C', secondHand: '#E39A2E',
      bezelOuter: '#2F5233', bezelInner: '#4A8A5C', bezelHighlight: '#C8EFD0', bezelStud: '#FFC857',
      bg1: '#EAF7E3', bg2: '#FBF0D2'
    }},
    cyberpunk: { pal: {
      accent: '#FF6FD4', faceCenter: '#1C1030', faceMid: '#130A20', faceEdge: '#04010A', rim: '#28E5FF',
      numeral: '#4FEFFF', numeralShadow: 'rgba(255,46,154,0.55)', tick: 'rgba(255,46,154,0.55)',
      hourHand: '#FF2E9A', minuteHand: '#28E5FF', secondHand: '#FFE94A',
      bezelOuter: '#1A0E2E', bezelInner: '#3D1F5C', bezelHighlight: '#FF9FE4', bezelStud: '#28E5FF',
      bg1: '#0A0714', bg2: '#170A28'
    }},
    heaven: { pal: {
      accent: '#BFE3FF', faceCenter: '#FFFFFF', faceMid: '#EEF7FF', faceEdge: '#CBE6FF', rim: '#8FCFFF',
      numeral: '#4A90C9', numeralShadow: 'rgba(74,144,201,0.25)', tick: 'rgba(143,207,255,0.6)',
      hourHand: '#4A90C9', minuteHand: '#8FCFFF', secondHand: '#F2C879',
      bezelOuter: '#A8CFEE', bezelInner: '#E8F4FF', bezelHighlight: '#FFFFFF', bezelStud: '#F2C879',
      wing: 'rgba(255,255,255,0.92)', wingLine: 'rgba(170,215,255,0.75)',
      bg1: '#DCEEFF', bg2: '#FFFFFF'
    }},
    // The skins below share one decoration (stepOrbit): a ring of sound bars
    // round the face and the theme's own characters drifting past.
    //   decor: glyphs = what drifts, move = 'rise' | 'fall' | 'inward' | 'arc'
    omega: { decor: { glyphs: ['Ω', '✦', '✧'], move: 'rise' }, pal: {
      accent: '#FF5FD2', faceCenter: '#2D1D58', faceMid: '#1A1036', faceEdge: '#0B0618', rim: '#B06BFF',
      numeral: '#EFE9FF', numeralShadow: 'rgba(0,0,0,0.6)', tick: 'rgba(176,107,255,0.65)',
      hourHand: '#EFE9FF', minuteHand: '#C9A6FF', secondHand: '#FF5FD2',
      bezelOuter: '#2B1A55', bezelInner: '#6A45C8', bezelHighlight: '#E2CCFF', bezelStud: '#FF5FD2',
      bg1: '#171033', bg2: '#06040E'
    }},
    newyear: { decor: { glyphs: ['✦', '❄', '✧'], move: 'fall' }, pal: {
      accent: '#F2C55C', faceCenter: '#1B2B63', faceMid: '#101C46', faceEdge: '#060B22', rim: '#F2C55C',
      numeral: '#F8E6B0', numeralShadow: 'rgba(0,0,0,0.6)', tick: 'rgba(143,184,255,0.65)',
      hourHand: '#F8E6B0', minuteHand: '#F2C55C', secondHand: '#8FB8FF',
      bezelOuter: '#16224F', bezelInner: '#8A6A2C', bezelHighlight: '#FFE9A8', bezelStud: '#8FB8FF',
      bg1: '#0D1638', bg2: '#03050F'
    }},
    halloween: { decor: { glyphs: ['🦇', '👻', '🎃'], move: 'rise' }, pal: {
      accent: '#FF7A1A', faceCenter: '#3A1C0C', faceMid: '#22100E', faceEdge: '#0B0508', rim: '#FF7A1A',
      numeral: '#FFB870', numeralShadow: 'rgba(0,0,0,0.7)', tick: 'rgba(155,93,229,0.7)',
      hourHand: '#FFB870', minuteHand: '#FF7A1A', secondHand: '#7CE04A',
      bezelOuter: '#24102B', bezelInner: '#5B2E8A', bezelHighlight: '#C9A0F5', bezelStud: '#FF7A1A',
      bg1: '#1C0F24', bg2: '#050308'
    }},
    love: { decor: { glyphs: ['♥'], move: 'rise' }, pal: {
      accent: '#C2626F', faceCenter: '#FFFFFF', faceMid: '#FDF3EE', faceEdge: '#F3DCD9', rim: '#BD9257',
      numeral: '#6E1E2E', numeralShadow: 'rgba(110,30,46,0.22)', tick: 'rgba(189,146,87,0.7)',
      hourHand: '#6E1E2E', minuteHand: '#9B3A4B', secondHand: '#C2626F',
      bezelOuter: '#BD9257', bezelInner: '#E6C99A', bezelHighlight: '#FFF6E2', bezelStud: '#C2626F',
      bg1: '#FFF8F3', bg2: '#F1D8D5'
    }},
    nihilum: { decor: { glyphs: ['●', '·'], move: 'inward' }, pal: {
      accent: '#FF9A4A', faceCenter: '#000000', faceMid: '#030204', faceEdge: '#0B0810', rim: '#FF9A4A',
      numeral: '#D9D4E2', numeralShadow: 'rgba(255,154,74,0.4)', tick: 'rgba(142,124,168,0.6)',
      hourHand: '#D9D4E2', minuteHand: '#8E7CA8', secondHand: '#FF9A4A',
      bezelOuter: '#08060B', bezelInner: '#3B2A14', bezelHighlight: '#FFD9A8', bezelStud: '#FF9A4A',
      bg1: '#06040A', bg2: '#000000'
    }}
  };

  /* ---------- the shared decoration of the theme skins ---------- */
  var orbit = [];
  function spawnOrbit(w, h, cx, cy, R, dec, x, y){
    var p = { g: Math.floor(Math.random() * dec.glyphs.length), age: 0, life: 4 + Math.random() * 4,
              size: 0.7 + Math.random() * 0.9, ph: Math.random() * 6.283, rot: (Math.random() - 0.5) * 0.6 };
    if (dec.move === 'inward'){
      p.a = Math.random() * 6.283; p.r = R * (2.2 + Math.random() * 1.2);
    } else {
      p.x = x !== undefined ? x : Math.random() * w;
      p.y = y !== undefined ? y : (dec.move === 'fall' ? -0.05 * h : 1.05 * h);
    }
    orbit.push(p);
  }
  function stepOrbit(w, h, cx, cy, R, k, dt, cfg, pal, dec){
    // ring of sound bars: bass at the top, treble at the bottom, the same on both sides
    var bands = [A.sub, A.bass, A.lowMid, A.mid, A.high, A.air], N = 72;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5 * k, R * 0.03);
    for (var i = 0; i < N; i++){
      var half = i < N / 2 ? i / (N / 2) : (N - i) / (N / 2);        // 0 at the top, 1 at the bottom
      var bf = half * (bands.length - 1), b0 = Math.floor(bf), b1 = Math.min(bands.length - 1, b0 + 1);
      var v = bands[b0] + (bands[b1] - bands[b0]) * (bf - b0);
      v = v * (0.75 + 0.25 * Math.sin(i * 2.4 + A.t * 3));
      var ang = -Math.PI / 2 + i / N * 6.283, r0 = R * 1.2, r1 = r0 + R * (0.03 + v * 0.5);
      ctx.strokeStyle = i % 2 ? pal.rim : pal.accent;
      ctx.globalAlpha = 0.25 + v * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }
    ctx.restore();

    // the theme's characters: few when calm, many when the music is big; a hi-hat adds one
    var max = Math.round((8 + A.drive * 34) * cfg.density);
    if (orbit.length < max && Math.random() < (0.6 + A.drive * 9) * dt * cfg.density) spawnOrbit(w, h, cx, cy, R, dec);
    if (A.hatHit > 0.35 && orbit.length < max + 6) spawnOrbit(w, h, cx, cy, R, dec);
    var speed = (16 + A.drive * 60) * k * cfg.handSpeed;
    for (var j = orbit.length - 1; j >= 0; j--){
      var p = orbit[j];
      p.age += dt;
      var x, y;
      if (dec.move === 'inward'){
        p.r -= speed * 0.9 * dt * (1 + (R * 2.5) / Math.max(R, p.r));
        p.a += dt * (0.5 + R / Math.max(R * 0.5, p.r));
        x = cx + Math.cos(p.a) * p.r; y = cy + Math.sin(p.a) * p.r * 0.82;
        if (p.r < R * 1.02){ orbit.splice(j, 1); continue; }
      } else {
        p.y += (dec.move === 'fall' ? 1 : -1) * speed * (0.5 + p.size * 0.5) * dt;
        p.x += Math.sin(A.t * 0.9 + p.ph) * 14 * k * dt;
        x = p.x; y = p.y;
        if (y < -0.1 * h || y > 1.1 * h){ orbit.splice(j, 1); continue; }
      }
      if (p.age > p.life * 3){ orbit.splice(j, 1); continue; }
      var s = (12 + 12 * p.size) * k * (1 + A.kick * 0.35);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.age * 1.5) * (0.35 + 0.4 * p.size * 0.6) * (0.6 + cfg.glow * 0.4);
      ctx.translate(x, y);
      ctx.rotate(p.rot + Math.sin(A.t + p.ph) * 0.25);
      ctx.drawImage(Can.glyphSprite(dec.glyphs[p.g], pal.accent), -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
  // which of the four skins is on: the user's pick, or with "theme" the one
  // the active theme code asks for (look.clock in themes.js)
  function styleId(){
    var s = Cfg.CFG.clock.style;
    if (s === 'theme') s = (App.theme.look && App.theme.look.clock) || 'omega';
    return THEMES[s] ? s : 'golden';
  }
  function theme(){ return THEMES[styleId()]; }

  // kick drum: the second hand jumps forward a little and settles back
  var tickKick = 0;
  // chimes of light: rings that leave the clock when the music swells
  var chimes = [], driveSlow = 0, chimeCd = 0;
  function stepChimes(cx, cy, R, pal, k, dt){
    driveSlow = U.env(driveSlow, A.drive, 0.45, 0.9, dt);
    chimeCd -= dt;
    if (Cfg.CFG.clock.chimes && A.drive - driveSlow > 0.16 && chimeCd <= 0 && chimes.length < 4){
      chimes.push({ age: 0, life: 1.6 });
      chimeCd = 1.4;
    }
    for (var i = chimes.length - 1; i >= 0; i--){
      var c = chimes[i];
      c.age += dt;
      if (c.age > c.life){ chimes.splice(i, 1); continue; }
      var f = c.age / c.life, rad = R * (1.2 + f * 1.9);
      ctx.save();
      ctx.strokeStyle = pal.accent;
      ctx.shadowColor = pal.accent;
      ctx.shadowBlur = 14 * k * Cfg.CFG.clock.glow;
      ctx.globalAlpha = (1 - f) * 0.55;
      ctx.lineWidth = (3 * (1 - f) + 0.6) * k;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, 6.283);
      ctx.stroke();
      // twelve short rays, one per hour, riding the ring outward
      ctx.lineWidth = 1.4 * k;
      ctx.beginPath();
      for (var r = 0; r < 12; r++){
        var a = r / 12 * 6.283;
        ctx.moveTo(cx + Math.cos(a) * rad * 0.94, cy + Math.sin(a) * rad * 0.94);
        ctx.lineTo(cx + Math.cos(a) * rad * 1.06, cy + Math.sin(a) * rad * 1.06);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- shared face + hands: a beveled bezel, an embossed dial, and
     properly tapered counterweighted hands, all reskinned per palette ---------- */
  function drawFace(cx, cy, R, pal, cfg, k){
    var now = new Date();
    var secF = now.getSeconds() + now.getMilliseconds() / 1000;
    var minF = now.getMinutes() + secF / 60;
    var hourF = (now.getHours() % 12) + minF / 60;

    // ambient drop shadow lifts the whole clock off the background
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = R * 0.26;
    ctx.shadowOffsetY = R * 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.14, 0, 6.283);
    ctx.fillStyle = pal.bezelOuter;
    ctx.fill();
    ctx.restore();

    // audio-reactive glow, just outside the bezel
    ctx.save();
    ctx.strokeStyle = pal.accent;
    ctx.globalAlpha = 0.3 + A.level * 0.45;
    ctx.lineWidth = (2 + A.punch * 5) * k * (0.4 + cfg.glow);
    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = (6 + A.punch * 24) * cfg.glow * k;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.19, 0, 6.283);
    ctx.stroke();
    ctx.restore();

    // beveled metal bezel ring with a sweeping highlight, plus hour studs
    var bezel = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.14);
    bezel.addColorStop(0, pal.bezelInner);
    bezel.addColorStop(0.55, pal.bezelHighlight);
    bezel.addColorStop(1, pal.bezelOuter);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.14, 0, 6.283);
    ctx.arc(cx, cy, R * 0.99, 0, 6.283, true);
    ctx.fillStyle = bezel;
    ctx.fill();
    for (var bs = 0; bs < 12; bs++){
      var bsa = (bs / 12) * 6.283 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(bsa) * R * 1.065, cy + Math.sin(bsa) * R * 1.065, Math.max(1 * k, R * 0.014), 0, 6.283);
      ctx.fillStyle = pal.bezelStud;
      ctx.fill();
    }

    // dial plate: a richer 3-stop gradient plus a faint engraved sunburst
    var face = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    face.addColorStop(0, pal.faceCenter);
    face.addColorStop(0.68, pal.faceMid || pal.faceCenter);
    face.addColorStop(1, pal.faceEdge);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.99, 0, 6.283);
    ctx.fillStyle = face;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.99, 0, 6.283);
    ctx.clip();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = pal.numeral;
    ctx.lineWidth = Math.max(1 * k, R * 0.006);
    for (var sb = 0; sb < 48; sb++){
      var sba = (sb / 48) * 6.283;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sba) * R * 1.1, cy + Math.sin(sba) * R * 1.1);
      ctx.stroke();
    }
    // inner shadow near the rim, for depth
    var innerShadow = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 0.99);
    innerShadow.addColorStop(0, 'rgba(0,0,0,0)');
    innerShadow.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = innerShadow;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var mm = 0; mm < 60; mm++){
      var ma = (mm / 60) * 6.283 - Math.PI / 2;
      var major = mm % 5 === 0;
      var r1 = R * (major ? 0.85 : 0.91), r2 = R * 0.955;
      ctx.strokeStyle = pal.tick;
      ctx.lineWidth = Math.max(1 * k, R * (major ? 0.017 : 0.006));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ma) * r1, cy + Math.sin(ma) * r1);
      ctx.lineTo(cx + Math.cos(ma) * r2, cy + Math.sin(ma) * r2);
      ctx.stroke();
    }
    var numFont = 'bold ' + Math.max(10, Math.round(R * 0.16)) + 'px "Playfair Display", Georgia, serif';
    for (var i = 0; i < 12; i++){
      var a = (i / 12) * 6.283 - Math.PI / 2;
      var nx = cx + Math.cos(a) * R * 0.7, ny = cy + Math.sin(a) * R * 0.7;
      ctx.font = numFont;
      ctx.fillStyle = pal.numeralShadow;
      ctx.fillText(ROMAN[i], nx + R * 0.014, ny + R * 0.016);
      ctx.fillStyle = pal.numeral;
      ctx.fillText(ROMAN[i], nx, ny);
    }

    // hour/minute hands: a tapered diamond-tipped shape with a short
    // counterweight tail, the way a real clock hand is cut
    function hand(frac, lenMul, widMul, color, tailMul){
      var a2 = frac * 6.283 - Math.PI / 2;
      var len = R * lenMul, wid = Math.max(1.6 * k, R * widMul), tail = R * tailMul;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a2);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = R * 0.02;
      ctx.shadowOffsetX = R * 0.012;
      ctx.shadowOffsetY = R * 0.012;
      ctx.beginPath();
      ctx.moveTo(-tail, wid * 0.55);
      ctx.lineTo(len * 0.7, wid * 0.55);
      ctx.lineTo(len, 0);
      ctx.lineTo(len * 0.7, -wid * 0.55);
      ctx.lineTo(-tail, -wid * 0.55);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    hand(hourF / 12, 0.46, 0.05, pal.hourHand, 0.14);
    hand(minF / 60, 0.68, 0.034, pal.minuteHand, 0.16);

    // second hand: a thin sweep with a small counter-circle tail
    if (cfg.kickTick && A.kickHit > 0.3 && A.drive > 0.1) tickKick = Math.max(tickKick, 0.4 + A.kickHit * 0.6);
    tickKick *= Math.exp(-9 * A.dt);
    var a3 = (secF / 60) * 6.283 - Math.PI / 2 + tickKick * 0.085;
    ctx.save();
    ctx.strokeStyle = pal.secondHand;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1 * k, R * 0.011);
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a3) * R * 0.16, cy - Math.sin(a3) * R * 0.16);
    ctx.lineTo(cx + Math.cos(a3) * R * 0.8, cy + Math.sin(a3) * R * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - Math.cos(a3) * R * 0.12, cy - Math.sin(a3) * R * 0.12, R * 0.026, 0, 6.283);
    ctx.fillStyle = pal.secondHand;
    ctx.fill();
    ctx.restore();

    // centre hub: a small layered jewel with a bright highlight fleck
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3 * k, R * 0.058), 0, 6.283);
    ctx.fillStyle = pal.rim;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2 * k, R * 0.036), 0, 6.283);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - R * 0.012, cy - R * 0.012, Math.max(1 * k, R * 0.013), 0, 6.283);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
  }

  /* ---------- Golden: interlocking gears + a bed of sand ---------- */
  // Four corner clusters (two large, two small) frame the face without
  // crowding it, since the face itself sits centred with a radius well
  // under 0.4 of the canvas's short side.
  var GEAR_CLUSTERS = [
    [
      { cx: 0.11, cy: 0.15, r: 0.125, teeth: 14 },
      { rel: 0, ang: 2.4, r: 0.075, teeth: 8 },
      { rel: 1, ang: -0.5, r: 0.09, teeth: 10 },
      { rel: 0, ang: 0.65, r: 0.06, teeth: 6 }
    ],
    [
      { cx: 0.89, cy: 0.87, r: 0.105, teeth: 12 },
      { rel: 0, ang: -1.0, r: 0.065, teeth: 6 },
      { rel: 1, ang: 2.1, r: 0.08, teeth: 9 }
    ],
    [
      { cx: 0.92, cy: 0.14, r: 0.07, teeth: 8 },
      { rel: 0, ang: 2.6, r: 0.05, teeth: 6 }
    ],
    [
      { cx: 0.09, cy: 0.88, r: 0.065, teeth: 7 },
      { rel: 0, ang: 0.9, r: 0.045, teeth: 5 }
    ]
  ];
  var gearMasterAngle = [0, 0, 0, 0];
  function layoutCluster(cluster, w, h){
    var m = Math.min(w, h), out = [];
    for (var i = 0; i < cluster.length; i++){
      var def = cluster[i], g = { r: def.r * m, teeth: def.teeth };
      if (def.cx !== undefined){ g.x = def.cx * w; g.y = def.cy * h; }
      else {
        var p = out[def.rel], d = p.r + g.r;
        g.x = p.x + Math.cos(def.ang) * d;
        g.y = p.y + Math.sin(def.ang) * d;
      }
      out.push(g);
    }
    return out;
  }
  function ratiosFor(cluster, laid){
    var out = [1];
    for (var i = 1; i < cluster.length; i++){
      var def = cluster[i];
      out.push(out[def.rel] * -(laid[def.rel].r / laid[i].r));
    }
    return out;
  }
  function drawGear(x, y, r, teeth, angle, pal, k){
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = r * 0.18;
    ctx.shadowOffsetX = r * 0.05;
    ctx.shadowOffsetY = r * 0.05;
    ctx.rotate(angle);
    var body = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    body.addColorStop(0, '#9A9DA6');
    body.addColorStop(0.55, '#6E7179');
    body.addColorStop(1, '#454750');
    ctx.fillStyle = body;
    for (var i = 0; i < teeth; i++){
      ctx.save();
      ctx.rotate((i / teeth) * 6.283);
      ctx.fillRect(r * 0.86, -r * 0.13, r * 0.28, r * 0.26);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, 6.283);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = Math.max(1 * k, r * 0.05);
    ctx.stroke();
    // bright rim highlight, upper-left, for a lit-metal look
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(0.8 * k, r * 0.025);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, Math.PI * 1.05, Math.PI * 1.7);
    ctx.stroke();
    for (var s = 0; s < 5; s++){
      var sa = (s / 5) * 6.283;
      ctx.strokeStyle = pal.rim;
      ctx.lineWidth = Math.max(1 * k, r * 0.05);
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * r * 0.22, Math.sin(sa) * r * 0.22);
      ctx.lineTo(Math.cos(sa) * r * 0.66, Math.sin(sa) * r * 0.66);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, 6.283);
    ctx.fillStyle = 'rgba(21,17,11,0.9)';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-r * 0.06, -r * 0.06, r * 0.06, 0, 6.283);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.restore();
  }
  function stepGears(w, h, k, dt, cfg, pal){
    for (var ci = 0; ci < GEAR_CLUSTERS.length; ci++){
      var cluster = GEAR_CLUSTERS[ci];
      var laid = layoutCluster(cluster, w, h);
      var ratios = ratiosFor(cluster, laid);
      var masterOmega = (ci % 2 === 0 ? 1 : -1) * (0.32 + ci * 0.05) * cfg.handSpeed * (1 + A.level * 0.7 + A.punch * 0.5);
      gearMasterAngle[ci] += masterOmega * dt;
      for (var i = 0; i < laid.length; i++){
        drawGear(laid[i].x, laid[i].y, laid[i].r, cluster[i].teeth, gearMasterAngle[ci] * ratios[i], pal, k);
      }
    }
  }
  // A warm glow low in the frame, so the sand pile reads as lit rather
  // than floating on flat black, plus fine radiating engraved arcs that
  // fill the empty space between the gears and the face with texture.
  function paintGoldenAmbience(w, h, k){
    var glow = ctx.createRadialGradient(w / 2, h * 0.98, 0, w / 2, h * 0.98, w * 0.6);
    glow.addColorStop(0, 'rgba(240,200,102,0.16)');
    glow.addColorStop(1, 'rgba(240,200,102,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(240,200,102,0.05)';
    ctx.lineWidth = Math.max(1 * k, w * 0.0015);
    for (var i = 0; i < 3; i++){
      var r = w * (0.5 + i * 0.16);
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.98, r, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
  }
  var SAND_N = 320, sand = [], sandReady = false;
  function ensureSand(){
    if (sandReady) return;
    sand = [];
    for (var i = 0; i < SAND_N; i++){
      sand.push({ bandF: Math.random(), stack: Math.random(), jitterPhase: Math.random() * 6.283,
                  y: 0, vy: 0, size: 1.3 + Math.random() * 2.1, tone: Math.random() });
    }
    sandReady = true;
  }
  function stepSand(w, h, k, dt, cfg){
    ensureSand();
    var baseY = h - 3 * k;
    for (var i = 0; i < sand.length; i++){
      var g = sand[i];
      var v = Aud.specAt(g.bandF);
      var pileH = (10 + v * h * 0.26) * cfg.density;
      var targetY = baseY - g.stack * pileH;
      if (!g.y) g.y = targetY;
      g.vy += 150 * k * dt;
      g.y += g.vy * dt;
      if (g.y > targetY){ g.y = targetY; g.vy = 0; }
      if (A.beat && Math.random() < 0.02 * cfg.density) g.vy -= (50 + Math.random() * 90) * k;
      var x = g.bandF * w + Math.sin(A.t * 1.4 * cfg.handSpeed + g.jitterPhase) * 3 * k;
      ctx.globalAlpha = 0.55 + v * 0.4;
      ctx.fillStyle = g.tone < 0.5 ? '#C9A66B' : '#E7CE94';
      ctx.beginPath();
      ctx.arc(x, g.y, g.size * k, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Solarpunk: hills + climbing vines + solar glints, leaf/pollen drift ---------- */
  function paintSolarBG(c, w, h){
    c.fillStyle = 'rgba(76,175,109,0.30)';
    c.beginPath();
    c.moveTo(0, h * 0.86);
    c.quadraticCurveTo(w * 0.25, h * 0.7, w * 0.5, h * 0.84);
    c.quadraticCurveTo(w * 0.78, h * 0.95, w, h * 0.8);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
  }
  function stepSolarLive(w, h, k, dt, cfg){
    ctx.strokeStyle = 'rgba(31,92,61,0.55)';
    ctx.lineWidth = Math.max(1.4 * k, w * 0.0035);
    [0, w].forEach(function(edgeX, i){
      var dir = i === 0 ? 1 : -1, x = edgeX, y = h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (var s = 0; s < 7; s++){
        var ny = y - h * 0.11;
        var nx = x + dir * (12 + (s % 3) * 12) * k;
        ctx.quadraticCurveTo(edgeX + dir * 26 * k, y - h * 0.05, nx, ny);
        if (s % 2 === 0){
          ctx.save();
          ctx.fillStyle = 'hsl(' + (95 + s * 6) + ',50%,42%)';
          ctx.beginPath();
          ctx.ellipse(nx, ny, 4.5 * k, 2.4 * k, dir * 0.6, 0, 6.283);
          ctx.fill();
          ctx.restore();
        }
        x = nx; y = ny;
      }
      ctx.stroke();
    });
    var glint = 0.4 + 0.3 * Math.sin(A.t * 1.6 * cfg.handSpeed);
    for (var p = 0; p < 3; p++){
      ctx.save();
      ctx.translate(w * 0.12 + p * w * 0.045, h * 0.07 + p * h * 0.02);
      ctx.rotate(-0.22);
      ctx.fillStyle = 'rgba(18,38,56,0.55)';
      ctx.fillRect(0, 0, w * 0.048, h * 0.028);
      ctx.strokeStyle = 'rgba(255,200,87,' + glint.toFixed(2) + ')';
      ctx.lineWidth = 1.2 * k;
      ctx.strokeRect(0, 0, w * 0.048, h * 0.028);
      ctx.restore();
    }
  }
  var leafParts = [];
  function spawnLeaf(x, y){
    leafParts.push({ x: x, y: y, vy: -(16 + Math.random() * 34) * Can.dpr(), vx: (Math.random() - 0.5) * 26 * Can.dpr(),
                      ph: Math.random() * 6.283, life: 0, maxLife: 5 + Math.random() * 5,
                      leaf: Math.random() < 0.65, hue: 90 + Math.random() * 44 });
  }
  function stepSolarParticles(w, h, k, dt, cfg){
    if (leafParts.length < 150 && Math.random() < (0.3 + A.level * 1.6) * cfg.density * dt * 10) spawnLeaf(Math.random() * w, h + 6 * k);
    for (var i = leafParts.length - 1; i >= 0; i--){
      var p = leafParts[i];
      p.life += dt;
      if (p.life > p.maxLife || p.y < -10 * k){ leafParts.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(A.t * 1.3 + p.ph) * 14 * k) * dt;
      p.y += p.vy * dt;
      var fade = Math.min(1, p.life / 0.5) * Math.min(1, (p.maxLife - p.life) / 0.7);
      ctx.save();
      ctx.globalAlpha = fade * 0.85;
      ctx.translate(p.x, p.y);
      ctx.rotate(A.t * 0.6 + p.ph);
      if (p.leaf){
        ctx.fillStyle = 'hsl(' + p.hue + ',55%,42%)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4 * k, 2 * k, 0, 0, 6.283);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,213,110,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 1.3 * k, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---------- Cyberpunk: scrolling perspective grid + circuit pulses, glitch particles ---------- */
  var gridScroll = 0;
  function stepCyberLive(w, h, k, dt, cfg){
    gridScroll += dt * 40 * k * cfg.handSpeed;
    var horizon = h * 0.6, vanishX = w / 2;
    ctx.strokeStyle = 'rgba(40,229,255,0.20)';
    ctx.lineWidth = 1 * k;
    for (var i = -7; i <= 7; i++){
      ctx.beginPath();
      ctx.moveTo(vanishX, horizon);
      ctx.lineTo(vanishX + i * w * 0.2, h);
      ctx.stroke();
    }
    var rows = 7;
    for (var j = 0; j < rows; j++){
      var f = ((j + (gridScroll / (h * 0.12)) % 1) / rows);
      var yy = horizon + (h - horizon) * (f * f);
      ctx.globalAlpha = 0.15 + f * 0.35;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    var pulse = 0.5 + 0.5 * Math.sin(A.t * 3 * cfg.handSpeed);
    ctx.strokeStyle = 'rgba(255,46,154,' + (0.18 + pulse * 0.22 + A.punch * 0.3).toFixed(2) + ')';
    ctx.lineWidth = 1.4 * k;
    for (var c = 0; c < 5; c++){
      var sx = (c * 197) % w, sy = h * 0.05 + (c * 83) % (horizon * 0.75);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 42 * k, sy);
      ctx.lineTo(sx + 42 * k, sy + 26 * k);
      ctx.lineTo(sx + 92 * k, sy + 26 * k);
      ctx.stroke();
      ctx.fillStyle = '#28E5FF';
      ctx.beginPath();
      ctx.arc(sx, sy, 2 * k, 0, 6.283);
      ctx.fill();
    }
  }
  var glitches = [];
  function spawnGlitch(x, y){
    glitches.push({ x: x, y: y, w: (6 + Math.random() * 26) * Can.dpr(), h: (2 + Math.random() * 6) * Can.dpr(),
                    life: 0.06 + Math.random() * 0.12, age: 0, col: Math.random() < 0.5 ? '#28E5FF' : '#FF2E9A' });
  }
  function stepCyberParticles(w, h, k, dt, cfg){
    var want = (0.4 + A.level * 3 + (A.beat ? 6 : 0)) * cfg.density * dt * 8;
    while (want > 0 && glitches.length < 130){
      if (Math.random() < Math.min(1, want)) spawnGlitch(Math.random() * w, Math.random() * h);
      want -= 1;
    }
    for (var i = glitches.length - 1; i >= 0; i--){
      var g = glitches[i];
      g.age += dt;
      if (g.age > g.life){ glitches.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - g.age / g.life;
      ctx.fillStyle = g.col;
      ctx.fillRect(g.x, g.y, g.w, g.h);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Heaven: drifting clouds + flapping wings, feather/light-mote drift ---------- */
  var clouds = [], cloudsReady = false;
  function ensureClouds(w, h){
    if (cloudsReady) return;
    clouds = [];
    for (var i = 0; i < 7; i++){
      clouds.push({ x: Math.random() * w, y: h * (0.06 + Math.random() * 0.42), sp: 5 + Math.random() * 11, scale: 0.6 + Math.random() * 1.1 });
    }
    cloudsReady = true;
  }
  function drawCloud(x, y, s, k){
    var r = s * k;
    ctx.beginPath();
    ctx.arc(x, y, 13 * r, 0, 6.283);
    ctx.arc(x + 15 * r, y - 5 * r, 17 * r, 0, 6.283);
    ctx.arc(x + 32 * r, y, 13 * r, 0, 6.283);
    ctx.arc(x + 15 * r, y + 6 * r, 15 * r, 0, 6.283);
    ctx.fill();
  }
  function stepClouds(w, h, k, dt, cfg){
    ensureClouds(w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (var i = 0; i < clouds.length; i++){
      var c = clouds[i];
      c.x += c.sp * k * dt * cfg.handSpeed;
      if (c.x > w + 60 * k) c.x = -60 * k;
      drawCloud(c.x, c.y, c.scale, k);
    }
  }
  function drawWings(cx, cy, R, pal, k){
    var flap = Math.sin(A.t * 2.2) * 0.1 + A.punch * 0.4 + (A.beat ? 0.18 : 0);
    [-1, 1].forEach(function(side){
      ctx.save();
      ctx.translate(cx + side * R * 0.98, cy - R * 0.08);
      ctx.scale(side, 1);
      ctx.rotate(-0.18 - flap);
      ctx.fillStyle = pal.wing;
      ctx.strokeStyle = pal.wingLine;
      ctx.lineWidth = Math.max(1 * k, R * 0.01);
      for (var i = 0; i < 6; i++){
        var fa = -0.32 + i * 0.17;
        var flen = R * (0.55 + (i % 2 ? 0.16 : 0));
        ctx.save();
        ctx.rotate(fa);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(flen * 0.5, -R * 0.09, flen, -R * 0.02);
        ctx.quadraticCurveTo(flen * 0.5, R * 0.05, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    });
  }
  var motes = [];
  function spawnMote(x, y){
    motes.push({ x: x, y: y, vy: (8 + Math.random() * 16) * Can.dpr(), vx: (Math.random() - 0.5) * 22 * Can.dpr(),
                 ph: Math.random() * 6.283, life: 0, maxLife: 6 + Math.random() * 6, feather: Math.random() < 0.4 });
  }
  function stepHeavenParticles(w, h, k, dt, cfg){
    if (motes.length < 130 && Math.random() < (0.25 + A.level * 1.4) * cfg.density * dt * 10) spawnMote(Math.random() * w, -8 * k);
    for (var i = motes.length - 1; i >= 0; i--){
      var m = motes[i];
      m.life += dt;
      if (m.life > m.maxLife || m.y > h + 10 * k){ motes.splice(i, 1); continue; }
      m.x += (m.vx + Math.sin(A.t + m.ph) * 10 * k) * dt;
      m.y += m.vy * dt;
      var fade = Math.min(1, m.life / 0.6) * Math.min(1, (m.maxLife - m.life) / 0.8);
      ctx.save();
      ctx.globalAlpha = fade * 0.85;
      ctx.translate(m.x, m.y);
      if (m.feather){
        ctx.rotate(Math.sin(A.t * 1.2 + m.ph) * 0.4);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5 * k, 1.6 * k, 0, 0, 6.283);
        ctx.fill();
      } else {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 6 * k;
        ctx.fillStyle = '#FFF8DE';
        ctx.beginPath();
        ctx.arc(0, 0, 1.4 * k, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ---------- dispatch ---------- */
  function paintBG(c, w, h){
    if (styleId() === 'solarpunk') paintSolarBG(c, w, h);
  }
  function bgColors(){
    var pal = theme().pal;
    return { bg1: pal.bg1, bg2: pal.bg2 };
  }
  function draw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.clock;
    var t = theme();
    Can.backdrop(1);
    var style = styleId();
    var R0 = Math.min(w, h * 0.92) * 0.34;
    if (t.decor) stepOrbit(w, h, w / 2, h * 0.52, R0, k, dt, cfg, t.pal, t.decor);
    else if (style === 'golden'){ paintGoldenAmbience(w, h, k); stepGears(w, h, k, dt, cfg, t.pal); stepSand(w, h, k, dt, cfg); }
    else if (style === 'solarpunk'){ stepSolarLive(w, h, k, dt, cfg); stepSolarParticles(w, h, k, dt, cfg); }
    else if (style === 'cyberpunk'){ stepCyberLive(w, h, k, dt, cfg); stepCyberParticles(w, h, k, dt, cfg); }
    else { stepClouds(w, h, k, dt, cfg); stepHeavenParticles(w, h, k, dt, cfg); }

    var R = Math.min(w, h * 0.92) * 0.34;
    stepChimes(w / 2, h * 0.52, R, t.pal, k, dt);
    if (style === 'heaven') drawWings(w / 2, h * 0.52, R, t.pal, k);
    drawFace(w / 2, h * 0.52, R, t.pal, cfg, k);
  }
  function onTap(x, y){
    var style = styleId();
    var ringColor = { golden: '#D4AF37', solarpunk: '#3E7C4C', cyberpunk: '#FF2E9A', heaven: '#8FCFFF' }[style] || theme().pal.accent;
    App.taps.spawnRing(x, y, ringColor);
    var k = Can.dpr();
    if (theme().decor){
      for (var o = 0; o < 6; o++) spawnOrbit(canvas.width, canvas.height, canvas.width / 2, canvas.height * 0.52, 1, theme().decor,
                                             x + (Math.random() - 0.5) * 40 * k, y + (Math.random() - 0.5) * 40 * k);
      return;
    }
    if (style === 'golden'){
      for (var i = 0; i < sand.length; i++){
        var g = sand[i];
        if (Math.abs(g.bandF * canvas.width - x) < 40 * k) g.vy -= (50 + Math.random() * 90) * k;
      }
    } else if (style === 'solarpunk'){
      for (var l = 0; l < 8; l++) spawnLeaf(x, y);
    } else if (style === 'cyberpunk'){
      for (var c = 0; c < 10; c++) spawnGlitch(x + (Math.random() - 0.5) * 30 * k, y + (Math.random() - 0.5) * 30 * k);
    } else {
      for (var m = 0; m < 10; m++) spawnMote(x, y);
    }
  }
  function reset(){ leafParts = []; glitches = []; motes = []; chimes = []; orbit = []; tickKick = 0; }
  Can.addResizeHook(function(){ sandReady = false; cloudsReady = false; });

  App.modes.register('clock', { draw: draw, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset, fx: 0.4 });

  App.cfg.registerDefaults('clock', { style: 'theme', density: 1, glow: 0.6, handSpeed: 1, kickTick: true, chimes: true });
  App.cfg.registerSchema({ id: 'clock', label: 'Clock', fields: [
    ['style', 'Style', 'layout', ['theme'].concat(Object.keys(THEMES))],
    ['kickTick', 'Second hand jumps on the kick', 'bool'],
    ['chimes', 'Rings of light when the music swells', 'bool'],
    ['density', 'Decoration density', 'range', 0.3, 2, 0.05],
    ['glow', 'Glow amount', 'range', 0, 1, 0.05],
    ['handSpeed', 'Background motion', 'range', 0.2, 2, 0.05]
  ]});
})();
