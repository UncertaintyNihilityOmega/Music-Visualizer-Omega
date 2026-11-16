/* ---------- Emoji ---------- */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var emojiParts = [];
  var photoImg = null;

  var kickCd = 0;

  // the emoji to use, quiet to loud: the theme code's set when "Follow
  // theme" is on and the theme has one, otherwise the user's own list
  function emojiSet(){
    var th = App.theme.look;
    if (Cfg.CFG.emoji.followTheme && th && th.emoji && th.emoji.length) return th.emoji;
    var g = String(Cfg.CFG.emoji.set).split(',').map(function(x){ return x.trim(); }).filter(Boolean);
    return g.length ? g : ['❤️'];
  }

  // The background follows the theme code too (a pale pink page under a dark
  // code looked wrong): the theme's own canvas colours while "Follow theme" is on.
  function bgColors(){
    var th = App.theme.look;
    return Cfg.CFG.emoji.followTheme && th ? { bg1: th.bg1, bg2: th.bg2 } : null;
  }
  function bubbleRGB(){
    var th = App.theme.look;
    return Cfg.CFG.emoji.followTheme && th ? App.util.hexRGB(th.c2).join(',') : '194,98,111';
  }

  function loadPhoto(file){
    if (!file || !/^image\//.test(file.type)) return;
    var fr = new FileReader();
    fr.onload = function(){
      var img = new Image();
      img.onload = function(){
        photoImg = img;
        try { if (String(fr.result).length < 1600000) localStorage.setItem('viz.photo', fr.result); } catch (e) {}
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function clearPhoto(){
    photoImg = null;
    try { localStorage.removeItem('viz.photo'); } catch (e) {}
  }
  (function restorePhoto(){
    try {
      var d = localStorage.getItem('viz.photo');
      if (d){ var im = new Image(); im.onload = function(){ photoImg = im; }; im.src = d; }
    } catch (e) {}
  })();

  // kind: 'bubble' rises, 'fade' drifts, 'ring' flies outward (kick), 'spark' twinkles (hi-hat)
  function spawnEmojiPart(x, y, kind, vScale, o){
    var cfg = Cfg.CFG.emoji, k = Can.dpr();
    if (emojiParts.length > 240) return;
    var set = emojiSet();
    if (o){
      emojiParts.push({ g: o.g || set[Math.floor(Math.random() * set.length)], x: x, y: y, kind: kind,
                        vx: o.vx || 0, vy: o.vy || 0, rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 2,
                        size: o.size, age: 0, life: o.life });
      return;
    }
    emojiParts.push({
      g: set[Math.floor(Math.random() * set.length)],
      x: x, y: y, kind: kind,
      vx: (Math.random() - 0.5) * 20 * k,
      vy: kind === 'bubble' ? -(24 + Math.random() * 46) * k : (Math.random() - 0.5) * 14 * k,
      rot: (Math.random() - 0.5) * 0.6,
      vr: (Math.random() - 0.5) * 1.2,
      size: (12 + Math.random() * 22) * k * cfg.size * (0.6 + (vScale || 0.5)),
      age: 0, life: cfg.life * (0.6 + Math.random() * 0.8)
    });
  }
  function photoBox(){
    if (!photoImg || !photoImg.width) return null;
    var w = canvas.width, h = canvas.height;
    var scale = Math.min(w / photoImg.width, h / photoImg.height) * Cfg.CFG.emoji.photoSize;
    var pw = photoImg.width * scale, ph = photoImg.height * scale;
    return { x: (w - pw) / 2, y: (h - ph) / 2, w: pw, h: ph };
  }

  function drawEmoji(){
    var w = canvas.width, h = canvas.height, cy = h / 2, cx = w / 2, k = Can.dpr(), cfg = Cfg.CFG.emoji;
    Can.backdrop(1);
    var set = emojiSet();
    var t = A.t * Cfg.CFG.look.motion;
    var pop = 1 + A.punch * cfg.pop;
    var box = photoBox();

    // how busy the scene is: a calm passage spawns little, a loud one a lot
    var busy = 0.25 + A.drive * 1.6;

    // Kick drum: a ring of emoji thrown outward from the centre (or from
    // the edge of the photo). The harder the kick and the louder the
    // passage, the more of them and the faster they fly.
    kickCd -= A.dt;
    if (cfg.kickRing && A.kickHit > 0.3 && A.drive > 0.12 && kickCd <= 0){
      kickCd = 0.16;
      var ringN = Math.round((5 + A.kickHit * 9) * (0.4 + 0.6 * A.drive) * cfg.rate);
      var r0 = box ? Math.max(box.w, box.h) * 0.52 : Math.min(w, h) * 0.05;
      var speed = (110 + A.kickHit * 240) * k * (0.5 + 0.5 * A.drive) * Cfg.CFG.look.motion;
      var a0 = Math.random() * 6.283;
      for (var rn = 0; rn < ringN; rn++){
        var ra = a0 + rn / ringN * 6.283;
        spawnEmojiPart(cx + Math.cos(ra) * r0, cy + Math.sin(ra) * r0, 'ring', 0, {
          vx: Math.cos(ra) * speed, vy: Math.sin(ra) * speed, life: 0.9 + A.drive * 0.5,
          size: (13 + A.kickHit * 14) * k * cfg.size, g: set[Math.min(set.length - 1, Math.floor(A.kickHit * set.length))] });
      }
    }
    // Hi-hat: small quick sparkles anywhere, in the quietest emoji of the set
    if (cfg.hatSparks && A.hatHit > 0.25 && A.drive > 0.08){
      var sn = 1 + Math.round(A.hatHit * 2 * cfg.rate);
      for (var hs = 0; hs < sn; hs++){
        spawnEmojiPart(w * (0.05 + Math.random() * 0.9), h * (0.06 + Math.random() * 0.88), 'spark', 0, {
          life: 0.35 + Math.random() * 0.3, size: (7 + Math.random() * 8) * k * cfg.size, g: set[0] });
      }
    }

    // the photo keeps its own aspect ratio and sits in the middle of the scene
    if (box){
      // it swells a little with each kick and brightens with the passage
      var swell = 1 + A.kick * 0.045 * (0.3 + 0.7 * A.drive) * cfg.photoPulse;
      var bx0 = cx - box.w * swell / 2, by0 = cy - box.h * swell / 2, bw0 = box.w * swell, bh0 = box.h * swell;
      ctx.save();
      ctx.shadowColor = 'rgba(110,30,46,0.35)';
      ctx.shadowBlur = (10 + A.level * 26) * k;
      ctx.drawImage(photoImg, bx0, by0, bw0, bh0);
      ctx.restore();
      var lift = (A.drive * 0.1 + A.kick * 0.1 * A.drive) * cfg.photoPulse;
      if (lift > 0.01){
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.3, lift);
        ctx.drawImage(photoImg, bx0, by0, bw0, bh0);
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2 * k;
      ctx.strokeRect(bx0, by0, bw0, bh0);

      if (cfg.photoEmoji && Math.random() < busy * cfg.photoRate * A.dt * 12){
        var edge = Math.random() < 0.45;
        var ex, ey;
        if (edge){
          var side = Math.floor(Math.random() * 4);
          ex = box.x + Math.random() * box.w;
          ey = box.y + Math.random() * box.h;
          if (side === 0) ey = box.y - 8 * k;
          else if (side === 1) ey = box.y + box.h + 8 * k;
          else if (side === 2) ex = box.x - 8 * k;
          else ex = box.x + box.w + 8 * k;
        } else {
          ex = box.x + Math.random() * box.w;
          ey = box.y + Math.random() * box.h;
        }
        spawnEmojiPart(ex, ey, 'fade', A.level);
      }
      if (cfg.photoBubbles && Math.random() < busy * 0.9 * cfg.photoRate * A.dt * 12){
        spawnEmojiPart(box.x + Math.random() * box.w, box.y + box.h, 'bubble', A.level);
      }
    }

    if (cfg.shape === 'line' || cfg.shape === 'circle' || cfg.shape === 'heart'){
      var count = Math.max(6, Math.round(w / (48 * k) * cfg.cols));
      if (cfg.shape === 'line'){
        var maxHeight = cy * 0.85, colWidth = cx / count;
        for (var i = 0; i < count; i++){
          var v = Aud.specAt(i / count);
          var size = (12 + v * 46) * k * cfg.size * pop;
          var sprite = Can.getEmojiSprite(set[Math.min(set.length - 1, Math.floor(v * set.length))]);
          var wob = Math.sin(t * 2.4 + i) * 4 * k * v * cfg.wobble;
          var xR = cx + i * colWidth + colWidth / 2, xL = cx - i * colWidth - colWidth / 2;
          Can.stampEmoji(sprite, xR, cy - v * maxHeight - Math.abs(wob), wob * 0.05, size);
          Can.stampEmoji(sprite, xR, cy + v * maxHeight + Math.abs(wob), -wob * 0.05, size);
          Can.stampEmoji(sprite, xL, cy - v * maxHeight - Math.abs(wob), -wob * 0.05, size);
          Can.stampEmoji(sprite, xL, cy + v * maxHeight + Math.abs(wob), wob * 0.05, size);
        }
      } else {
        var n2 = Math.max(10, Math.round(count * 1.6));
        var base = Math.min(w, h) * (box ? 0.44 : 0.26);
        for (var j = 0; j < n2; j++){
          var f = j / n2;
          var v2 = Aud.specAt(f < 0.5 ? f * 2 : (1 - f) * 2);
          var sz = (11 + v2 * 40) * k * cfg.size * pop;
          var sp2 = Can.getEmojiSprite(set[Math.min(set.length - 1, Math.floor(v2 * set.length))]);
          var px, py, ang = f * 6.283 - Math.PI / 2;
          if (cfg.shape === 'circle'){
            var rr = base * (1 + v2 * 0.55) + Math.sin(t * 2 + j) * 3 * k * cfg.wobble;
            px = cx + Math.cos(ang) * rr;
            py = cy + Math.sin(ang) * rr;
          } else {
            var ht = f * 6.283;
            var hx = 16 * Math.pow(Math.sin(ht), 3);
            var hy = 13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht);
            var hs = (base / 16) * (1 + v2 * 0.4);
            px = cx + hx * hs;
            py = cy - hy * hs;
          }
          Can.stampEmoji(sp2, px, py, Math.sin(t + j) * 0.12 * cfg.wobble, sz);
        }
      }
    } else if (cfg.shape === 'bubbles'){
      if (Math.random() < busy * 1.3 * cfg.rate * A.dt * 14){
        spawnEmojiPart(Math.random() * w, h + 10 * k, 'bubble', A.level);
      }
    } else if (cfg.shape === 'fade'){
      if (Math.random() < busy * 1.3 * cfg.rate * A.dt * 14){
        spawnEmojiPart(w * (0.06 + Math.random() * 0.88), h * (0.08 + Math.random() * 0.84), 'fade', A.level);
      }
    }

    // shared particle pass: appear, live, disappear
    for (var e = emojiParts.length - 1; e >= 0; e--){
      var pt = emojiParts[e];
      pt.age += A.dt;
      if (pt.age >= pt.life){ emojiParts.splice(e, 1); continue; }
      if (pt.kind === 'bubble'){
        pt.vy -= 14 * k * A.dt;
        pt.x += (pt.vx + Math.sin(A.t * 2 + pt.y * 0.01) * 16 * k) * A.dt;
        pt.y += pt.vy * A.dt * Cfg.CFG.look.motion;
      } else {
        if (pt.kind === 'ring'){ var drag = Math.exp(-1.6 * A.dt); pt.vx *= drag; pt.vy *= drag; }
        pt.x += pt.vx * A.dt;
        pt.y += pt.vy * A.dt;
      }
      pt.rot += pt.vr * A.dt;
      var f3 = pt.age / pt.life;
      var alpha = Math.min(1, f3 / 0.18) * Math.min(1, (1 - f3) / 0.3);
      var grow = pt.kind === 'spark' ? Math.sin(f3 * Math.PI) * 1.25 : (pt.kind === 'ring' ? 0.75 + f3 * 0.5 : 0.7 + A.punch * 0.3);
      Can.stampEmoji(Can.getEmojiSprite(pt.g), pt.x, pt.y, pt.rot, pt.size * grow, alpha);
    }
  }

  function paintBG(c, w, h, k){
    for (var b = 0; b < 26; b++){
      var bx = (b * 137.5) % w, by = ((b * 251.7) % h), br = (8 + (b % 5) * 9) * k;
      c.fillStyle = 'rgba(' + bubbleRGB() + ',' + (0.03 + (b % 4) * 0.012).toFixed(3) + ')';
      c.beginPath();
      c.arc(bx, by, br, 0, Math.PI * 2);
      c.fill();
    }
  }

  function onTap(x, y){
    App.taps.spawnRing(x, y, '#C2626F');
    for (var e = 0; e < 10; e++){
      spawnEmojiPart(x + (Math.random() - 0.5) * 40 * Can.dpr(), y + (Math.random() - 0.5) * 40 * Can.dpr(),
                     Math.random() < 0.5 ? 'bubble' : 'fade', 0.8);
    }
  }

  function reset(){ emojiParts = []; kickCd = 0; }

  App.modes.register('emoji', { draw: drawEmoji, paintBG: paintBG, bgColors: bgColors, onTap: onTap, reset: reset });

  App.cfg.ACTIONS.photoPick = loadPhoto;
  App.cfg.ACTIONS.photoClear = clearPhoto;

  App.cfg.registerDefaults('emoji', {
    followTheme: true, set: '✨,💕,❤️,💖,🌟',
    shape: 'line', size: 1, cols: 1, pop: 0.3, wobble: 1, life: 2.4, rate: 1,
    kickRing: true, hatSparks: true,
    photoSize: 0.62, photoEmoji: true, photoBubbles: true, photoRate: 1, photoPulse: 1,
    bg1: '#FFF7FB', bg2: '#F6DAE5'
  });
  App.cfg.registerSchema({ id: 'emoji', label: 'Emoji', fields: [
    ['followTheme', 'Follow theme (emoji set and background)', 'bool'],
    ['set', 'Your emojis (comma separated, quiet to loud)', 'text'],
    ['kickRing', 'Kick drum throws a ring of emoji', 'bool'],
    ['hatSparks', 'Hi-hat sparkles', 'bool'],
    ['shape', 'Layout', 'layout', ['line', 'circle', 'heart', 'bubbles', 'fade']],
    ['size', 'Size', 'range', 0.4, 2.5, 0.05],
    ['cols', 'Density', 'range', 0.4, 2, 0.05],
    ['pop', 'Beat pop', 'range', 0, 1.2, 0.05],
    ['wobble', 'Wobble', 'range', 0, 3, 0.05],
    ['life', 'Lifespan (bubbles / fade)', 'range', 0.4, 8, 0.1],
    ['rate', 'Spawn rate (bubbles / fade)', 'range', 0.2, 3, 0.05],
    ['photoPick', 'Photo', 'photo'],
    ['photoClear', 'Remove photo', 'button', 'Remove'],
    ['photoSize', 'Photo size', 'range', 0.15, 1, 0.01],
    ['photoEmoji', 'Emojis around photo', 'bool'],
    ['photoBubbles', 'Bubble emojis up the photo', 'bool'],
    ['photoRate', 'Photo emoji rate', 'range', 0.2, 3, 0.05],
    ['photoPulse', 'Photo pulses with the kick', 'range', 0, 2, 0.05],
    ['bg1', 'Background top', 'color'],
    ['bg2', 'Background bottom', 'color']
  ]});
})();
