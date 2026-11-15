/* ---------- String (was "Dramatic") ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var tapStrings = [], tapStringCd = 0;

  function drawString(){
    var w = canvas.width, h = canvas.height, cy = h / 2, k = Can.dpr(), cfg = Cfg.CFG.strings;
    var CFGlook = Cfg.CFG.look;
    Can.backdrop(cfg.trail);
    tapStringCd = Math.max(0, tapStringCd - A.dt);

    var timeData = Aud.timeData;
    var drive = A.level * 0.75 + A.punch * 0.45;
    var t = A.t * CFGlook.motion;
    var n = Math.round(cfg.layers);
    for (var li = 0; li < n; li++){
      var f = n === 1 ? 0 : li / (n - 1);
      var hue = (cfg.hue + f * cfg.spread + Math.sin(t * 0.3 + li) * 10) % 360;
      var amp = (0.45 + f * 0.65) * cfg.amp;
      var freq = 0.7 + f * 1.9;
      var points = 96;
      var pathY = [];
      ctx.strokeStyle = 'hsla(' + hue + ', 65%, 55%, ' + (0.45 + drive * 0.45) + ')';
      ctx.lineWidth = (2.2 - f * 1.0 + drive * 4.5) * cfg.width * k;
      if (cfg.glow * CFGlook.glow > 0.01){
        ctx.shadowColor = 'hsla(' + hue + ', 70%, 60%, 0.9)';
        ctx.shadowBlur = (6 + drive * 34) * cfg.glow * CFGlook.glow * k;
      }
      ctx.beginPath();
      for (var i = 0; i <= points; i++){
        var x = (i / points) * w;
        var si = Math.floor((i / points) * (timeData.length - 1));
        var rawS = (timeData[si] - 128) / 128;
        var amplified = Math.sign(rawS) * Math.pow(Math.abs(rawS), 0.6);
        var wobble = Math.sin(t * freq + i * 0.18 + li * 0.9) * 0.14;
        var y = cy + (amplified * 0.7 + wobble) * (h * 0.42) * amp * (0.3 + drive * 1.7);
        pathY.push(y);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      for (var ri = 0; ri <= points; ri++){
        var rx = (ri / points) * w;
        var ry = h - (pathY[ri] - cy) * 0.35 - h * 0.06;
        if (ri === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function paintBG(c, w, h){
    for (var i = 0; i < 4; i++){
      var rg = c.createRadialGradient(w * (0.15 + i * 0.24), h * (i % 2 ? 0.25 : 0.75), 0,
                                      w * (0.15 + i * 0.24), h * (i % 2 ? 0.25 : 0.75), w * 0.3);
      rg.addColorStop(0, 'rgba(194,98,111,0.10)');
      rg.addColorStop(1, 'rgba(194,98,111,0)');
      c.fillStyle = rg;
      c.fillRect(0, 0, w, h);
    }
  }

  // Touch: a small circular string that ripples the same way the main
  // strings do, with its own cooldown so taps can't spam it.
  function onTap(x, y){
    if (tapStringCd > 0) return;
    tapStringCd = Cfg.CFG.strings.tapCooldown;
    tapStrings.push({ x: x, y: y, age: 0, life: 1.5, seed: Math.random() * 6.283,
                      r: Math.min(canvas.width, canvas.height) * 0.12 });
    if (tapStrings.length > 6) tapStrings.shift();
  }
  function drawTapFX(){
    var dt = A.dt, k = Can.dpr(), cfg = Cfg.CFG.strings, timeData = Aud.timeData;
    for (var sIdx = tapStrings.length - 1; sIdx >= 0; sIdx--){
      var st = tapStrings[sIdx];
      st.age += dt;
      if (st.age > st.life){ tapStrings.splice(sIdx, 1); continue; }
      var f3 = st.age / st.life;
      var drive = A.level * 0.7 + A.punch * 0.5;
      ctx.save();
      ctx.globalAlpha = (1 - f3) * 0.85;
      var hue = (cfg.hue + f3 * cfg.spread) % 360;
      ctx.strokeStyle = 'hsla(' + hue + ',68%,58%,1)';
      ctx.lineWidth = (1.4 + drive * 3) * cfg.width * k;
      if (cfg.glow * Cfg.CFG.look.glow > 0.01){
        ctx.shadowColor = 'hsla(' + hue + ',70%,60%,0.9)';
        ctx.shadowBlur = (5 + drive * 22) * cfg.glow * Cfg.CFG.look.glow * k;
      }
      ctx.beginPath();
      var pts = 64;
      for (var q2 = 0; q2 <= pts; q2++){
        var ang = (q2 / pts) * 6.283;
        var si = Math.floor((q2 / pts) * (timeData.length - 1));
        var wave = (timeData[si] - 128) / 128;
        var rr = st.r * (0.55 + f3 * 0.5) * (1 + wave * 0.22 * (0.4 + drive * 1.6))
                 + Math.sin(ang * 5 + A.t * 3 + st.seed) * st.r * 0.08;
        var px = st.x + Math.cos(ang) * rr, py = st.y + Math.sin(ang) * rr;
        if (q2 === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  App.modes.register('strings', { draw: drawString, paintBG: paintBG, onTap: onTap, drawTapFX: drawTapFX });

  App.cfg.registerDefaults('strings', {
    layers: 5, amp: 1, trail: 0.2, hue: 350, spread: 50, glow: 0.55, width: 1, tapCooldown: 0.45,
    bg1: '#FDF6F0', bg2: '#EDD4D6'
  });
  App.cfg.registerSchema({ id: 'strings', label: 'String', fields: [
    ['layers', 'Ribbon count', 'range', 1, 8, 1],
    ['amp', 'Amplitude', 'range', 0.2, 2.5, 0.05],
    ['width', 'Line weight', 'range', 0.3, 3, 0.05],
    ['glow', 'Glow', 'range', 0, 1, 0.05],
    ['trail', 'Trail fade', 'range', 0.04, 1, 0.02],
    ['tapCooldown', 'Touch ring cooldown (seconds)', 'range', 0.05, 3, 0.05],
    ['hue', 'Base hue', 'range', 0, 360, 1],
    ['spread', 'Hue spread', 'range', 0, 180, 1],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
})();
