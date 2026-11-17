/* ---------- Clock ----------
   A clock that shows the device's real time, with the music round it.
   Redrawn on 2026-11-16 (the user: "the Clock mode design needs rework"):
   the heavy metal bezel, the sunburst and the crowd of drifting letters
   are gone. What is there now, from the middle out:

     the dial     a plain disc with a hairline rim, hour marks, slim hands,
                  and the time in small figures
     the song     a thin ring just outside the rim that fills as the song
                  plays
     the crown    the sound itself: 96 marks round the dial, bass at 12
                  o'clock, treble at 6, the same on both sides. In a calm
                  passage they are the short minute marks of a watch; in a
                  big one they open into a crown
     the orbits   three faint circles with one dot each, going round once a
                  minute, once an hour and once in twelve hours

   Every skin shares that and gives it a form of its own (FORMS): what the
   hour marks are, how the crown is drawn, how the hands are cut; plus its
   palette and its own background (gears and sand, vines, a grid, clouds
   and wings, or a few of the theme's characters drifting by).

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
    tessa: { decor: { glyphs: ['ϟ', '✦'], move: 'rise', arcs: true }, pal: {
      accent: '#9FE4FF', faceCenter: '#12264F', faceMid: '#0A1733', faceEdge: '#030814', rim: '#4FC3FF',
      numeral: '#E6F6FF', numeralShadow: 'rgba(79,195,255,0.55)', tick: 'rgba(138,123,255,0.7)',
      hourHand: '#E6F6FF', minuteHand: '#9FE4FF', secondHand: '#B9A8FF',
      bezelOuter: '#0C1C40', bezelInner: '#2E5FB8', bezelHighlight: '#D6F3FF', bezelStud: '#8A7BFF',
      bg1: '#081226', bg2: '#01030A'
    }},
    nihilum: { decor: { glyphs: ['●', '·'], move: 'inward' }, pal: {
      accent: '#FF9A4A', faceCenter: '#000000', faceMid: '#030204', faceEdge: '#0B0810', rim: '#FF9A4A',
      numeral: '#D9D4E2', numeralShadow: 'rgba(255,154,74,0.4)', tick: 'rgba(142,124,168,0.6)',
      hourHand: '#D9D4E2', minuteHand: '#8E7CA8', secondHand: '#FF9A4A',
      bezelOuter: '#08060B', bezelInner: '#3B2A14', bezelHighlight: '#FFD9A8', bezelStud: '#FF9A4A',
      bg1: '#06040A', bg2: '#000000'
    }}
  };

  // How each skin draws the shared clock.
  //   marks  the twelve hour marks: 'baton' | 'dots' | 'roman' | 'digits' | 'glyph' (with glyph: the character)
  //   ring   the crown of sound: 'bars' | 'dots' | 'blocks' | 'rays' | 'wave' | 'inward' (jag: a restless wave)
  //   hands  'round' | 'needle' | 'block'
  //   ink    the crown's line colour when the rim colour is too pale to read on the background
  var FORMS = {
    omega:     { marks: 'baton',  ring: 'bars',   hands: 'round' },
    tessa:     { marks: 'baton',  ring: 'wave',   hands: 'needle', jag: true },
    newyear:   { marks: 'dots',   ring: 'dots',   hands: 'round' },
    halloween: { marks: 'roman',  ring: 'bars',   hands: 'needle' },
    love:      { marks: 'glyph',  ring: 'bars',   hands: 'round', glyph: '♥' },
    solarpunk: { marks: 'baton',  ring: 'rays',   hands: 'round' },
    cyberpunk: { marks: 'digits', ring: 'blocks', hands: 'block' },
    nihilum:   { marks: 'dots',   ring: 'inward', hands: 'needle' },
    golden:    { marks: 'roman',  ring: 'bars',   hands: 'needle' },
    heaven:    { marks: 'baton',  ring: 'wave',   hands: 'round', ink: '#5FA3DA' }
  };

  /* ---------- the crown of sound ---------- */
  var RING_N = 96, ringEnv = new Float32Array(RING_N);
  function hash(n){ var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  function drawRing(cx, cy, R, pal, form, cfg, k, dt){
    var half = RING_N / 2, i;
    for (i = 0; i <= half; i++){
      var e = ringEnv[i] = U.env(ringEnv[i], Aud.specAt(0.04 + (i / half) * 0.8), 30, 7, dt);
      if (i > 0 && i < half) ringEnv[RING_N - i] = e;
    }
    var size = 0.3 + 0.7 * A.drive;                 // a calm part: short marks; a big part: a full crown
    var r0 = R * 1.1, kind = form.ring, a, len, ca, sa;
    var arcW = 6.283 * r0 / RING_N;                 // room one mark has along the rim
    function lenOf(j){ return R * (0.035 + ringEnv[j] * 0.33 * size); }
    ctx.save();
    if (kind === 'wave'){
      var step = Math.floor(A.t * 14);
      ctx.beginPath();
      for (i = 0; i <= RING_N; i++){
        var j = i % RING_N, rr = r0 + lenOf(j);
        if (form.jag) rr += (hash(j * 7.31 + step * 3.7) - 0.5) * R * 0.09 * (0.25 + A.drive);
        a = -Math.PI / 2 + j / RING_N * 6.283;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.moveTo(cx + r0 * 0.985, cy);
      ctx.arc(cx, cy, r0 * 0.985, 0, 6.283, true);
      ctx.globalAlpha = 0.14 + 0.16 * A.drive;
      ctx.fillStyle = pal.accent;
      ctx.fill('evenodd');
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = form.ink || pal.rim;
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(1.2 * k, R * 0.012);
      ctx.shadowColor = pal.accent;
      ctx.shadowBlur = 8 * k * cfg.glow;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (kind === 'inward'){
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = pal.rim;
      ctx.lineWidth = Math.max(1, k);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5, 0, 6.283);
      ctx.stroke();
    }
    ctx.lineCap = kind === 'blocks' ? 'butt' : 'round';
    for (i = 0; i < RING_N; i++){
      a = -Math.PI / 2 + i / RING_N * 6.283; ca = Math.cos(a); sa = Math.sin(a);
      len = lenOf(i);
      var ev = ringEnv[i], al = 0.3 + ev * 0.7;
      if (kind === 'rays'){
        var da = 3.1416 / RING_N * 0.85;
        ctx.globalAlpha = al * 0.85;
        ctx.fillStyle = i % 2 ? pal.accent : pal.rim;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - da) * r0, cy + Math.sin(a - da) * r0);
        ctx.lineTo(cx + ca * (r0 + len * 1.15), cy + sa * (r0 + len * 1.15));
        ctx.lineTo(cx + Math.cos(a + da) * r0, cy + Math.sin(a + da) * r0);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'blocks'){
        var unit = R * 0.058, n = Math.max(1, Math.round(len / unit));
        ctx.lineWidth = Math.max(2 * k, arcW * 0.66);
        for (var b = 0; b < n; b++){
          ctx.globalAlpha = al;
          ctx.strokeStyle = b === n - 1 ? pal.accent : pal.rim;
          ctx.beginPath();
          ctx.moveTo(cx + ca * (r0 + b * unit), cy + sa * (r0 + b * unit));
          ctx.lineTo(cx + ca * (r0 + b * unit + unit * 0.62), cy + sa * (r0 + b * unit + unit * 0.62));
          ctx.stroke();
        }
      } else if (kind === 'dots'){
        ctx.globalAlpha = al * 0.3;
        ctx.strokeStyle = pal.rim;
        ctx.lineWidth = Math.max(1, k);
        ctx.beginPath();
        ctx.moveTo(cx + ca * r0, cy + sa * r0);
        ctx.lineTo(cx + ca * (r0 + len), cy + sa * (r0 + len));
        ctx.stroke();
        ctx.globalAlpha = al;
        ctx.fillStyle = i % 2 ? pal.accent : pal.rim;
        ctx.beginPath();
        ctx.arc(cx + ca * (r0 + len), cy + sa * (r0 + len), Math.max(1.4 * k, arcW * 0.3), 0, 6.283);
        ctx.fill();
      } else {
        // bars (and inward bars): the body in the rim colour, the tip in the accent
        var from = kind === 'inward' ? R * 1.5 : r0, dir = kind === 'inward' ? -1 : 1;
        if (kind === 'inward') len = Math.min(len, R * 0.33);
        ctx.lineWidth = Math.max(1.5 * k, arcW * 0.42);
        ctx.globalAlpha = al;
        ctx.strokeStyle = pal.rim;
        ctx.beginPath();
        ctx.moveTo(cx + ca * from, cy + sa * from);
        ctx.lineTo(cx + ca * (from + dir * len), cy + sa * (from + dir * len));
        ctx.stroke();
        ctx.strokeStyle = pal.accent;
        ctx.beginPath();
        ctx.moveTo(cx + ca * (from + dir * len * 0.72), cy + sa * (from + dir * len * 0.72));
        ctx.lineTo(cx + ca * (from + dir * len), cy + sa * (from + dir * len));
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------- the orbits: once a minute, once an hour, once in twelve hours ---------- */
  function drawOrbits(cx, cy, R, pal, k){
    var now = new Date();
    var sec = now.getSeconds() + now.getMilliseconds() / 1000, min = now.getMinutes() + sec / 60, hr = (now.getHours() % 12) + min / 60;
    var fr = [sec / 60, min / 60, hr / 12], rad = [1.95, 2.75, 3.7];
    ctx.save();
    for (var i = 0; i < 3; i++){
      var r = R * rad[i], a = fr[i] * 6.283 - Math.PI / 2;
      ctx.globalAlpha = 0.16 - i * 0.03;
      ctx.strokeStyle = pal.rim;
      ctx.lineWidth = Math.max(1, k);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, (3.2 - i * 0.5) * k * (1 + A.kick * 0.4), 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- how far the song is: a thin ring that fills ---------- */
  function drawSongRing(cx, cy, R, pal, k){
    var el = App.state.player(), d = el.duration;
    if (!d || !isFinite(d) || App.state.currentIndex === -1) return;
    var f = Math.max(0, Math.min(1, el.currentTime / d)), r = R * 1.045, a0 = -Math.PI / 2, a1 = a0 + f * 6.283;
    ctx.save();
    ctx.lineWidth = Math.max(1.5 * k, R * 0.016);
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = pal.rim;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.283);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = pal.accent;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, Math.max(2.2 * k, R * 0.026), 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- the shared decoration of the theme skins ---------- */
  var orbit = [], lastStyle = null;
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
    // electric skin: sparks jump from the rim outward, more of them and longer when the music is big
    if (dec.arcs){
      var nArc = 1 + Math.round(A.drive * 5) + (A.kick > 0.5 ? 2 : 0), step = Math.floor(A.t * 14);
      ctx.save();
      ctx.strokeStyle = pal.accent;
      ctx.shadowColor = pal.rim;
      ctx.shadowBlur = 10 * k * cfg.glow;
      ctx.lineWidth = 1.4 * k;
      ctx.lineJoin = 'round';
      for (var ai = 0; ai < nArc; ai++){
        var sd = step * 7.13 + ai * 31.7;
        var aa = (Math.sin(sd * 12.9898) * 43758.5453 % 1) * 6.283, len = R * (0.25 + 0.7 * A.drive) * (0.6 + 0.4 * Math.abs(Math.sin(sd * 3.1)));
        ctx.globalAlpha = 0.45 + 0.5 * Math.abs(Math.sin(sd * 1.7));
        ctx.beginPath();
        for (var sg = 0; sg <= 5; sg++){
          var rr = R * 1.1 + len * sg / 5, off = sg === 0 ? 0 : Math.sin(sd * (sg + 1) * 5.3) * 0.11;
          var ax = cx + Math.cos(aa + off) * rr, ay = cy + Math.sin(aa + off) * rr;
          if (sg === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // the theme's characters: few when calm, many when the music is big; a hi-hat adds one
    var max = Math.round((2 + A.drive * 12) * cfg.density);
    if (orbit.length < max && Math.random() < (0.3 + A.drive * 3.5) * dt * cfg.density) spawnOrbit(w, h, cx, cy, R, dec);
    if (A.hatHit > 0.6 && orbit.length < max + 2) spawnOrbit(w, h, cx, cy, R, dec);
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
      var s = (9 + 9 * p.size) * k * (1 + A.kick * 0.35);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.age * 1.5) * (0.22 + 0.2 * p.size) * (0.6 + cfg.glow * 0.4);
      ctx.translate(x, y);
      ctx.rotate(p.rot + Math.sin(A.t + p.ph) * 0.25);
      ctx.drawImage(Can.glyphSprite(dec.glyphs[p.g % dec.glyphs.length], pal.accent), -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }
  // which skin is on: the user's pick, or with "theme" the one
  // the active theme code asks for (look.clock in themes.js)
  function styleId(){
    var s = Cfg.CFG.clock.style;
    if (s === 'theme') s = (App.theme.look && App.theme.look.clock) || 'omega';
    return THEMES[s] ? s : 'omega';
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

  /* ---------- the dial and its hands ---------- */
  function drawFace(cx, cy, R, pal, form, cfg, k){
    var now = new Date();
    var secF = now.getSeconds() + now.getMilliseconds() / 1000;
    var minF = now.getMinutes() + secF / 60;
    var hourF = (now.getHours() % 12) + minF / 60;
    var i, a;

    // the dial: a plain disc that throws a soft shadow, and a hairline rim that glows with the beat
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = R * 0.22;
    ctx.shadowOffsetY = R * 0.04;
    var face = ctx.createRadialGradient(cx, cy - R * 0.25, 0, cx, cy, R);
    face.addColorStop(0, pal.faceCenter);
    face.addColorStop(0.7, pal.faceMid || pal.faceCenter);
    face.addColorStop(1, pal.faceEdge);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = pal.rim;
    ctx.lineWidth = Math.max(1.5 * k, R * 0.02);
    ctx.shadowColor = pal.accent;
    ctx.shadowBlur = (4 + A.punch * 20) * cfg.glow * k;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.stroke();
    ctx.restore();

    // minute dots
    ctx.fillStyle = pal.tick;
    for (i = 0; i < 60; i++){
      if (i % 5 === 0) continue;
      a = (i / 60) * 6.283 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9, Math.max(0.8 * k, R * 0.008), 0, 6.283);
      ctx.fill();
    }
    // hour marks, in the skin's own form
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (i = 0; i < 12; i++){
      a = (i / 12) * 6.283 - Math.PI / 2;
      var quarter = i % 3 === 0, ca = Math.cos(a), sa = Math.sin(a);
      if (form.marks === 'roman' || form.marks === 'digits'){
        ctx.font = form.marks === 'roman'
          ? 'bold ' + Math.max(9, Math.round(R * (quarter ? 0.17 : 0.13))) + 'px Georgia, "Times New Roman", serif'
          : '600 ' + Math.max(9, Math.round(R * (quarter ? 0.17 : 0.13))) + 'px Consolas, "Courier New", monospace';
        ctx.fillStyle = pal.numeral;
        ctx.globalAlpha = quarter ? 1 : 0.7;
        ctx.fillText(form.marks === 'roman' ? ROMAN[i] : String(i === 0 ? 12 : i), cx + ca * R * 0.75, cy + sa * R * 0.75 + R * 0.01);
        ctx.globalAlpha = 1;
      } else if (form.marks === 'glyph'){
        var gs = R * (quarter ? 0.2 : 0.14);
        ctx.drawImage(Can.glyphSprite(form.glyph, pal.accent), cx + ca * R * 0.8 - gs / 2, cy + sa * R * 0.8 - gs / 2, gs, gs);
      } else if (form.marks === 'dots'){
        ctx.fillStyle = pal.numeral;
        ctx.beginPath();
        ctx.arc(cx + ca * R * 0.82, cy + sa * R * 0.82, R * (quarter ? 0.04 : 0.024), 0, 6.283);
        ctx.fill();
      } else {
        ctx.strokeStyle = pal.numeral;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1.4 * k, R * (quarter ? 0.034 : 0.018));
        ctx.beginPath();
        ctx.moveTo(cx + ca * R * (quarter ? 0.7 : 0.78), cy + sa * R * (quarter ? 0.7 : 0.78));
        ctx.lineTo(cx + ca * R * 0.88, cy + sa * R * 0.88);
        ctx.stroke();
      }
    }

    // the time in figures, small, in the lower half
    if (cfg.digital && R > 40 * k){
      var hh = now.getHours(), mi = now.getMinutes();
      ctx.font = '500 ' + Math.round(R * 0.15) + 'px "Segoe UI", system-ui, -apple-system, sans-serif';
      ctx.fillStyle = pal.numeral;
      ctx.globalAlpha = 0.5;
      ctx.fillText((hh < 10 ? '0' : '') + hh + ':' + (mi < 10 ? '0' : '') + mi, cx, cy + R * 0.4);
      ctx.globalAlpha = 1;
    }

    // hour and minute hands
    function hand(frac, lenMul, widMul, color, tailMul){
      var a2 = frac * 6.283 - Math.PI / 2;
      var len = R * lenMul, wid = Math.max(1.8 * k, R * widMul), tail = R * tailMul;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a2);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = R * 0.03;
      ctx.shadowOffsetX = R * 0.01;
      ctx.shadowOffsetY = R * 0.014;
      if (form.hands === 'needle'){
        // a tapered blade with a short counterweight
        ctx.beginPath();
        ctx.moveTo(-tail, wid * 0.5);
        ctx.lineTo(len * 0.62, wid * 0.5);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.62, -wid * 0.5);
        ctx.lineTo(-tail, -wid * 0.5);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = wid;
        ctx.lineCap = form.hands === 'block' ? 'butt' : 'round';
        ctx.beginPath();
        ctx.moveTo(-tail, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
      }
      ctx.restore();
    }
    hand(hourF / 12, 0.5, 0.064, pal.hourHand, 0.1);
    hand(minF / 60, 0.76, 0.042, pal.minuteHand, 0.12);

    // second hand: a hairline with a small counterweight; a kick makes it jump forward and settle back
    if (cfg.kickTick && A.kickHit > 0.3 && A.drive > 0.1) tickKick = Math.max(tickKick, 0.4 + A.kickHit * 0.6);
    tickKick *= Math.exp(-9 * A.dt);
    var a3 = (secF / 60) * 6.283 - Math.PI / 2 + tickKick * 0.085;
    ctx.save();
    ctx.strokeStyle = pal.secondHand;
    ctx.fillStyle = pal.secondHand;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1 * k, R * 0.012);
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a3) * R * 0.18, cy - Math.sin(a3) * R * 0.18);
    ctx.lineTo(cx + Math.cos(a3) * R * 0.86, cy + Math.sin(a3) * R * 0.86);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - Math.cos(a3) * R * 0.18, cy - Math.sin(a3) * R * 0.18, R * 0.024, 0, 6.283);
    ctx.fill();
    // hub
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2.6 * k, R * 0.05), 0, 6.283);
    ctx.fill();
    ctx.fillStyle = pal.faceCenter;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1 * k, R * 0.018), 0, 6.283);
    ctx.fill();
    ctx.restore();
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
    // a new skin starts with no drifting characters: the old ones carry the old skin's glyphs and way of moving
    if (style !== lastStyle){ orbit = []; lastStyle = style; }
    // the dial is 0.3 of the short side, so the loudest crown (1.52 radii) still ends inside the picture
    var R = Math.min(w, h) * 0.3, cx = w / 2, cy = h * 0.5;
    var form = FORMS[style] || FORMS.omega;
    // a soft light behind the clock: brighter in a big part of the song
    var halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.4);
    halo.addColorStop(0, U.rgba(U.hexRGB(t.pal.accent), ((0.08 + 0.2 * A.drive) * (0.4 + cfg.glow)).toFixed(3)));
    halo.addColorStop(1, U.rgba(U.hexRGB(t.pal.accent), '0'));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    if (t.decor) stepOrbit(w, h, cx, cy, R, k, dt, cfg, t.pal, t.decor);
    else if (style === 'golden'){ paintGoldenAmbience(w, h, k); stepGears(w, h, k, dt, cfg, t.pal); stepSand(w, h, k, dt, cfg); }
    else if (style === 'solarpunk'){ stepSolarLive(w, h, k, dt, cfg); stepSolarParticles(w, h, k, dt, cfg); }
    else if (style === 'cyberpunk'){ stepCyberLive(w, h, k, dt, cfg); stepCyberParticles(w, h, k, dt, cfg); }
    else { stepClouds(w, h, k, dt, cfg); stepHeavenParticles(w, h, k, dt, cfg); }

    if (cfg.orbits) drawOrbits(cx, cy, R, t.pal, k);
    stepChimes(cx, cy, R, t.pal, k, dt);
    if (style === 'heaven') drawWings(cx, cy, R, t.pal, k);
    drawRing(cx, cy, R, t.pal, form, cfg, k, dt);
    if (cfg.songRing) drawSongRing(cx, cy, R, t.pal, k);
    drawFace(cx, cy, R, t.pal, form, cfg, k);
  }
  function onTap(x, y){
    var style = styleId();
    var ringColor = { golden: '#D4AF37', solarpunk: '#3E7C4C', cyberpunk: '#FF2E9A', heaven: '#8FCFFF' }[style] || theme().pal.accent;
    App.taps.spawnRing(x, y, ringColor);
    var k = Can.dpr();
    if (theme().decor){
      for (var o = 0; o < 4; o++) spawnOrbit(canvas.width, canvas.height, canvas.width / 2, canvas.height * 0.5, 1, theme().decor,
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

  App.cfg.registerDefaults('clock', { style: 'theme', density: 1, glow: 0.6, handSpeed: 1, kickTick: true, chimes: true, digital: true, songRing: true, orbits: true });
  App.cfg.registerSchema({ id: 'clock', label: 'Clock', fields: [
    ['style', 'Style', 'layout', ['theme'].concat(Object.keys(THEMES))],
    ['kickTick', 'Second hand jumps on the kick', 'bool'],
    ['chimes', 'Rings of light when the music swells', 'bool'],
    ['songRing', 'A ring round the dial fills as the song plays', 'bool'],
    ['digital', 'The time in figures on the dial', 'bool'],
    ['orbits', 'Orbits: a dot a minute, an hour, twelve hours', 'bool'],
    ['density', 'Decoration density', 'range', 0.3, 2, 0.05],
    ['glow', 'Glow amount', 'range', 0, 1, 0.05],
    ['handSpeed', 'Background motion', 'range', 0.2, 2, 0.05]
  ]});
})();
