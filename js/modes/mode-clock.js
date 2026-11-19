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

   Two things are chosen apart (2026-11-17, the user: "Clock styles are
   literally the codes, it should not be"):
     the theme code   always picks the palette (PALETTES) and the forms
                      (FORMS: what the hour marks are, how the crown is
                      drawn, how the hands are cut). The rainbow code
                      (Ascensus Ad Incertum) turns everything rainbow.
     the design       the Clock's own style setting (DESIGNS): what is
                      round the clock. "theme" lets the code pick it
                      (look.clock in themes.js).
                        classic  the dial alone, with a few of the code's
                                 characters drifting by
                        gears    clockwork that meshes, and a sand pile fed
                                 by a thin stream, like an hourglass
                        garden   hills and two vines that grow and sway
                        grid     a perspective grid, circuit traces, glitches
                        sky      clouds, two unlike flat wings (blades, plumes), motes
   Every design takes its colours from the palette, so it reads in every
   code; only materials (metal, sand, leaf green) are fixed colours, and
   they are mixed with the palette.

   Calm against loud: in a quiet passage the gears all but stop, the vines
   and wings are still, the pile settles; in a big one they move a lot.

   Interlocking gears rotate at speeds that are actually derived from their
   radii, the way a real gear train works: for two meshed gears, angular
   velocity is inversely proportional to radius and the rotation direction
   alternates. Because that ratio between any two gears in a chain never
   changes, only the ROOT gear's angle needs integrating every frame
   (persistent state); every other gear's angle is just that root angle
   times a fixed constant computed from the radii. All gears share one
   tooth pitch, and each driven gear starts turned so that a tooth of its
   parent sits in one of its gaps: the teeth interlock.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

  // the Clock's own designs (the style setting); never theme ids (engine/check.js)
  var DESIGNS = ['classic', 'gears', 'garden', 'grid', 'sky'];

  // One palette per theme code (keyed by theme id).
  //   decor  for the Classic design: glyphs = what drifts, move = 'rise' | 'fall' | 'inward', arcs = sparks from the rim
  //   pal    light: true on a pale background (decorations then use dark ink); rainbow: true = a hue per mark
  var PALETTES = {
    omega: { decor: { glyphs: ['Ω', '✦', '✧'], move: 'rise' }, pal: {
      accent: '#FF5FD2', faceCenter: '#2D1D58', faceMid: '#1A1036', faceEdge: '#0B0618', rim: '#B06BFF',
      numeral: '#EFE9FF', tick: 'rgba(176,107,255,0.65)',
      hourHand: '#EFE9FF', minuteHand: '#C9A6FF', secondHand: '#FF5FD2', bg1: '#171033', bg2: '#06040E'
    }},
    tessa: { decor: { glyphs: ['ϟ', '✦'], move: 'rise', arcs: true }, pal: {
      accent: '#9FE4FF', faceCenter: '#12264F', faceMid: '#0A1733', faceEdge: '#030814', rim: '#4FC3FF',
      numeral: '#E6F6FF', tick: 'rgba(138,123,255,0.7)',
      hourHand: '#E6F6FF', minuteHand: '#9FE4FF', secondHand: '#B9A8FF', bg1: '#081226', bg2: '#01030A'
    }},
    newyear: { decor: { glyphs: ['✦', '❄', '✧'], move: 'fall' }, pal: {
      accent: '#F2C55C', faceCenter: '#1B2B63', faceMid: '#101C46', faceEdge: '#060B22', rim: '#F2C55C',
      numeral: '#F8E6B0', tick: 'rgba(143,184,255,0.65)',
      hourHand: '#F8E6B0', minuteHand: '#F2C55C', secondHand: '#8FB8FF', bg1: '#0D1638', bg2: '#03050F'
    }},
    halloween: { decor: { glyphs: ['🦇', '👻', '🎃'], move: 'rise' }, pal: {
      accent: '#FF7A1A', faceCenter: '#3A1C0C', faceMid: '#22100E', faceEdge: '#0B0508', rim: '#FF7A1A',
      numeral: '#FFB870', tick: 'rgba(155,93,229,0.7)',
      hourHand: '#FFB870', minuteHand: '#FF7A1A', secondHand: '#7CE04A', bg1: '#1C0F24', bg2: '#050308'
    }},
    love: { decor: { glyphs: ['♥'], move: 'rise' }, pal: {
      accent: '#C2626F', faceCenter: '#FFFFFF', faceMid: '#FDF3EE', faceEdge: '#F3DCD9', rim: '#A8783E',
      numeral: '#6E1E2E', tick: 'rgba(168,120,62,0.7)',
      hourHand: '#6E1E2E', minuteHand: '#9B3A4B', secondHand: '#C2626F', bg1: '#FFF8F3', bg2: '#F1D8D5', light: true
    }},
    solarpunk: { decor: { glyphs: ['❀', '✿', '☀'], move: 'rise' }, pal: {
      accent: '#E39A2E', faceCenter: '#FBFEF2', faceMid: '#EAF6DE', faceEdge: '#C9E8BC', rim: '#3E7C4C',
      numeral: '#1F5C3D', tick: 'rgba(31,92,61,0.55)',
      hourHand: '#1F5C3D', minuteHand: '#3E7C4C', secondHand: '#E39A2E', bg1: '#EAF7E3', bg2: '#FBF0D2', light: true
    }},
    cyberpunk: { decor: { glyphs: ['1', '0', '▮'], move: 'fall' }, pal: {
      accent: '#FF6FD4', faceCenter: '#1C1030', faceMid: '#130A20', faceEdge: '#04010A', rim: '#28E5FF',
      numeral: '#4FEFFF', tick: 'rgba(255,46,154,0.55)',
      hourHand: '#FF2E9A', minuteHand: '#28E5FF', secondHand: '#FFE94A', bg1: '#0A0714', bg2: '#170A28'
    }},
    nihilum: { decor: { glyphs: ['●', '·'], move: 'inward' }, pal: {
      accent: '#FF9A4A', faceCenter: '#000000', faceMid: '#030204', faceEdge: '#0B0810', rim: '#FF9A4A',
      numeral: '#D9D4E2', tick: 'rgba(142,124,168,0.6)',
      hourHand: '#D9D4E2', minuteHand: '#8E7CA8', secondHand: '#FF9A4A', bg1: '#06040A', bg2: '#000000'
    }},
    incertum: { decor: { glyphs: ['✦', '✧', '∞'], move: 'rise' }, pal: {
      accent: '#FF6FB5', faceCenter: '#FFFFFF', faceMid: '#F4F7FF', faceEdge: '#DCE4FF', rim: '#4A58E0',
      numeral: '#262B63', tick: 'rgba(74,88,224,0.5)',
      hourHand: '#262B63', minuteHand: '#4A58E0', secondHand: '#FF6FB5', bg1: '#E6F0FF', bg2: '#FFFFFF', light: true, rainbow: true
    }}
  };

  // How each code draws the shared clock (keyed by theme id).
  //   marks  the twelve hour marks: 'baton' | 'dots' | 'roman' | 'digits' | 'glyph' (with glyph: the character)
  //   ring   the crown of sound: 'bars' | 'dots' | 'blocks' | 'rays' | 'wave' | 'inward' (jag: a restless wave)
  //   hands  'round' | 'needle' | 'block'
  var FORMS = {
    omega:     { marks: 'baton',  ring: 'bars',   hands: 'round' },
    tessa:     { marks: 'baton',  ring: 'wave',   hands: 'needle', jag: true },
    newyear:   { marks: 'dots',   ring: 'dots',   hands: 'round' },
    halloween: { marks: 'roman',  ring: 'bars',   hands: 'needle' },
    love:      { marks: 'glyph',  ring: 'bars',   hands: 'round', glyph: '♥' },
    solarpunk: { marks: 'baton',  ring: 'rays',   hands: 'round' },
    cyberpunk: { marks: 'digits', ring: 'blocks', hands: 'block' },
    nihilum:   { marks: 'dots',   ring: 'inward', hands: 'needle' },
    incertum:  { marks: 'baton',  ring: 'rays',   hands: 'round' }
  };

  /* ---------- colours ---------- */
  var rgbCache = {}, mixCache = {};
  function rgbOf(c){ return rgbCache[c] || (rgbCache[c] = U.hexRGB(c)); }
  // a colour between two #rrggbb colours (t = 0: a, 1: b), as #rrggbb
  function mix(a, b, t){
    var key = a + b + t, v = mixCache[key];
    if (v) return v;
    var x = rgbOf(a), y = rgbOf(b), n = 0;
    for (var i = 0; i < 3; i++) n = n * 256 + Math.round(x[i] + (y[i] - x[i]) * t);
    return (mixCache[key] = '#' + (0x1000000 + n).toString(16).slice(1));
  }
  function rgba(c, a){ return U.rgba(rgbOf(c), a.toFixed(3)); }
  // hue in degrees, s and l from 0 to 1, as #rrggbb
  function hslHex(hh, s, l){
    var h = (((hh % 360) + 360) % 360) / 30, a = s * Math.min(l, 1 - l), n = 0;
    [0, 8, 4].forEach(function(o){
      var k = (o + h) % 12;
      n = n * 256 + Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    });
    return '#' + (0x1000000 + n).toString(16).slice(1);
  }
  // the rainbow, 96 hues from 12 o'clock round; darker on a pale background so it reads
  var RAINBOW = { light: [], dark: [] };
  for (var rh = 0; rh < 96; rh++){ RAINBOW.light.push(hslHex(rh * 3.75, 0.85, 0.5)); RAINBOW.dark.push(hslHex(rh * 3.75, 0.9, 0.66)); }
  function rbCol(f, pal){ var arr = pal.light ? RAINBOW.light : RAINBOW.dark; return arr[Math.floor((((f % 1) + 1) % 1) * 96) % 96]; }
  // made once per centre and kind of background, not every frame (item 24: the rainbow code was slow)
  var conicCache = {};
  function conicRainbow(cx, cy, pal){
    if (!ctx.createConicGradient) return pal.accent;
    var key = cx + ',' + cy + (pal.light ? 'l' : 'd'), g = conicCache[key];
    if (g) return g;
    g = ctx.createConicGradient(-Math.PI / 2, cx, cy);
    for (var i = 0; i <= 12; i++) g.addColorStop(i / 12, rbCol(i / 12, pal));
    if (Object.keys(conicCache).length > 8) conicCache = {};
    return (conicCache[key] = g);
  }
  // a soft round light, drawn once per colour
  var dotCache = {};
  function glowDot(color){
    var s = dotCache[color];
    if (s) return s;
    s = document.createElement('canvas');
    s.width = s.height = 32;
    var c = s.getContext('2d'), g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, rgba(color, 1)); g.addColorStop(0.3, rgba(color, 0.8)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    return (dotCache[color] = s);
  }
  // the rainbow light behind the dial (rainbow code), drawn once
  var rbGlow = null;
  function rainbowGlow(){
    if (rbGlow) return rbGlow;
    var n = 256, cv = document.createElement('canvas');
    cv.width = cv.height = n;
    var c = cv.getContext('2d');
    if (c.createConicGradient){
      var g = c.createConicGradient(-Math.PI / 2, n / 2, n / 2);
      for (var i = 0; i <= 12; i++) g.addColorStop(i / 12, hslHex(i * 30, 0.95, 0.62));
      c.fillStyle = g;
    } else c.fillStyle = '#9FB4FF';
    c.fillRect(0, 0, n, n);
    c.globalCompositeOperation = 'destination-in';
    var m = c.createRadialGradient(n / 2, n / 2, n * 0.16, n / 2, n / 2, n / 2);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.28, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m;
    c.fillRect(0, 0, n, n);
    return (rbGlow = cv);
  }

  /* ---------- the crown of sound ---------- */
  var RING_N = 96, ringEnv = new Float32Array(RING_N);
  function hash(n){ var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  function drawRing(cx, cy, R, pal, form, cfg, k, dt){
    var half = RING_N / 2, i, rb = pal.rainbow;
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
      ctx.fillStyle = rb ? conicRainbow(cx, cy, pal) : pal.accent;
      ctx.fill('evenodd');
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = rb ? ctx.fillStyle : pal.rim;
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
    // The 96 marks are gathered into a few paths, one per step of brightness (RING_STEPS) and colour,
    // so the crown costs about ten fills instead of a hundred or more (item 24). Under the rainbow code
    // one conic gradient gives every mark its own hue, as before.
    var conic = rb ? conicRainbow(cx, cy, pal) : null;
    var bodyP = [], tipP = [], altP = [], s;
    for (s = 0; s < RING_STEPS; s++){ bodyP.push(new Path2D()); tipP.push(new Path2D()); altP.push(new Path2D()); }
    var da = 3.1416 / RING_N * 0.85, unit = R * 0.058, dotR = Math.max(1.4 * k, arcW * 0.3);
    var from = kind === 'inward' ? R * 1.5 : r0, dir = kind === 'inward' ? -1 : 1;
    for (i = 0; i < RING_N; i++){
      a = -Math.PI / 2 + i / RING_N * 6.283; ca = Math.cos(a); sa = Math.sin(a);
      len = lenOf(i);
      s = Math.min(RING_STEPS - 1, Math.floor(ringEnv[i] * RING_STEPS));
      // the rays and dots alternate the rim colour and the accent (one colour, the rainbow, under the rainbow code)
      var odd = !rb && i % 2 === 1;
      if (kind === 'rays'){
        var pr = odd ? altP[s] : bodyP[s];
        pr.moveTo(cx + Math.cos(a - da) * r0, cy + Math.sin(a - da) * r0);
        pr.lineTo(cx + ca * (r0 + len * 1.15), cy + sa * (r0 + len * 1.15));
        pr.lineTo(cx + Math.cos(a + da) * r0, cy + Math.sin(a + da) * r0);
        pr.closePath();
      } else if (kind === 'blocks'){
        var n = Math.max(1, Math.round(len / unit));
        for (var b = 0; b < n; b++){
          var pb = b === n - 1 ? tipP[s] : bodyP[s];
          pb.moveTo(cx + ca * (r0 + b * unit), cy + sa * (r0 + b * unit));
          pb.lineTo(cx + ca * (r0 + b * unit + unit * 0.62), cy + sa * (r0 + b * unit + unit * 0.62));
        }
      } else if (kind === 'dots'){
        bodyP[s].moveTo(cx + ca * r0, cy + sa * r0);
        bodyP[s].lineTo(cx + ca * (r0 + len), cy + sa * (r0 + len));
        var pd = odd ? altP[s] : tipP[s], dx = cx + ca * (r0 + len), dy = cy + sa * (r0 + len);
        pd.moveTo(dx + dotR, dy);
        pd.arc(dx, dy, dotR, 0, 6.283);
      } else {
        // bars (and inward bars)
        if (kind === 'inward') len = Math.min(len, R * 0.33);
        bodyP[s].moveTo(cx + ca * from, cy + sa * from);
        bodyP[s].lineTo(cx + ca * (from + dir * len), cy + sa * (from + dir * len));
        tipP[s].moveTo(cx + ca * (from + dir * len * 0.72), cy + sa * (from + dir * len * 0.72));
        tipP[s].lineTo(cx + ca * (from + dir * len), cy + sa * (from + dir * len));
      }
    }
    var bodyC = conic || pal.rim, tipC = conic || pal.accent;
    for (s = 0; s < RING_STEPS; s++){
      var al = 0.3 + (s + 0.5) / RING_STEPS * 0.7;
      if (kind === 'rays'){
        ctx.globalAlpha = al * 0.85;
        ctx.fillStyle = bodyC; ctx.fill(bodyP[s]);
        if (!rb){ ctx.fillStyle = pal.accent; ctx.fill(altP[s]); }
      } else if (kind === 'dots'){
        ctx.globalAlpha = al * 0.3;
        ctx.strokeStyle = bodyC; ctx.lineWidth = Math.max(1, k); ctx.stroke(bodyP[s]);
        ctx.globalAlpha = al;
        ctx.fillStyle = bodyC; ctx.fill(tipP[s]);
        if (!rb){ ctx.fillStyle = pal.accent; ctx.fill(altP[s]); }
      } else {
        ctx.lineWidth = kind === 'blocks' ? Math.max(2 * k, arcW * 0.66) : Math.max(1.5 * k, arcW * 0.42);
        ctx.globalAlpha = al;
        ctx.strokeStyle = bodyC; ctx.stroke(bodyP[s]);
        ctx.strokeStyle = tipC; ctx.stroke(tipP[s]);
      }
    }
    ctx.restore();
  }
  var RING_STEPS = 5;

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
      ctx.fillStyle = pal.rainbow ? rbCol(fr[i], pal) : pal.accent;
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
    ctx.strokeStyle = pal.rainbow ? conicRainbow(cx, cy, pal) : pal.accent;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    ctx.fillStyle = pal.rainbow ? rbCol(f, pal) : pal.accent;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, Math.max(2.2 * k, R * 0.026), 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- Classic: a few of the code's characters drifting by ---------- */
  var orbit = [], lastStyle = null;
  function spawnOrbit(w, h, cx, cy, R, dec, x, y){
    var p = { g: Math.floor(Math.random() * dec.glyphs.length), hue: Math.floor(Math.random() * 12) / 12, age: 0, life: 4 + Math.random() * 4,
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
    // electric code: sparks jump from the rim outward, more of them and longer when the music is big
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

    // the code's characters: few when calm, many when the music is big; a hi-hat adds one
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
      ctx.globalAlpha = Math.min(1, p.age * 1.5) * (0.22 + 0.2 * p.size) * (0.6 + cfg.glow * 0.4) * (pal.light ? 1.6 : 1);
      ctx.translate(x, y);
      ctx.rotate(p.rot + Math.sin(A.t + p.ph) * 0.25);
      ctx.drawImage(Can.glyphSprite(dec.glyphs[p.g % dec.glyphs.length], pal.rainbow ? rbCol(p.hue, pal) : pal.accent), -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  // which design is on: the user's pick, or with "theme" (or an old saved
  // choice that is no longer a design, such as 'golden') the one the code asks for
  function designId(){
    var s = Cfg.CFG.clock.style;
    if (DESIGNS.indexOf(s) === -1){
      s = App.theme.look && App.theme.look.clock;
      if (DESIGNS.indexOf(s) === -1) s = 'classic';
    }
    return s;
  }
  // which palette and forms: always the theme code's
  function paletteId(){ var id = App.theme.current; return PALETTES[id] ? id : 'omega'; }

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
      ctx.strokeStyle = pal.rainbow ? conicRainbow(cx, cy, pal) : pal.accent;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, 6.283);
      // the glow: a wide faint stroke under the ring instead of a blurred shadow (item 24)
      var gl = 14 * k * Cfg.CFG.clock.glow;
      if (gl > 0.5){
        ctx.globalAlpha = (1 - f) * 0.14;
        ctx.lineWidth = (3 * (1 - f) + 0.6) * k + gl;
        ctx.stroke();
      }
      ctx.globalAlpha = (1 - f) * 0.55;
      ctx.lineWidth = (3 * (1 - f) + 0.6) * k;
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
  // The dial itself (the disc with its soft shadow, the minute dots and the hour marks) never changes
  // between frames, so it is painted once into a picture of its own and copied in (item 24). It is
  // painted again only when the size or the code changes.
  var dialCache = null, dialKey = '';
  function dialSprite(R, pal, form, k, pid){
    var key = R.toFixed(1) + '|' + k + '|' + pid;
    if (dialCache && dialKey === key) return dialCache;
    var half = Math.ceil(R * 1.42), cv = document.createElement('canvas');
    cv.width = cv.height = half * 2;
    var c = cv.getContext('2d'), cx = half, cy = half, i, a;
    c.save();
    c.shadowColor = pal.light ? 'rgba(40,40,80,0.25)' : 'rgba(0,0,0,0.45)';
    c.shadowBlur = R * 0.22;
    c.shadowOffsetY = R * 0.04;
    var face = c.createRadialGradient(cx, cy - R * 0.25, 0, cx, cy, R);
    face.addColorStop(0, pal.faceCenter);
    face.addColorStop(0.7, pal.faceMid || pal.faceCenter);
    face.addColorStop(1, pal.faceEdge);
    c.fillStyle = face;
    c.beginPath();
    c.arc(cx, cy, R, 0, 6.283);
    c.fill();
    c.restore();
    // minute dots
    c.fillStyle = pal.tick;
    c.beginPath();
    for (i = 0; i < 60; i++){
      if (i % 5 === 0) continue;
      a = (i / 60) * 6.283 - Math.PI / 2;
      var mr = Math.max(0.8 * k, R * 0.008), mx = cx + Math.cos(a) * R * 0.9, my = cy + Math.sin(a) * R * 0.9;
      c.moveTo(mx + mr, my);
      c.arc(mx, my, mr, 0, 6.283);
    }
    c.fill();
    // hour marks, in the code's own form
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (i = 0; i < 12; i++){
      a = (i / 12) * 6.283 - Math.PI / 2;
      var quarter = i % 3 === 0, ca = Math.cos(a), sa = Math.sin(a);
      if (form.marks === 'roman' || form.marks === 'digits'){
        c.font = form.marks === 'roman'
          ? 'bold ' + Math.max(9, Math.round(R * (quarter ? 0.17 : 0.13))) + 'px Georgia, "Times New Roman", serif'
          : '600 ' + Math.max(9, Math.round(R * (quarter ? 0.17 : 0.13))) + 'px Consolas, "Courier New", monospace';
        c.fillStyle = pal.numeral;
        c.globalAlpha = quarter ? 1 : 0.7;
        c.fillText(form.marks === 'roman' ? ROMAN[i] : String(i === 0 ? 12 : i), cx + ca * R * 0.75, cy + sa * R * 0.75 + R * 0.01);
        c.globalAlpha = 1;
      } else if (form.marks === 'glyph'){
        var gs = R * (quarter ? 0.2 : 0.14);
        c.drawImage(Can.glyphSprite(form.glyph, pal.accent), cx + ca * R * 0.8 - gs / 2, cy + sa * R * 0.8 - gs / 2, gs, gs);
      } else if (form.marks === 'dots'){
        c.fillStyle = pal.numeral;
        c.beginPath();
        c.arc(cx + ca * R * 0.82, cy + sa * R * 0.82, R * (quarter ? 0.04 : 0.024), 0, 6.283);
        c.fill();
      } else {
        c.strokeStyle = pal.rainbow ? rbCol(i / 12, pal) : pal.numeral;
        c.lineCap = 'round';
        c.lineWidth = Math.max(1.4 * k, R * (quarter ? 0.034 : 0.018));
        c.beginPath();
        c.moveTo(cx + ca * R * (quarter ? 0.7 : 0.78), cy + sa * R * (quarter ? 0.7 : 0.78));
        c.lineTo(cx + ca * R * 0.88, cy + sa * R * 0.88);
        c.stroke();
      }
    }
    dialKey = key;
    return (dialCache = cv);
  }

  function drawFace(cx, cy, R, pal, form, cfg, k, pid){
    var now = new Date();
    var secF = now.getSeconds() + now.getMilliseconds() / 1000;
    var minF = now.getMinutes() + secF / 60;
    var hourF = (now.getHours() % 12) + minF / 60;

    var dial = dialSprite(R, pal, form, k, pid), dh = dial.width / 2;
    ctx.drawImage(dial, Math.round(cx - dh), Math.round(cy - dh));
    // the hairline rim glows with the beat: a wide faint stroke under it stands in for a blurred shadow
    ctx.save();
    var rimC = pal.rainbow ? conicRainbow(cx, cy, pal) : pal.rim, rimW = Math.max(1.5 * k, R * 0.02);
    var glowW = (4 + A.punch * 20) * cfg.glow * k;
    if (glowW > 0.5){
      ctx.strokeStyle = pal.rainbow ? rimC : pal.accent;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = rimW + glowW;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = rimC;
    ctx.lineWidth = rimW;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 6.283);
    ctx.stroke();
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

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
      // a hand and its shadow: the same shape drawn first, offset down and right, faint (no blur: item 24)
      var shC = pal.light ? 'rgba(40,40,80,0.2)' : 'rgba(0,0,0,0.35)';
      for (var pass = 0; pass < 2; pass++){
        ctx.save();
        if (pass === 0) ctx.translate(cx + R * 0.012, cy + R * 0.018); else ctx.translate(cx, cy);
        ctx.rotate(a2);
        var col = pass === 0 ? shC : color;
        if (form.hands === 'needle'){
          // a tapered blade with a short counterweight
          ctx.beginPath();
          ctx.moveTo(-tail, wid * 0.5);
          ctx.lineTo(len * 0.62, wid * 0.5);
          ctx.lineTo(len, 0);
          ctx.lineTo(len * 0.62, -wid * 0.5);
          ctx.lineTo(-tail, -wid * 0.5);
          ctx.closePath();
          ctx.fillStyle = col;
          ctx.fill();
        } else {
          ctx.strokeStyle = col;
          ctx.lineWidth = wid;
          ctx.lineCap = form.hands === 'block' ? 'butt' : 'round';
          ctx.beginPath();
          ctx.moveTo(-tail, 0);
          ctx.lineTo(len, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
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

  /* ---------- Gears: clockwork that meshes ---------- */
  // Four corner clusters frame the dial. Every gear has the same tooth pitch
  // (GEAR_PITCH of the short side along the pitch circle), so its radius
  // follows from its number of teeth and meshed gears fit tooth into gap.
  var GEAR_PITCH = 0.0275;
  // a tooth, in parts of the tooth spacing: half its width at the tip and at the root; its height above and
  // below the pitch circle in modules. Narrow enough that meshed teeth never cut into each other while
  // they turn (engine/check.js turns every pair through two revolutions to make sure)
  var TOOTH_TIP = 0.12, TOOTH_ROOT = 0.27, TOOTH_ADD = 0.9, TOOTH_DED = 1.25;
  var GEAR_CLUSTERS = [
    [
      { cx: 0.11, cy: 0.15, teeth: 28 },
      { rel: 0, ang: 2.4, teeth: 16 },
      { rel: 1, ang: 1.6, teeth: 20 },
      { rel: 0, ang: 0.65, teeth: 14 }
    ],
    [
      { cx: 0.89, cy: 0.87, teeth: 24 },
      { rel: 0, ang: -1.0, teeth: 14 },
      { rel: 1, ang: -2.2, teeth: 18 }
    ],
    [
      { cx: 0.92, cy: 0.14, teeth: 16 },
      { rel: 0, ang: 2.6, teeth: 12 }
    ],
    [
      { cx: 0.09, cy: 0.88, teeth: 16 },
      { rel: 0, ang: 0.9, teeth: 12 }
    ]
  ];
  var gearMasterAngle = [0, 0, 0, 0];
  function layoutCluster(cluster, w, h){
    var m = Math.min(w, h), out = [];
    for (var i = 0; i < cluster.length; i++){
      var def = cluster[i], g = { r: def.teeth * GEAR_PITCH * m / 6.2832, teeth: def.teeth };
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
  // How far each gear starts turned so its teeth interlock with its parent's.
  // On the line between the two centres, the parent's tooth phase and the
  // child's add up to a constant while they turn (the ratio above keeps it
  // so); set it to half a tooth: where the parent has a tooth, the child has a gap.
  function phasesFor(cluster){
    var out = [0];
    for (var i = 1; i < cluster.length; i++){
      var def = cluster[i], tp = 6.2832 / cluster[def.rel].teeth, tc = 6.2832 / def.teeth;
      out.push(def.ang + Math.PI - tc * (0.5 - (def.ang - out[def.rel]) / tp));
    }
    return out;
  }
  // everything about the gears that only changes with the picture's size or the code
  var gearCache = null, gearKey = '';
  function gearLayout(w, h, pal, pid){
    var key = w + 'x' + h + pid;
    if (gearCache && gearKey === key) return gearCache;
    var m = Math.min(w, h), mod = GEAR_PITCH * m / Math.PI, out = [], n = 0;
    for (var ci = 0; ci < GEAR_CLUSTERS.length; ci++){
      var cluster = GEAR_CLUSTERS[ci], laid = layoutCluster(cluster, w, h), ratios = ratiosFor(cluster, laid), ph = phasesFor(cluster);
      for (var i = 0; i < laid.length; i++){
        var g = laid[i], r = g.r;
        g.ratio = ratios[i]; g.phase = ph[i]; g.mod = mod; g.cluster = ci;
        // metal, tinted by the palette (by a hue of its own under the rainbow code)
        var tint = pal.rainbow ? hslHex(n++ * 47, 0.7, 0.6) : pal.accent, tint2 = pal.rainbow ? tint : pal.rim;
        var lightC = mix(pal.light ? '#F4F4F2' : '#D6D6D2', tint, 0.25), midC = mix(pal.light ? '#8E9099' : '#6E7079', tint2, 0.38), darkC = mix('#2C2D34', pal.bg2, 0.35);
        var body = ctx.createRadialGradient(-r * 0.45, -r * 0.55, r * 0.05, 0, 0, r * 1.2);
        body.addColorStop(0, lightC); body.addColorStop(0.5, midC); body.addColorStop(1, darkC);
        var bev = ctx.createLinearGradient(-r, -r, r, r);
        bev.addColorStop(0, 'rgba(255,255,255,0.55)'); bev.addColorStop(0.5, 'rgba(255,255,255,0)'); bev.addColorStop(1, 'rgba(0,0,0,0.4)');
        var bevIn = ctx.createLinearGradient(-r, -r, r, r);
        bevIn.addColorStop(0, 'rgba(0,0,0,0.45)'); bevIn.addColorStop(0.5, 'rgba(0,0,0,0)'); bevIn.addColorStop(1, 'rgba(255,255,255,0.45)');
        var hub = ctx.createRadialGradient(-r * 0.08, -r * 0.08, 0, 0, 0, r * 0.22);
        hub.addColorStop(0, lightC); hub.addColorStop(1, midC);
        g.body = body; g.bev = bev; g.bevIn = bevIn; g.hub = hub; g.edge = rgba(darkC, 0.75); g.axle = darkC;
        out.push(g);
      }
    }
    gearKey = key;
    return (gearCache = out);
  }
  // one gear's outline as one path: trapezoid teeth on the root circle, and the
  // cut-outs between the spokes (filled even-odd, so they are holes)
  function gearPath(g, angle){
    var r = g.r, N = g.teeth, mod = g.mod, ro = r + TOOTH_ADD * mod, rr = r - TOOTH_DED * mod, th = 6.2832 / N, j, a, tt = TOOTH_TIP * th, tr = TOOTH_ROOT * th;
    ctx.beginPath();
    for (j = 0; j < N; j++){
      a = angle + j * th;
      if (j === 0) ctx.moveTo(Math.cos(a - tr) * rr, Math.sin(a - tr) * rr);
      else ctx.lineTo(Math.cos(a - tr) * rr, Math.sin(a - tr) * rr);
      ctx.lineTo(Math.cos(a - tt) * ro, Math.sin(a - tt) * ro);
      ctx.lineTo(Math.cos(a + tt) * ro, Math.sin(a + tt) * ro);
      ctx.lineTo(Math.cos(a + tr) * rr, Math.sin(a + tr) * rr);
      ctx.arc(0, 0, rr, a + tr, a + th - tr);
    }
    ctx.closePath();
    var rimIn = rr - mod * 2.2, hubR = r * 0.34, S = N >= 20 ? 5 : N >= 14 ? 4 : 3, sw = r * 0.085;
    if (rimIn - hubR > r * 0.16){
      for (var s = 0; s < S; s++){
        var a0 = angle + s * 6.2832 / S + 0.3, a1 = a0 + 6.2832 / S, po = sw / rimIn, pin = sw / hubR;
        ctx.moveTo(Math.cos(a0 + po) * rimIn, Math.sin(a0 + po) * rimIn);
        ctx.arc(0, 0, rimIn, a0 + po, a1 - po);
        ctx.arc(0, 0, hubR, a1 - pin, a0 + pin, true);
        ctx.closePath();
      }
    }
    return rimIn;
  }
  function drawGear(g, angle, pal, k){
    var r = g.r, rr = r - TOOTH_DED * g.mod;
    // a hard shadow, offset down and right
    ctx.save();
    ctx.translate(g.x + r * 0.05, g.y + r * 0.08);
    gearPath(g, angle);
    ctx.fillStyle = pal.light ? 'rgba(40,30,20,0.18)' : 'rgba(0,0,0,0.35)';
    ctx.fill('evenodd');
    ctx.restore();
    // the gear: lit from the top left whichever way it has turned
    ctx.save();
    ctx.translate(g.x, g.y);
    var rimIn = gearPath(g, angle);
    ctx.fillStyle = g.body;
    ctx.fill('evenodd');
    ctx.strokeStyle = g.edge;
    ctx.lineWidth = Math.max(0.8 * k, r * 0.012);
    ctx.stroke();
    // the bevelled rim: its face catches the light top left, the inner cut edge bottom right
    ctx.lineWidth = g.mod * 0.9;
    ctx.strokeStyle = g.bev;
    ctx.beginPath();
    ctx.arc(0, 0, rr - g.mod * 0.6, 0, 6.2832);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8 * k, g.mod * 0.45);
    ctx.strokeStyle = g.bevIn;
    ctx.beginPath();
    ctx.arc(0, 0, rimIn + g.mod * 0.2, 0, 6.2832);
    ctx.stroke();
    // the hub and its axle
    ctx.fillStyle = g.hub;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, 6.2832);
    ctx.fill();
    ctx.strokeStyle = g.bev;
    ctx.stroke();
    ctx.fillStyle = g.axle;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.065, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }
  var gearDrive = 0, gearKick = 0, gearOmegaNow = 0;
  function stepGears(w, h, k, dt, cfg, pal, pid){
    var gears = gearLayout(w, h, pal, pid);
    // speed follows the music: all but still in a calm passage, a busy clockwork in a big one
    gearDrive = U.env(gearDrive, A.drive, 2.5, 1.2, dt);
    gearKick = Math.max(gearKick * Math.exp(-5 * dt), A.kickHit > 0.4 ? A.kickHit * A.drive * A.drive : 0);
    var pace = cfg.handSpeed * (0.04 + 0.15 * gearDrive + 1.4 * gearDrive * gearDrive + 0.6 * gearKick);
    gearOmegaNow = 0.32 * pace;
    for (var ci = 0; ci < GEAR_CLUSTERS.length; ci++){
      gearMasterAngle[ci] += (ci % 2 === 0 ? 1 : -1) * (0.32 + ci * 0.05) * pace * dt;
    }
    for (var i = 0; i < gears.length; i++){
      var g = gears[i];
      drawGear(g, gearMasterAngle[g.cluster] * g.ratio + g.phase, pal, k);
    }
  }
  // a warm light low in the frame, so the sand pile reads as lit, and fine engraved arcs
  function paintGearsBG(c, w, h, k, pal){
    var glow = c.createRadialGradient(w / 2, h * 0.98, 0, w / 2, h * 0.98, w * 0.6);
    glow.addColorStop(0, rgba(pal.accent, pal.light ? 0.2 : 0.16));
    glow.addColorStop(1, rgba(pal.accent, 0));
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = rgba(pal.rim, 0.07);
    c.lineWidth = Math.max(1 * k, w * 0.0015);
    for (var i = 0; i < 3; i++){
      c.beginPath();
      c.arc(w / 2, h * 0.98, w * (0.5 + i * 0.16), Math.PI * 1.08, Math.PI * 1.92);
      c.stroke();
    }
  }

  /* ---------- Gears: the sand pile, fed like an hourglass ----------
     The pile is a row of column heights. A thin stream pours from under the
     dial onto it; where the slope gets steeper than sand can hold, the
     column slides down to the gentler slope it rests at (small avalanches);
     a kick throws a little spray up that falls back. How much sand there
     is follows the energy of the music, and the pile settles slowly. */
  var SAND_N = 120, sandH = new Float32Array(SAND_N), sandW = 0, sandHh = 0, sandBits = [];
  var sandEnergy = 0, sandFeed = 0, sprayCd = 0, sandPeak = 0, sandFlip = 0;
  var REST = 0.42, SLIP = 0.62;   // height over width: the slope sand rests at, and the one it slides at
  var SAND_RAMP = ['#F3E1B4', '#E2C48A', '#CDA264', '#A87E47', '#7C5933'];
  function sandTone(j, pal){ return mix(mix(SAND_RAMP[j], pal.accent, 0.16), pal.bg2, pal.light ? 0 : 0.18); }
  var sandPat = null, sandPatKey = '';
  function sandPattern(pal, k){
    var key = pal.accent + pal.bg2 + k;
    if (sandPat && sandPatKey === key) return sandPat;
    var n = 96, cv = document.createElement('canvas');
    cv.width = cv.height = n;
    var c = cv.getContext('2d');
    for (var i = 0; i < 900; i++){
      c.fillStyle = pal.rainbow && Math.random() < 0.22 ? hslHex(Math.random() * 360, 0.8, 0.6) : sandTone(Math.floor(Math.random() * 5), pal);
      c.globalAlpha = 0.35 + Math.random() * 0.55;
      var s = (0.6 + Math.random() * 1.1) * Math.max(1, k * 0.8);
      c.fillRect(Math.random() * n, Math.random() * n, s, s);
    }
    sandPatKey = key;
    return (sandPat = ctx.createPattern(cv, 'repeat'));
  }
  function surfaceAt(x, cw){
    var f = x / cw, i = Math.max(0, Math.min(SAND_N - 2, Math.floor(f))), t = Math.max(0, Math.min(1, f - i));
    return sandH[i] + (sandH[i + 1] - sandH[i]) * t;
  }
  // Where the sand pours from: from under the dial when there is room below it
  // (an upright picture), else two thin streams from the top, either side of the crown
  function sandStreams(w, h, cx, cy, R){
    var m = Math.min(w, h);
    if (h - (cy + R * 1.55) > m * 0.15) return [{ x: cx, y: cy + R * 1.08, hMax: Math.min(m * 0.2, (h - cy - R * 1.55) * 0.8) }];
    var side = Math.max(w * 0.06, (cx - R * 1.6) * 0.55);
    return [{ x: side, y: 0, hMax: m * 0.2 }, { x: w - side, y: 0, hMax: m * 0.2 }];
  }
  var sandDisp = new Float32Array(SAND_N), sandTmp = new Float32Array(SAND_N), sandStreamsNow = [];
  function stepSand(w, h, k, dt, cfg, pal, cx, cy, R){
    var m = Math.min(w, h), cw = w / (SAND_N - 1), i, st, streams = sandStreamsNow = sandStreams(w, h, cx, cy, R), nSt = streams.length;
    if (sandW !== w || sandHh !== h){
      // a new size: start from a small heap under each stream, so the design never opens on a bare floor
      sandW = w; sandHh = h; sandBits = [];
      for (i = 0; i < SAND_N; i++){
        sandH[i] = 0;
        for (st = 0; st < nSt; st++) sandH[i] = Math.max(sandH[i], m * 0.04 - Math.abs(i - streams[st].x / cw) * cw * REST);
      }
    }
    // how big the pile wants to be: from the music's energy, never up to the stream's mouth
    sandEnergy = U.env(sandEnergy, A.drive, 0.6, 0.25, dt);
    var Hpk = Math.min(Math.max(m * 0.04, streams[0].hMax), m * (0.045 + 0.17 * sandEnergy) * (0.7 + 0.3 * cfg.density));
    var target = nSt * Hpk * Hpk / ((REST + SLIP) / 2), area = 0;
    for (i = 0; i < SAND_N; i++) area += sandH[i] * cw;
    // the streams: a dribble always, a pour while the pile is short of what the music asks
    sandFeed = Math.max(0, target - area) * 0.5 + target * 0.03;
    for (st = 0; st < nSt; st++){
      var ci = Math.max(1, Math.min(SAND_N - 2, Math.round(streams[st].x / cw))), add = sandFeed / nSt * dt / cw;
      sandH[ci - 1] += add * 0.25; sandH[ci] += add * 0.5; sandH[ci + 1] += add * 0.25;
      streams[st].col = ci;
    }
    // settling: a pile bigger than the music asks sinks slowly
    if (area > target){
      var keep = 1 - Math.min(0.2, 0.3 * dt * (area - target) / area);
      for (i = 0; i < SAND_N; i++) sandH[i] *= keep;
    }
    // avalanches: a slope steeper than sand holds slides down to the slope it rests at
    var slip = SLIP * cw, rest = REST * cw;
    sandFlip ^= 1;
    for (var pass = 0; pass < 2; pass++){
      var fwd = (pass ^ sandFlip) === 0;
      for (var q = 0; q < SAND_N - 1; q++){
        i = fwd ? q : SAND_N - 2 - q;
        var d = sandH[i] - sandH[i + 1];
        if (d > slip || d < -slip){
          var mv = (Math.abs(d) - rest) * 0.5, from = d > 0 ? i : i + 1, to = d > 0 ? i + 1 : i;
          sandH[from] -= mv; sandH[to] += mv;
          if (mv > cw * 0.05 && sandBits.length < 150 && Math.random() < 0.2)
            sandBits.push({ t: 2, x: from * cw, y: 0, vx: (to > from ? 1 : -1) * (25 + Math.random() * 45) * k, vy: 0,
                            life: 0.4 + Math.random() * 0.6, c: Math.floor(Math.random() * 4), s: (1 + Math.random()) * k });
        }
      }
    }
    // a kick throws a little spray up off the top of a pile
    sprayCd -= dt;
    if (A.kickHit > 0.5 && A.drive > 0.15 && sprayCd <= 0){
      sprayCd = 0.18;
      var nS = Math.round(6 + 18 * A.kickHit * A.drive);
      for (var s = 0; s < nS && sandBits.length < 170; s++){
        var sc = streams[s % nSt].col, col = Math.max(1, Math.min(SAND_N - 2, sc + Math.round((Math.random() - 0.5) * 16))), vol = 4 * k * k;
        if (sandH[col] * cw < vol * 3) continue;
        sandH[col] -= vol / cw;
        sandBits.push({ t: 1, x: col * cw, y: h - sandH[col], vx: (Math.random() - 0.5) * 140 * k,
                        vy: -(90 + Math.random() * 220) * k * (0.5 + A.kickHit * 0.7), vol: vol,
                        c: Math.floor(Math.random() * 4), s: (1.2 + Math.random()) * k });
      }
    }
    // grains of the streams (only for the eye: the sand they bring is added above)
    var want = Math.min(2 * nSt, sandFeed * dt / (5 * k * k)), nStream = 0;
    for (i = 0; i < sandBits.length; i++) if (sandBits[i].t === 0) nStream++;
    while (want > 0 && nStream < 90 && sandBits.length < 200){
      if (Math.random() < Math.min(1, want)){
        var so = streams[Math.floor(Math.random() * nSt)];
        sandBits.push({ t: 0, x: so.x + (Math.random() - 0.5) * 3 * k, y: so.y, vx: (Math.random() - 0.5) * 6 * k, vy: (so.y > 0 ? 25 : 160) * k * (1 + Math.random()),
                        c: Math.floor(Math.random() * 3), s: (1 + Math.random() * 0.8) * k });
        nStream++;
      }
      want -= 1;
    }

    // the pile: one smooth filled curve through the column tops (drawn a little smoothed, so crests are round)
    var top = h, src = sandH;
    for (var sm = 0; sm < 2; sm++){
      var dst = sm ? sandDisp : sandTmp;
      for (i = 0; i < SAND_N; i++){
        var a2 = src[Math.max(0, i - 2)], a1 = src[Math.max(0, i - 1)], b1 = src[Math.min(SAND_N - 1, i + 1)], b2 = src[Math.min(SAND_N - 1, i + 2)];
        dst[i] = (a2 + 4 * a1 + 6 * src[i] + 4 * b1 + b2) / 16;
      }
      src = dst;
    }
    for (i = 0; i < SAND_N; i++) if (h - sandDisp[i] < top) top = h - sandDisp[i];
    sandPeak = h - top;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h + 2);
    ctx.lineTo(0, h - sandDisp[0]);
    for (i = 0; i < SAND_N - 1; i++) ctx.quadraticCurveTo(i * cw, h - sandDisp[i], (i + 0.5) * cw, h - (sandDisp[i] + sandDisp[i + 1]) / 2);
    ctx.lineTo(w, h - sandDisp[SAND_N - 1]);
    ctx.lineTo(w, h + 2);
    ctx.closePath();
    var fill = ctx.createLinearGradient(0, top, 0, h);
    fill.addColorStop(0, sandTone(1, pal)); fill.addColorStop(0.5, sandTone(2, pal)); fill.addColorStop(1, sandTone(4, pal));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // grain texture
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = sandPattern(pal, k);
    ctx.fillRect(0, top, w, h - top);
    // shading: faces turned to the light (top left) are brighter, the others darker; soft at the crests
    ctx.globalAlpha = 1;
    for (i = 0; i < SAND_N - 1; i++){
      if (sandDisp[i] < 1 && sandDisp[i + 1] < 1) continue;
      var sl = (sandDisp[i + 1] - sandDisp[i]) / cw, al = Math.round(Math.min(0.13, Math.abs(sl) * 0.22) * 100) / 100;
      if (al < 0.02) continue;
      ctx.fillStyle = sl > 0 ? 'rgba(255,248,230,' + al + ')' : 'rgba(70,40,12,' + al + ')';
      ctx.fillRect(i * cw + cw * 0.5, top, cw + 0.6, h - top);
    }
    ctx.restore();
    // the lit edge of the surface
    ctx.strokeStyle = rgba(sandTone(0, pal), 0.75);
    ctx.lineWidth = 1.2 * k;
    ctx.stroke();
    ctx.restore();

    // grains: the streams (drawn behind the gears, by drawSandStreams), the spray and the ones rolling down a slope
    var gr = 900 * k;
    for (var b = sandBits.length - 1; b >= 0; b--){
      var p = sandBits[b];
      if (p.t === 2){
        p.life -= dt;
        p.x += p.vx * dt;
        if (p.life <= 0 || p.x < 0 || p.x > w){ sandBits.splice(b, 1); continue; }
        p.y = h - surfaceAt(p.x, cw) - p.s * 0.6;
      } else {
        p.vy += gr * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -10 * k || p.x > w + 10 * k){ sandBits.splice(b, 1); continue; }
        if (p.vy > 0 && p.y >= h - surfaceAt(p.x, cw)){
          if (p.t === 1){ var lc = Math.max(0, Math.min(SAND_N - 1, Math.round(p.x / cw))); sandH[lc] += p.vol / cw; }
          sandBits.splice(b, 1);
          continue;
        }
        if (p.t === 0) continue;
      }
      ctx.fillStyle = sandTone(p.c, pal);
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
  }
  // the streams themselves: a thin line of falling sand, thicker when it pours, and its grains
  function drawSandStreams(w, h, k, pal){
    if (!sandW) return;
    var cw = w / (SAND_N - 1), target = Math.max(1, sandPeak * sandPeak / ((REST + SLIP) / 2) * sandStreamsNow.length);
    ctx.save();
    ctx.strokeStyle = rgba(sandTone(1, pal), 0.55);
    ctx.lineWidth = (0.6 + Math.min(2, sandFeed / target * 4)) * k;
    ctx.beginPath();
    for (var st = 0; st < sandStreamsNow.length; st++){
      var so = sandStreamsNow[st], surf = h - surfaceAt(so.x, cw);
      if (surf > so.y){ ctx.moveTo(so.x, so.y); ctx.lineTo(so.x, surf); }
    }
    ctx.stroke();
    for (var b = 0; b < sandBits.length; b++){
      var p = sandBits[b];
      if (p.t !== 0) continue;
      ctx.fillStyle = sandTone(p.c, pal);
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    ctx.restore();
  }

  /* ---------- Garden: hills, two vines that grow and sway, leaves and pollen ---------- */
  function paintGardenBG(c, w, h, pal){
    c.fillStyle = rgba(mix(pal.rim, pal.bg2, 0.55), pal.light ? 0.3 : 0.4);
    c.beginPath();
    c.moveTo(0, h * 0.8);
    c.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.62, h * 0.8);
    c.quadraticCurveTo(w * 0.85, h * 0.88, w, h * 0.74);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    c.fillStyle = rgba(mix(pal.rim, pal.bg2, 0.3), pal.light ? 0.32 : 0.5);
    c.beginPath();
    c.moveTo(0, h * 0.86);
    c.quadraticCurveTo(w * 0.25, h * 0.74, w * 0.5, h * 0.86);
    c.quadraticCurveTo(w * 0.78, h * 0.96, w, h * 0.84);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
  }
  var VINE_N = 16, vineGrow = 0.4, vineSway = 0, vinePhase = 0, vineAmpNow = 0;
  function leafColour(pal, j){
    return pal.rainbow ? rbCol(j / VINE_N, pal) : pal.light ? mix('#3F8A47', pal.rim, 0.35) : mix('#5FB86A', pal.accent, 0.45);
  }
  function stepVines(w, h, k, dt, cfg, pal){
    var m = Math.min(w, h);
    // reach grows with a big passage and shrinks back slowly; the sway is nothing when calm
    vineGrow = U.env(vineGrow, 0.4 + 0.6 * A.drive, 0.5, 0.05, dt);
    vineSway = U.env(vineSway, A.drive, 2, 0.6, dt);
    vinePhase += dt * (0.3 + 2.8 * vineSway) * cfg.handSpeed;
    var amp = m * 0.07 * Math.max(0, vineSway - 0.12) / 0.88 + m * 0.012 * A.kick * vineSway;
    vineAmpNow = amp / m;
    var seg = h * 0.85 / VINE_N, shown = vineGrow * VINE_N;
    var stem = pal.light ? mix(pal.rim, '#2F5A2C', 0.3) : mix(pal.rim, pal.bg1, 0.3);
    for (var side = 0; side < 2; side++){
      var dir = side === 0 ? 1 : -1, edgeX = side === 0 ? 0 : w, xs = [], ys = [], j;
      var nn = Math.min(VINE_N, Math.ceil(shown));
      for (j = 0; j <= nn; j++){
        var t = j / VINE_N, jj = Math.min(j, shown);
        xs.push(edgeX + dir * (m * 0.035 + m * 0.03 * Math.sin(t * 5.5 + side * 1.3) + amp * Math.pow(jj / VINE_N, 1.6) * Math.sin(vinePhase - t * 2.4 + side * 0.9)));
        ys.push(h - jj * seg);
      }
      // the stem, thinner towards its tip
      ctx.lineCap = 'round';
      ctx.strokeStyle = stem;
      for (j = 0; j < nn; j++){
        ctx.lineWidth = Math.max(1 * k, m * 0.009 * (1 - j / VINE_N * 0.75));
        ctx.beginPath();
        ctx.moveTo(j === 0 ? xs[0] : (xs[j - 1] + xs[j]) / 2, j === 0 ? ys[0] : (ys[j - 1] + ys[j]) / 2);
        ctx.quadraticCurveTo(xs[j], ys[j], (xs[j] + xs[j + 1]) / 2, (ys[j] + ys[j + 1]) / 2);
        ctx.stroke();
      }
      // leaves at the nodes, on alternate sides, unfolding as the vine reaches them; they flutter with the music
      for (j = 1; j < nn; j++){
        var grown = Math.max(0, Math.min(1, shown - j)), ls0 = m * (0.045 + 0.02 * hash(j * 3.7 + side)) * grown;
        if (ls0 < 1 * k) continue;
        var alt = j % 2 ? 1 : -1;
        // two leaves a node: a big one to one side, a smaller one to the other
        for (var lf = 0; lf < 2; lf++){
          var ls = ls0 * (lf ? 0.62 : 1), sideA = lf ? -alt : alt;
          var la = -Math.PI / 2 + dir * sideA * (0.85 + 0.25 * lf) + (amp / m) * 6 * Math.sin(vinePhase * 1.7 + j * 1.1 + side + lf * 2);
          ctx.save();
          ctx.translate(xs[j], ys[j]);
          ctx.rotate(la);
          ctx.fillStyle = leafColour(pal, j + lf * 5);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(ls * 0.45, -ls * 0.4, ls, 0);
          ctx.quadraticCurveTo(ls * 0.45, ls * 0.4, 0, 0);
          ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(ls, 0);
          ctx.quadraticCurveTo(ls * 0.45, ls * 0.4, 0, 0);
          ctx.fill();
          ctx.strokeStyle = rgba(stem, 0.7);
          ctx.lineWidth = Math.max(0.6 * k, ls * 0.04);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(ls * 0.85, 0);
          ctx.stroke();
          ctx.restore();
        }
      }
      // a flower at the tip, open when the music is big
      var fr = m * (0.006 + 0.014 * A.drive) * Math.min(1, shown / 3), tx = xs[nn], ty = ys[nn];
      ctx.fillStyle = pal.rainbow ? rbCol(vinePhase * 0.05 + side * 0.5, pal) : pal.accent;
      for (var pt = 0; pt < 5; pt++){
        var pa = pt / 5 * 6.283 + vinePhase * 0.2;
        ctx.beginPath();
        ctx.arc(tx + Math.cos(pa) * fr, ty + Math.sin(pa) * fr, fr * 0.75, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = pal.numeral;
      ctx.beginPath();
      ctx.arc(tx, ty, fr * 0.55, 0, 6.283);
      ctx.fill();
    }
  }
  var leafParts = [];
  function spawnLeaf(x, y){
    leafParts.push({ x: x, y: y, vy: -(16 + Math.random() * 34) * Can.dpr(), vx: (Math.random() - 0.5) * 26 * Can.dpr(),
                      ph: Math.random() * 6.283, life: 0, maxLife: 5 + Math.random() * 5,
                      leaf: Math.random() < 0.55, j: Math.floor(Math.random() * VINE_N) });
  }
  function stepLeaves(w, h, k, dt, cfg, pal){
    if (leafParts.length < 120 && Math.random() < (0.05 + A.drive * 2.2) * cfg.density * dt * 8) spawnLeaf(Math.random() * w, h + 6 * k);
    var pollen = pal.rainbow ? null : pal.light ? '#E3A92E' : pal.accent;
    for (var i = leafParts.length - 1; i >= 0; i--){
      var p = leafParts[i];
      p.life += dt;
      if (p.life > p.maxLife || p.y < -10 * k){ leafParts.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(A.t * 1.3 + p.ph) * 14 * k) * dt;
      p.y += p.vy * dt;
      var fade = Math.min(1, p.life / 0.5) * Math.min(1, (p.maxLife - p.life) / 0.7);
      if (p.leaf){
        ctx.save();
        ctx.globalAlpha = fade * 0.85;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ph + Math.sin(A.t * 1.6 + p.ph) * 0.8);
        ctx.fillStyle = leafColour(pal, p.j);
        ctx.beginPath();
        ctx.moveTo(-4 * k, 0);
        ctx.quadraticCurveTo(0, -2.4 * k, 4 * k, 0);
        ctx.quadraticCurveTo(0, 2.4 * k, -4 * k, 0);
        ctx.fill();
        ctx.restore();
      } else {
        var s = 7 * k;
        ctx.globalAlpha = fade * 0.9;
        ctx.drawImage(glowDot(pollen || rbCol(p.ph / 6.283, pal)), p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Grid: a perspective grid, circuit traces, glitches ---------- */
  var gridScroll = 0, gridDrive = 0;
  function stepGrid(w, h, k, dt, cfg, pal){
    gridDrive = U.env(gridDrive, A.drive, 3, 0.8, dt);
    gridScroll += dt * (6 + 120 * gridDrive * gridDrive) * k * cfg.handSpeed;
    var horizon = h * 0.6, vanishX = w / 2, rb = pal.rainbow, i;
    ctx.save();
    // a band of light on the horizon
    var hg = ctx.createLinearGradient(0, horizon - h * 0.1, 0, horizon + h * 0.03);
    hg.addColorStop(0, rgba(pal.accent, 0));
    hg.addColorStop(0.75, rgba(pal.accent, 0.1 + 0.2 * gridDrive));
    hg.addColorStop(1, rgba(pal.accent, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - h * 0.1, w, h * 0.13);
    ctx.lineWidth = Math.max(1, k);
    ctx.globalAlpha = pal.light ? 0.3 : 0.22;
    ctx.strokeStyle = pal.rim;
    if (!rb) ctx.beginPath();
    for (i = -8; i <= 8; i++){
      if (rb){ ctx.strokeStyle = rbCol((i + 8) / 17, pal); ctx.beginPath(); }
      ctx.moveTo(vanishX + i * w * 0.01, horizon);
      ctx.lineTo(vanishX + i * w * 0.16, h);
      if (rb) ctx.stroke();
    }
    if (!rb) ctx.stroke();
    var rows = 8;
    for (var j = 0; j < rows; j++){
      var f = (j + (gridScroll / (h * 0.12)) % 1) / rows, yy = horizon + (h - horizon) * (f * f);
      ctx.globalAlpha = (0.12 + f * 0.4) * (pal.light ? 1.2 : 1);
      ctx.strokeStyle = rb ? rbCol(j / rows + A.t * 0.05, pal) : pal.rim;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    // circuit traces in the sky; pulses run along them when the music is big
    ctx.lineWidth = 1.4 * k;
    for (var c = 0; c < 6; c++){
      var sx = hash(c * 3.1 + 1) * w * 0.9, sy = h * 0.05 + hash(c * 7.7 + 2) * horizon * 0.75;
      var l1 = (30 + hash(c * 5.3) * 60) * k, l2 = (18 + hash(c * 2.9) * 30) * k * (c % 2 ? 1 : -1), l3 = (30 + hash(c * 9.1) * 60) * k;
      var col = rb ? rbCol(c / 6, pal) : pal.accent;
      ctx.globalAlpha = Math.min(0.9, 0.18 + 0.35 * gridDrive + A.punch * 0.3);
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + l1, sy);
      ctx.lineTo(sx + l1, sy + l2);
      ctx.lineTo(sx + l1 + l3, sy + l2);
      ctx.stroke();
      ctx.fillStyle = pal.rim;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 * k, 0, 6.283);
      ctx.arc(sx + l1 + l3, sy + l2, 2 * k, 0, 6.283);
      ctx.fill();
      if (gridDrive > 0.15){
        var tot = l1 + Math.abs(l2) + l3, d = ((A.t * (0.2 + 1.4 * gridDrive) + hash(c * 4.4)) % 1) * tot, px, py;
        if (d < l1){ px = sx + d; py = sy; }
        else if (d < l1 + Math.abs(l2)){ px = sx + l1; py = sy + (d - l1) * (l2 < 0 ? -1 : 1); }
        else { px = sx + l1 + (d - l1 - Math.abs(l2)); py = sy + l2; }
        var ps = 9 * k;
        ctx.globalAlpha = Math.min(1, (gridDrive - 0.15) * 3);
        ctx.drawImage(glowDot(col), px - ps / 2, py - ps / 2, ps, ps);
      }
    }
    ctx.restore();
  }
  var glitches = [];
  function spawnGlitch(x, y, pal){
    glitches.push({ x: x, y: y, w: (6 + Math.random() * 26) * Can.dpr(), h: (2 + Math.random() * 6) * Can.dpr(),
                    life: 0.06 + Math.random() * 0.12, age: 0,
                    col: pal.rainbow ? rbCol(Math.random(), pal) : Math.random() < 0.5 ? pal.rim : pal.accent });
  }
  function stepGlitches(w, h, k, dt, cfg, pal){
    var want = (0.05 + 4 * gridDrive * gridDrive + (A.beat ? 6 * gridDrive : 0)) * cfg.density * dt * 8;
    while (want > 0 && glitches.length < 130){
      if (Math.random() < Math.min(1, want)) spawnGlitch(Math.random() * w, Math.random() * h, pal);
      want -= 1;
    }
    for (var i = glitches.length - 1; i >= 0; i--){
      var g = glitches[i];
      g.age += dt;
      if (g.age > g.life){ glitches.splice(i, 1); continue; }
      ctx.globalAlpha = (1 - g.age / g.life) * (pal.light ? 0.8 : 1);
      ctx.fillStyle = g.col;
      ctx.fillRect(g.x, g.y, g.w, g.h);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Sky: clouds, two unlike wings, feathers and motes ---------- */
  var clouds = [], cloudsReady = false, skyDrive = 0;
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
  function stepClouds(w, h, k, dt, cfg, pal){
    ensureClouds(w, h);
    skyDrive = U.env(skyDrive, A.drive, 2, 0.6, dt);
    ctx.fillStyle = pal.light ? 'rgba(255,255,255,0.7)' : rgba(mix(pal.bg1, pal.numeral, 0.3), 0.35);
    for (var i = 0; i < clouds.length; i++){
      var c = clouds[i];
      c.x += c.sp * k * dt * cfg.handSpeed * (0.3 + 1.6 * skyDrive);
      if (c.x > w + 60 * k) c.x = -60 * k;
      drawCloud(c.x, c.y, c.scale, k);
    }
  }
  // The wings, redrawn flat (item 24, after inspiration/wing-example.webp), and not a mirror pair:
  //   left   three long mechanical blades: a pale body with a darker lower facet, a dark spine and a
  //          long dark spear of a tip, a band of colour and a small claw near the root, hung on a
  //          strut from the shoulder with a thin hoop under it. They move stiffly: the wing tilts as
  //          one, and on a kick the blades snap apart like a fan.
  //   right  a fan of nine long, thin plumes from a pale shoulder plate, each in three flat bands
  //          (pale at the root, a middle tone, the full colour out to the tip) with a vein and two
  //          small splits in the trailing edge. They move softly: each plume follows the beat a
  //          little later than the one above it and flutters on its own.
  // Units: the dial's radius scaled to fit (unit), x outward from the shoulder, y down. Every part is
  // painted once into a small picture of its own (wingSprites) and only turned and placed each frame,
  // so the pair costs about fifteen copies a frame instead of hundreds of curves.
  var BLADES = [
    { x: 0.44, y: -0.30, ang: -0.5, len: 1.5, wid: 0.1, spread: -1 },
    { x: 0.56, y: -0.05, ang: -0.1, len: 1.68, wid: 0.11, spread: 0 },
    { x: 0.48, y: 0.22, ang: 0.32, len: 1.45, wid: 0.095, spread: 1 }
  ];
  var PLUMES = (function(){
    var out = [], n = 9;
    for (var i = 0; i < n; i++){
      var t = i / (n - 1);
      out.push({ t: t, x: 0.36 + 0.07 * Math.sin(t * Math.PI), y: -0.2 + 0.4 * t, ang: -0.55 + 1.4 * t,
                 len: 1.3 + 0.45 * Math.sin(Math.PI * (0.12 + 0.8 * t)), wid: 0.06 + 0.014 * Math.sin(t * Math.PI) });
    }
    return out;
  })();
  // a picture of one part: bounds in wing units (x0, y0, x1, y1), the pivot at the origin
  function partSprite(unit, x0, y0, x1, y1, paint){
    var cv = document.createElement('canvas');
    cv.width = Math.max(2, Math.ceil((x1 - x0) * unit));
    cv.height = Math.max(2, Math.ceil((y1 - y0) * unit));
    var c = cv.getContext('2d');
    c.setTransform(unit, 0, 0, unit, -x0 * unit, -y0 * unit);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    paint(c);
    return { cv: cv, ox: x0 * unit, oy: y0 * unit };
  }
  function paintBlade(c, L, W, col, lw){
    // body
    c.beginPath();
    c.moveTo(0, -0.35 * W);
    c.bezierCurveTo(0.15 * L, -1.1 * W, 0.45 * L, -1.0 * W, 0.62 * L, -0.55 * W);
    c.lineTo(0.66 * L, 0.2 * W);
    c.bezierCurveTo(0.45 * L, 0.75 * W, 0.2 * L, 0.8 * W, 0, 0.35 * W);
    c.closePath();
    c.fillStyle = col.body; c.fill();
    c.strokeStyle = col.edge; c.lineWidth = lw; c.stroke();
    // the lower facet, one flat shade
    c.beginPath();
    c.moveTo(0, 0.05 * W);
    c.bezierCurveTo(0.2 * L, 0.25 * W, 0.45 * L, 0.32 * W, 0.66 * L, 0.2 * W);
    c.bezierCurveTo(0.45 * L, 0.75 * W, 0.2 * L, 0.8 * W, 0, 0.35 * W);
    c.closePath();
    c.fillStyle = col.shade; c.fill();
    // a line of colour along the lower edge
    c.beginPath();
    c.moveTo(0.12 * L, 0.6 * W);
    c.bezierCurveTo(0.3 * L, 0.82 * W, 0.5 * L, 0.66 * W, 0.64 * L, 0.3 * W);
    c.strokeStyle = col.band; c.lineWidth = 0.14 * W; c.stroke();
    // the dark spine along the upper edge
    c.beginPath();
    c.moveTo(0.08 * L, -0.72 * W);
    c.bezierCurveTo(0.25 * L, -1.16 * W, 0.45 * L, -1.06 * W, 0.57 * L, -0.68 * W);
    c.lineTo(0.53 * L, -0.52 * W);
    c.bezierCurveTo(0.42 * L, -0.86 * W, 0.25 * L, -0.92 * W, 0.1 * L, -0.52 * W);
    c.closePath();
    c.fillStyle = col.dark; c.fill();
    // the long dark spear of the tip
    c.beginPath();
    c.moveTo(0.5 * L, -0.64 * W);
    c.quadraticCurveTo(0.76 * L, -0.42 * W, L, 0);
    c.quadraticCurveTo(0.76 * L, 0.2 * W, 0.53 * L, 0.6 * W);
    c.quadraticCurveTo(0.63 * L, 0.02 * W, 0.5 * L, -0.64 * W);
    c.closePath();
    c.fillStyle = col.dark; c.fill();
    c.strokeStyle = col.edge; c.lineWidth = lw; c.stroke();
    // a light glint along the spear
    c.beginPath();
    c.moveTo(0.6 * L, -0.28 * W);
    c.quadraticCurveTo(0.8 * L, -0.16 * W, 0.94 * L, 0);
    c.strokeStyle = col.glint; c.lineWidth = 0.1 * W; c.stroke();
    // the band near the root, with a ribbon end hanging from it
    c.beginPath();
    c.moveTo(0.05 * L, -0.98 * W); c.lineTo(0.115 * L, -0.98 * W); c.lineTo(0.155 * L, 0.98 * W); c.lineTo(0.09 * L, 0.98 * W);
    c.closePath();
    c.moveTo(0.11 * L, 0.9 * W);
    c.quadraticCurveTo(0.1 * L, 1.55 * W, 0.02 * L, 1.95 * W);
    c.quadraticCurveTo(0.17 * L, 1.5 * W, 0.16 * L, 0.9 * W);
    c.closePath();
    c.fillStyle = col.band; c.fill();
    c.strokeStyle = col.edge; c.lineWidth = lw; c.stroke();
    // a small claw above the band
    c.beginPath();
    c.moveTo(0.125 * L, -0.9 * W);
    c.quadraticCurveTo(0.2 * L, -1.55 * W, 0.11 * L, -1.95 * W);
    c.quadraticCurveTo(0.25 * L, -1.5 * W, 0.19 * L, -0.85 * W);
    c.closePath();
    c.fillStyle = col.dark; c.fill();
  }
  function paintPlume(c, L, W, colr, pale, edge, lw){
    function outline(){
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(0.35 * L, -1.4 * W, 0.8 * L, -0.65 * W);
      c.quadraticCurveTo(0.95 * L, -0.25 * W, L, 0.45 * W);
      c.quadraticCurveTo(0.85 * L, 0.42 * W, 0.6 * L, 0.88 * W);
      c.quadraticCurveTo(0.25 * L, 1.1 * W, 0, 0);
      c.closePath();
    }
    // three flat bands, hard edges: pale at the root, a middle tone, the full colour
    var g = c.createLinearGradient(0, 0, L, 0), mid = mix(pale, colr, 0.55);
    g.addColorStop(0, pale); g.addColorStop(0.3, pale);
    g.addColorStop(0.3, mid); g.addColorStop(0.56, mid);
    g.addColorStop(0.56, colr); g.addColorStop(1, colr);
    outline();
    c.fillStyle = g; c.fill();
    // two small splits in the trailing edge
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.moveTo(0.5 * L, 1.2 * W); c.lineTo(0.43 * L, 0.35 * W); c.lineTo(0.47 * L, 1.2 * W); c.closePath();
    c.moveTo(0.74 * L, 0.9 * W); c.lineTo(0.66 * L, 0.3 * W); c.lineTo(0.7 * L, 0.9 * W); c.closePath();
    c.fill();
    c.restore();
    outline();
    c.strokeStyle = edge; c.lineWidth = lw; c.stroke();
    // the vein
    c.beginPath();
    c.moveTo(0.02 * L, 0.05 * W);
    c.quadraticCurveTo(0.5 * L, 0.05 * W, 0.92 * L, 0.2 * W);
    c.strokeStyle = edge; c.lineWidth = lw * 1.2; c.stroke();
  }
  var wingCache = null, wingKey = '';
  function wingSprites(unit, pal, pid){
    var key = unit.toFixed(1) + '|' + pid;
    if (wingCache && wingKey === key) return wingCache;
    var lw = Math.max(0.0035, 1 / unit);   // a hairline of about one pixel, in wing units
    var wA = pal.light ? '#FFFFFF' : mix(pal.numeral, '#FFFFFF', 0.3);
    var dark = pal.light ? pal.numeral : mix(pal.faceCenter, pal.rim, 0.45);
    var edge = pal.light ? mix(pal.numeral, '#FFFFFF', 0.25) : mix(pal.rim, '#FFFFFF', 0.15);
    var out = { blades: [], plumes: [] }, i;
    for (i = 0; i < BLADES.length; i++){
      var B = BLADES[i], L = B.len, W = B.wid;
      var col = { body: wA, shade: mix(wA, pal.rim, pal.light ? 0.16 : 0.3), dark: dark, edge: edge,
                  band: pal.rainbow ? rbCol(0.04 + i * 0.3, pal) : (i === 1 ? pal.secondHand : pal.accent),
                  glint: rgba(wA, 0.45) };
      out.blades.push(partSprite(unit, -0.03, -2.1 * W, L + 0.03, 2.1 * W, (function(L, W, col){
        return function(c){ paintBlade(c, L, W, col, lw); };
      })(L, W, col)));
    }
    for (i = 0; i < PLUMES.length; i++){
      var Pm = PLUMES[i], colr = pal.rainbow ? rbCol(0.02 + Pm.t * 0.8, pal) : mix(pal.accent, pal.rim, Pm.t);
      var pale = mix(wA, colr, 0.18), pedge = mix(colr, pal.light ? '#000000' : '#FFFFFF', 0.3);
      out.plumes.push(partSprite(unit, -0.03, -1.6 * Pm.wid - 0.02, Pm.len * 1.06 + 0.03, 1.3 * Pm.wid + 0.02, (function(L, W, colr, pale, pedge){
        return function(c){ paintPlume(c, L, W, colr, pale, pedge, lw); };
      })(Pm.len, Pm.wid, colr, pale, pedge)));
    }
    // the left wing's strut from the shoulder to the three blade roots, with a thin hoop under it
    out.strut = partSprite(unit, -0.12, -0.45, 0.72, 0.68, function(c){
      c.beginPath();
      c.arc(0.26, 0.3, 0.3, -0.4, 2.3);
      c.strokeStyle = edge; c.lineWidth = 0.012; c.stroke();
      c.beginPath();
      c.moveTo(-0.04, 0.02);
      c.quadraticCurveTo(0.24, -0.4, BLADES[0].x, BLADES[0].y);
      c.moveTo(-0.04, 0.02);
      c.quadraticCurveTo(0.3, -0.14, BLADES[1].x, BLADES[1].y);
      c.moveTo(-0.04, 0.02);
      c.quadraticCurveTo(0.22, 0.2, BLADES[2].x, BLADES[2].y);
      c.strokeStyle = edge; c.lineWidth = 0.055 + 2 * lw; c.stroke();
      c.strokeStyle = wA; c.lineWidth = 0.055; c.stroke();
      // joints
      c.beginPath();
      for (var j = 0; j < BLADES.length; j++){ c.moveTo(BLADES[j].x + 0.035, BLADES[j].y); c.arc(BLADES[j].x, BLADES[j].y, 0.035, 0, 6.283); }
      c.moveTo(0.03, 0.02); c.arc(-0.02, 0.02, 0.05, 0, 6.283);
      c.fillStyle = dark; c.fill();
      c.strokeStyle = edge; c.lineWidth = lw; c.stroke();
    });
    // the right wing's shoulder plate
    out.plate = partSprite(unit, -0.13, -0.45, 0.6, 0.3, function(c){
      c.scale(1.25, 1.2);
      c.beginPath();
      c.moveTo(-0.06, -0.1);
      c.quadraticCurveTo(0.16, -0.34, 0.42, -0.25);
      c.lineTo(0.33, -0.12);
      c.quadraticCurveTo(0.4, -0.02, 0.38, 0.1);
      c.quadraticCurveTo(0.16, 0.2, -0.05, 0.1);
      c.closePath();
      c.fillStyle = wA; c.fill();
      c.strokeStyle = edge; c.lineWidth = lw; c.stroke();
      c.beginPath();
      c.moveTo(-0.05, 0.03);
      c.quadraticCurveTo(0.18, 0.02, 0.36, 0.04);
      c.quadraticCurveTo(0.37, 0.08, 0.38, 0.1);
      c.quadraticCurveTo(0.16, 0.2, -0.05, 0.1);
      c.closePath();
      c.fillStyle = mix(wA, pal.rim, pal.light ? 0.16 : 0.3); c.fill();
      c.beginPath();
      c.moveTo(-0.04, -0.13);
      c.quadraticCurveTo(0.16, -0.36, 0.42, -0.25);
      c.lineTo(0.39, -0.21);
      c.quadraticCurveTo(0.17, -0.29, -0.01, -0.1);
      c.closePath();
      c.fillStyle = dark; c.fill();
    });
    wingKey = key;
    return (wingCache = out);
  }
  function placeSprite(s, x, y, ang){
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.drawImage(s.cv, s.ox, s.oy);
    ctx.restore();
  }
  var flapEnv = 0, flapPhase = 0, flapBeat = 0, flapAmpNow = 0;
  function drawWings(cx, cy, R, w, pal, k, dt, pid){
    // a breath when calm; a real beat of the wings in a big passage, a fast strong one on a kick
    flapEnv = U.env(flapEnv, A.drive, 1.5, 0.5, dt);
    if (A.kickHit > 0.5 && A.drive > 0.2) flapBeat = Math.max(flapBeat, A.kickHit * A.drive);
    flapBeat *= Math.exp(-3 * dt);
    flapPhase += dt * (0.7 + 3 * flapEnv + 5 * flapBeat);
    var amp = 0.015 + 0.32 * flapEnv * flapEnv + 0.25 * flapBeat;
    flapAmpNow = amp;
    var lift = amp * Math.sin(flapPhase), lift2 = amp * Math.sin(flapPhase - 0.5);
    // the wings fit the picture: across a wide one, and up to the top of a low one when raised. On a tall,
    // narrow one (a phone held upright) they are raised towards the free space above and may run off
    // the sides a little rather than shrink to nothing behind the crown
    var h = canvas.height, raise = h > w * 1.15 ? Math.min(0.6, 0.25 + (h / w - 1.15) * 0.8) : 0;
    var fitX = (w * 0.5 - R * 0.7 - 4 * k) / (R * 1.95 * (1 - 0.35 * raise));
    var ws = Math.min(1.1, Math.max(fitX, raise ? 0.85 : 0), (cy - R * 0.12) / (R * 1.6)), unit = R * ws;
    var S = wingSprites(unit, pal, pid), i, a, open;
    ctx.save();
    ctx.globalAlpha = 0.97;

    // left: the blades, then the strut over their roots
    ctx.save();
    ctx.translate(cx - R * 0.7, cy - R * 0.12);
    ctx.scale(-1, 1);
    ctx.rotate(-0.06 - raise - lift * 0.6);
    open = 0.14 * flapEnv * flapEnv + 0.24 * flapBeat;
    for (i = 0; i < BLADES.length; i++){
      var B = BLADES[i];
      a = B.ang + B.spread * open - lift * (0.1 + 0.1 * i);
      placeSprite(S.blades[i], B.x * unit, B.y * unit, a);
    }
    ctx.drawImage(S.strut.cv, S.strut.ox, S.strut.oy);
    ctx.restore();

    // right: the plumes, each a little behind the one above it, then the shoulder plate
    ctx.save();
    ctx.translate(cx + R * 0.7, cy - R * 0.12);
    ctx.rotate(-0.06 - raise - lift2 * 0.6);
    open = 0.12 * flapEnv * flapEnv + 0.16 * flapBeat;
    var flut = 0.008 + 0.05 * flapEnv * flapEnv;
    for (i = 0; i < PLUMES.length; i++){
      var Pm = PLUMES[i], lag = amp * Math.sin(flapPhase - 0.5 - Pm.t * 1.2);
      a = Pm.ang * (1 + open) - lag * (0.2 + 0.4 * Pm.t) + flut * Math.sin(A.t * (1.6 + 3 * flapEnv) + i * 1.7);
      placeSprite(S.plumes[i], Pm.x * unit, Pm.y * unit, a);
    }
    ctx.drawImage(S.plate.cv, S.plate.ox, S.plate.oy);
    ctx.restore();
    ctx.restore();
  }
  var motes = [];
  function spawnMote(x, y){
    motes.push({ x: x, y: y, vy: (8 + Math.random() * 16) * Can.dpr(), vx: (Math.random() - 0.5) * 22 * Can.dpr(),
                 ph: Math.random() * 6.283, life: 0, maxLife: 6 + Math.random() * 6, feather: Math.random() < 0.4,
                 hue: Math.floor(Math.random() * 12) / 12 });   // twelve hues, so the same few pictures are reused
  }
  // a small falling feather, drawn once per colour and size (item 24)
  var featherCache = {};
  function featherSprite(fill, edge, k){
    var key = fill + edge + k, s = featherCache[key];
    if (s) return s;
    s = document.createElement('canvas');
    s.width = Math.ceil(14 * k); s.height = Math.ceil(5 * k);
    var c = s.getContext('2d');
    c.fillStyle = fill;
    c.strokeStyle = edge;
    c.lineWidth = 0.8 * k;
    c.beginPath();
    c.ellipse(s.width / 2, s.height / 2, 6 * k, 1.8 * k, 0, 0, 6.283);
    c.fill();
    c.stroke();
    return (featherCache[key] = s);
  }
  function stepMotes(w, h, k, dt, cfg, pal){
    if (motes.length < 120 && Math.random() < (0.06 + A.drive * 1.6) * cfg.density * dt * 8) spawnMote(Math.random() * w, -8 * k);
    var wA = pal.light ? '#FFFFFF' : mix(pal.numeral, '#FFFFFF', 0.3), plainEdge = rgba(pal.rim, 0.6);
    for (var i = motes.length - 1; i >= 0; i--){
      var m = motes[i];
      m.life += dt;
      if (m.life > m.maxLife || m.y > h + 10 * k){ motes.splice(i, 1); continue; }
      m.x += (m.vx + Math.sin(A.t + m.ph) * 10 * k) * dt;
      m.y += m.vy * dt;
      var fade = Math.min(1, m.life / 0.6) * Math.min(1, (m.maxLife - m.life) / 0.8);
      if (m.feather){
        ctx.save();
        ctx.globalAlpha = fade * 0.9;
        ctx.translate(m.x, m.y);
        ctx.rotate(m.ph + Math.sin(A.t * 1.2 + m.ph) * 0.5);
        var fs = featherSprite(wA, pal.rainbow ? rbCol(m.hue, pal) : plainEdge, k);
        ctx.drawImage(fs, -fs.width / 2, -fs.height / 2);
        ctx.restore();
      } else {
        var s = 8 * k;
        ctx.globalAlpha = fade * 0.85;
        ctx.drawImage(glowDot(pal.rainbow ? rbCol(m.hue, pal) : pal.light ? mix(pal.accent, '#FFFFFF', 0.2) : mix(pal.accent, '#FFFFFF', 0.5)), m.x - s / 2, m.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- dispatch ---------- */
  function paintBG(c, w, h, k){
    var d = designId(), pal = PALETTES[paletteId()].pal;
    if (d === 'garden') paintGardenBG(c, w, h, pal);
    else if (d === 'gears') paintGearsBG(c, w, h, k || 1, pal);
  }
  function bgColors(){
    var pal = PALETTES[paletteId()].pal;
    return { bg1: pal.bg1, bg2: pal.bg2 };
  }
  function draw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt, cfg = Cfg.CFG.clock;
    var design = designId(), pid = paletteId(), P = PALETTES[pid], pal = P.pal;
    var style = design + '|' + pid;
    // a new design or code starts with no drifting characters: the old ones carry the old glyphs and way of moving
    if (style !== lastStyle){ orbit = []; lastStyle = style; Can.invalidateBG(); }
    Can.backdrop(1);
    // the dial is 0.3 of the short side, so the loudest crown (1.52 radii) still ends inside the picture
    var R = Math.min(w, h) * 0.3, cx = w / 2, cy = h * 0.5;
    var form = FORMS[pid] || FORMS.omega;
    // a soft light behind the clock, brighter in a big part of the song; the rainbow code: rainbow light
    var hA = (0.08 + 0.2 * A.drive) * (0.4 + cfg.glow);
    if (pal.rainbow){
      var gs = R * 5;
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.4 + 1.2 * hA);
      ctx.translate(cx, cy);
      ctx.rotate(A.t * 0.05);
      ctx.drawImage(rainbowGlow(), -gs / 2, -gs / 2, gs, gs);
      ctx.restore();
    } else {
      var halo = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 2.4);
      halo.addColorStop(0, rgba(pal.accent, hA));
      halo.addColorStop(1, rgba(pal.accent, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
    }

    if (design === 'classic') stepOrbit(w, h, cx, cy, R, k, dt, cfg, pal, P.decor);
    else if (design === 'gears'){ drawSandStreams(w, h, k, pal); stepGears(w, h, k, dt, cfg, pal, pid); stepSand(w, h, k, dt, cfg, pal, cx, cy, R); }
    else if (design === 'garden'){ stepVines(w, h, k, dt, cfg, pal); stepLeaves(w, h, k, dt, cfg, pal); }
    else if (design === 'grid'){ stepGrid(w, h, k, dt, cfg, pal); stepGlitches(w, h, k, dt, cfg, pal); }
    else { stepClouds(w, h, k, dt, cfg, pal); stepMotes(w, h, k, dt, cfg, pal); }

    if (cfg.orbits) drawOrbits(cx, cy, R, pal, k);
    stepChimes(cx, cy, R, pal, k, dt);
    if (design === 'sky') drawWings(cx, cy, R, w, pal, k, dt, pid);
    drawRing(cx, cy, R, pal, form, cfg, k, dt);
    if (cfg.songRing) drawSongRing(cx, cy, R, pal, k);
    drawFace(cx, cy, R, pal, form, cfg, k, pid);
  }
  function onTap(x, y){
    var design = designId(), P = PALETTES[paletteId()], pal = P.pal, k = Can.dpr();
    App.taps.spawnRing(x, y, pal.rainbow ? rbCol(Math.random(), pal) : pal.accent);
    if (design === 'classic'){
      for (var o = 0; o < 4; o++) spawnOrbit(canvas.width, canvas.height, canvas.width / 2, canvas.height * 0.5, 1, P.decor,
                                             x + (Math.random() - 0.5) * 40 * k, y + (Math.random() - 0.5) * 40 * k);
    } else if (design === 'gears'){
      // a tap on the floor throws sand up there
      var cw = canvas.width / (SAND_N - 1);
      for (var s = 0; s < 14; s++){
        var col = Math.max(0, Math.min(SAND_N - 1, Math.round(x / cw + (Math.random() - 0.5) * 6)));
        sandBits.push({ t: 1, x: col * cw, y: canvas.height - sandH[col], vx: (Math.random() - 0.5) * 120 * k, vy: -(120 + Math.random() * 200) * k,
                        vol: 0, c: Math.floor(Math.random() * 4), s: (1.2 + Math.random()) * k });
      }
    } else if (design === 'garden'){
      for (var l = 0; l < 8; l++) spawnLeaf(x, y);
    } else if (design === 'grid'){
      for (var c = 0; c < 10; c++) spawnGlitch(x + (Math.random() - 0.5) * 30 * k, y + (Math.random() - 0.5) * 30 * k, pal);
    } else {
      for (var m = 0; m < 10; m++) spawnMote(x, y);
    }
  }
  function reset(){ leafParts = []; glitches = []; motes = []; chimes = []; orbit = []; sandBits = []; tickKick = 0; }
  Can.addResizeHook(function(){ cloudsReady = false; });
  // what the motion is doing now, for measuring calm against loud (engine/probe.js, by hand)
  function stats(){
    var m = Math.min(canvas.width, canvas.height);
    return { design: designId(), palette: paletteId(), drive: A.drive, gearSpeed: gearOmegaNow, pile: sandPeak / m,
             flap: flapAmpNow, vineSway: vineAmpNow, vineReach: vineGrow, gridSpeed: 6 + 120 * gridDrive * gridDrive };
  }

  App.modes.register('clock', { draw: draw, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset, stats: stats, fx: 0.4 });

  App.cfg.registerDefaults('clock', { style: 'theme', density: 1, glow: 0.6, handSpeed: 1, kickTick: true, chimes: true, digital: true, songRing: true, orbits: true });
  App.cfg.registerSchema({ id: 'clock', label: 'Clock', fields: [
    ['style', 'Style', 'layout', ['theme', 'classic', 'gears', 'garden', 'grid', 'sky']],
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
