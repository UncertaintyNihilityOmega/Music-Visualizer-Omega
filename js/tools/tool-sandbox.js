/* =========================================================================
   SANDBOX — a drag-and-drop pixel art maker.
   Registers as a MODE (App.modes), not a game: there's no difficulty, no
   waves, no enemies, so routing it through the games machinery (which
   assumes exactly that shape) would fight the framework more than it would
   help. It owns its own small piece of state and its own localStorage key
   directly, the same self-contained way Emoji mode owns its photo upload.

   The pixel grid only ever GROWS (tracking the largest canvas size seen
   this session) so a bigger window reveals more canvas to draw on without
   ever shrinking existing art out of existence; zoom is a separate, purely
   cosmetic view control over that same fixed grid.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  /* ---------- the 36+6 palette ---------- */
  var PALETTE = (function(){
    var out = [];
    var hues = [355, 25, 95, 150, 205, 265];
    var light = [82, 68, 55, 42, 30, 18];
    for (var r = 0; r < 6; r++) for (var c = 0; c < 6; c++) out.push('hsl(' + hues[c] + ',68%,' + light[r] + '%)');
    var grays = [97, 78, 60, 42, 24, 6];
    for (var g = 0; g < 6; g++) out.push('hsl(0,0%,' + grays[g] + '%)');
    return out;
  })();
  var N = PALETTE.length; // 42

  var BASE_CELL = 18; // css px per grid cell at zoom 1
  var MIN_COLS = 26, MIN_ROWS = 15, MAX_COLS = 160, MAX_ROWS = 100;
  var START_STOCK = 18, MAX_STACK = 64;

  var SB = {
    cols: MIN_COLS, rows: MIN_ROWS, grid: {}, inventory: [],
    zoom: 1, userZoomed: false, viewX: 0, viewY: 0,
    lastGrant: Date.now(), carrying: -1, carryPt: null,
    dirty: false, saveT: 0, loaded: false, message: '', messageT: 0
  };

  function freshInventory(){
    var out = [];
    for (var i = 0; i < N; i++) out.push(START_STOCK);
    return out;
  }

  function load(){
    if (SB.loaded) return;
    SB.loaded = true;
    try {
      var d = JSON.parse(localStorage.getItem('viz.sandbox') || 'null');
      if (d){
        SB.grid = d.grid || {};
        SB.inventory = (d.inventory && d.inventory.length === N) ? d.inventory : freshInventory();
        SB.cols = Math.max(MIN_COLS, Math.min(MAX_COLS, d.cols || MIN_COLS));
        SB.rows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, d.rows || MIN_ROWS));
        SB.lastGrant = d.lastGrant || Date.now();
      } else {
        SB.inventory = freshInventory();
      }
    } catch (e){ SB.inventory = freshInventory(); }
  }
  function save(){
    try { localStorage.setItem('viz.sandbox', JSON.stringify({
      grid: SB.grid, inventory: SB.inventory, cols: SB.cols, rows: SB.rows, lastGrant: SB.lastGrant
    })); } catch (e){}
    SB.dirty = false;
  }

  // one new swatch every 30 to 60 s (GAME-AUDIT B1; the setting went from 10 to 180 s before 2026-11-19, and a
  // value saved then is held inside the range)
  function grantSeconds(){ return Math.max(30, Math.min(60, Cfg.CFG.sandbox.grantInterval || 60)); }
  // Wall-clock based: swatches accrue even across a closed tab, catching up
  // (capped) when you come back, rather than only while Sandbox is on screen.
  function grantTick(){
    var interval = grantSeconds() * 1000;
    var now = Date.now();
    var elapsed = now - SB.lastGrant;
    if (elapsed < interval) return;
    var grants = Math.min(12, Math.floor(elapsed / interval));
    for (var i = 0; i < grants; i++){
      var idx = Math.floor(Math.random() * N);
      SB.inventory[idx] = Math.min(MAX_STACK, SB.inventory[idx] + 1);
    }
    SB.lastGrant = now;
    SB.dirty = true;
  }

  function setMessage(msg){ SB.message = msg; SB.messageT = 2.2; }

  /* ---------- grid <-> screen ---------- */
  // The palette strip: as many columns as give the biggest swatches while the strip stays within about a
  // third of the picture (21 x 2 on a wide PC picture, 14 x 3 on a phone). Before the design pass
  // (ROADMAP item 16) it was always 6 x 7 and took half of a phone's picture.
  function palLayout(w, h, k){
    var actionW = Math.min(w * 0.14, 58 * k), swW = w - actionW, best = null;
    [7, 14, 21, 42].forEach(function(cols){
      var rows = Math.ceil(N / cols), s = Math.min(swW / cols, 44 * k);
      if (rows * s > h * 0.36) s = h * 0.36 / rows;
      if (!best || s > best.s + 0.5) best = { cols: cols, rows: rows, s: s };
    });
    best.actionW = actionW; best.swW = swW;
    best.palH = best.rows * best.s + 8 * k;
    return best;
  }
  function layout(w, h, k){
    var palH = palLayout(w, h, k).palH;
    return { gridH: h - palH, palY: h - palH, palH: palH };
  }
  function cellPx(k){ return BASE_CELL * SB.zoom * k; }
  function gridToScreen(gx, gy, k){
    var c = cellPx(k);
    return { x: (gx - SB.viewX) * c, y: (gy - SB.viewY) * c };
  }
  function screenToGrid(x, y, k){
    var c = cellPx(k);
    return { gx: Math.floor(x / c) + SB.viewX, gy: Math.floor(y / c) + SB.viewY };
  }
  function clampView(w, h, k){
    var c = cellPx(k);
    var viewCols = w / c, viewRows = layout(w, h, k).gridH / c;
    SB.viewX = Math.max(0, Math.min(Math.max(0, SB.cols - viewCols), SB.viewX));
    SB.viewY = Math.max(0, Math.min(Math.max(0, SB.rows - viewRows), SB.viewY));
  }

  /* ---------- placing / erasing ---------- */
  function placePixel(gx, gy, idx){
    if (gx < 0 || gy < 0 || gx >= SB.cols || gy >= SB.rows) return false;
    if (SB.inventory[idx] <= 0) return false;
    var targetY = gy;
    if (Cfg.CFG.sandbox.gravity){
      targetY = -1;
      for (var y = SB.rows - 1; y >= 0; y--){
        if (!(gx + ',' + y in SB.grid)){ targetY = y; break; }
      }
      if (targetY < 0){ setMessage('That column is full'); return false; }
    }
    var key = gx + ',' + targetY;
    var prev = SB.grid[key];
    if (prev !== undefined) SB.inventory[prev] = Math.min(MAX_STACK, SB.inventory[prev] + 1);
    SB.grid[key] = idx;
    SB.inventory[idx]--;
    SB.dirty = true;
    return true;
  }
  function erasePixel(gx, gy){
    var key = gx + ',' + gy;
    var prev = SB.grid[key];
    if (prev === undefined) return;
    delete SB.grid[key];
    SB.inventory[prev] = Math.min(MAX_STACK, SB.inventory[prev] + 1);
    SB.dirty = true;
  }
  function settleGravity(){
    for (var gx = 0; gx < SB.cols; gx++){
      var colors = [];
      for (var gy = 0; gy < SB.rows; gy++){
        var key = gx + ',' + gy;
        if (key in SB.grid){ colors.push(SB.grid[key]); delete SB.grid[key]; }
      }
      for (var i = 0; i < colors.length; i++) SB.grid[gx + ',' + (SB.rows - colors.length + i)] = colors[i];
    }
    SB.dirty = true;
  }
  function clearAll(){
    for (var k in SB.grid){ var idx = SB.grid[k]; SB.inventory[idx] = Math.min(MAX_STACK, SB.inventory[idx] + 1); }
    SB.grid = {};
    SB.dirty = true;
    setMessage('Canvas cleared');
  }

  function exportPNG(){
    var keys = Object.keys(SB.grid);
    if (!keys.length){ setMessage('Nothing drawn yet'); return; }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < keys.length; i++){
      var p = keys[i].split(','), x = +p[0], y = +p[1];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    var scale = 10, w = maxX - minX + 1, h = maxY - minY + 1;
    var off = document.createElement('canvas');
    off.width = w * scale; off.height = h * scale;
    var octx = off.getContext('2d');
    for (var j = 0; j < keys.length; j++){
      var p2 = keys[j].split(','), x2 = (+p2[0] - minX) * scale, y2 = (+p2[1] - minY) * scale;
      octx.fillStyle = PALETTE[SB.grid[keys[j]]];
      octx.fillRect(x2, y2, scale, scale);
    }
    off.toBlob(function(blob){
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'music-visualiser-omega-pixel-art.png';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
    });
    setMessage('Exported ' + w + '×' + h + ' PNG');
  }

  /* ---------- layout helpers for hit-testing + drawing ---------- */
  function paletteRects(w, h, k){
    var lay = layout(w, h, k), pl = palLayout(w, h, k);
    var actionW = pl.actionW, swW = pl.swW;
    var cellW = swW / pl.cols, cellH = pl.s, top = lay.palY + 4 * k;
    var rects = [];
    // seven families (six hues, then the greys) of six shades, each family a block of its own:
    // 1 x 6 with 7 columns, 2 x 3 with 14, 3 x 2 with 21, 6 x 1 with 42
    var per = pl.cols / 7;
    for (var i = 0; i < N; i++){
      var fam = i < 36 ? i % 6 : 6, shade = i < 36 ? Math.floor(i / 6) : i - 36;
      var col = fam * per + (shade % per), row = Math.floor(shade / per);
      rects.push({ x: col * cellW, y: top + row * cellH, w: cellW, h: cellH });
    }
    var btnH = lay.palH / 3;
    var buttons = {
      exportBtn: { x: swW, y: lay.palY, w: actionW, h: btnH, icon: '⬇️', label: 'Export' },
      fitBtn:    { x: swW, y: lay.palY + btnH, w: actionW, h: btnH, icon: '⌗', label: 'Fit' },
      clearBtn:  { x: swW, y: lay.palY + btnH * 2, w: actionW, h: btnH, icon: '🗑️', label: 'Clear' }
    };
    return { swatches: rects, buttons: buttons, actionW: actionW };
  }

  function fitZoom(w, h, k){
    var lay = layout(w, h, k);
    var z = Math.min(w / (SB.cols * BASE_CELL * k), lay.gridH / (SB.rows * BASE_CELL * k));
    SB.zoom = Math.max(0.25, Math.min(3, z));
    SB.userZoomed = false;
    SB.viewX = 0; SB.viewY = 0;
  }

  /* ---------- drawing ---------- */
  // The look (ROADMAP item 16, after the user's picture inspiration/sandbox-example.jpg, in a style of its
  // own): chunky blocks with a light top-left edge and a dark bottom-right edge on a dusk sky, slow blocky
  // clouds, and a dark palette strip so the colours stand out. Before it: flat squares on pale grey.
  function paintBG(c, w, h){
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2A2458');
    g.addColorStop(0.55, '#5A4F98');
    g.addColorStop(1, '#B49AD0');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
  // the square visualiser behind the grid (GAME-AUDIT B6): soft light squares, bigger where the sound is loud
  function stepAmbientSquares(w, h, k, gridH){
    var tilesX = 12, tilesY = 7;
    var tw = w / tilesX, th = gridH / tilesY;
    for (var ty = 0; ty < tilesY; ty++){
      for (var tx = 0; tx < tilesX; tx++){
        var f = (tx + ty * tilesX) / (tilesX * tilesY);
        var v = Aud.specAt(f);
        var inset = Math.min(tw, th) * (0.16 + (1 - v) * 0.14);
        ctx.fillStyle = 'rgba(255,240,255,' + (0.025 + v * 0.09).toFixed(3) + ')';
        ctx.fillRect(tx * tw + inset, ty * th + inset, tw - inset * 2, th - inset * 2);
      }
    }
  }
  // blocky clouds drifting across the sky: almost still in a quiet passage, quicker in a big one
  var CLOUDS = [{ x: 0.08, y: 0.12, s: 1 }, { x: 0.46, y: 0.06, s: 0.8 }, { x: 0.78, y: 0.2, s: 1.15 }];
  var CLOUD_SHAPE = [[1, 0, 3], [0, 1, 6], [2, 2, 2]];   // rows of blocks: start column, row, length
  function drawClouds(w, gridH, k, dt){
    var b = 9 * k, mo = Cfg.CFG.look.motion;
    for (var i = 0; i < CLOUDS.length; i++){
      var cl = CLOUDS[i], cb = b * cl.s;
      cl.x += dt * (0.004 + 0.05 * A.drive) * mo / cl.s;
      if (cl.x * w > w + cb * 7) cl.x = -cb * 7 / w;
      var x0 = cl.x * w, y0 = cl.y * gridH;
      for (var r = 0; r < CLOUD_SHAPE.length; r++){
        var row = CLOUD_SHAPE[r];
        ctx.fillStyle = r === 2 ? 'rgba(214,206,236,0.55)' : 'rgba(250,247,255,0.62)';
        ctx.fillRect(x0 + row[0] * cb, y0 + row[1] * cb, row[2] * cb, cb);
      }
      ctx.fillStyle = 'rgba(160,150,200,0.35)';
      ctx.fillRect(x0, y0 + 2 * cb - cb * 0.25, 6 * cb, cb * 0.25);
    }
  }
  // one block, drawn once per colour and size and then copied
  // kept by colour and size (the grid, the palette and the dragged block each use their own size; one
  // cache per size rebuilt them every frame: 13.7 ms a frame instead of about 2)
  var blockCache = {}, blockCount = 0;
  function blockSprite(idx, px){
    px = Math.max(3, Math.round(px));
    var key = idx + '|' + px;
    if (blockCache[key]) return blockCache[key];
    if (++blockCount > 260){ blockCache = {}; blockCount = 1; }   // zooming makes new sizes: keep it small
    var cv = document.createElement('canvas');
    cv.width = cv.height = px;
    var x = cv.getContext('2d'), e = Math.max(1, Math.round(px * 0.15));
    x.fillStyle = PALETTE[idx];
    x.fillRect(0, 0, px, px);
    // a little grain, the same for every block of a colour
    var q = Math.max(1, Math.round(px / 6));
    x.fillStyle = 'rgba(255,255,255,0.10)';
    x.fillRect(Math.round(px * 0.3), Math.round(px * 0.35), q, q);
    x.fillRect(Math.round(px * 0.62), Math.round(px * 0.6), q, q);
    x.fillStyle = 'rgba(0,0,0,0.10)';
    x.fillRect(Math.round(px * 0.5), Math.round(px * 0.25), q, q);
    x.fillRect(Math.round(px * 0.25), Math.round(px * 0.66), q, q);
    // light top and left edges, dark bottom and right edges, a thin outline
    x.fillStyle = 'rgba(255,255,255,0.34)';
    x.fillRect(0, 0, px, e);
    x.fillRect(0, e, e, px - e);
    x.fillStyle = 'rgba(0,0,0,0.30)';
    x.fillRect(e, px - e, px - e, e);
    x.fillRect(px - e, e, e, px - 2 * e);
    if (px >= 8){
      x.strokeStyle = 'rgba(0,0,0,0.32)';
      x.lineWidth = 1;
      x.strokeRect(0.5, 0.5, px - 1, px - 1);
    }
    blockCache[key] = cv;
    return cv;
  }
  function draw(){
    load();
    grantTick();
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt;
    var lay = layout(w, h, k);
    clampView(w, h, k);
    Can.backdrop(1);

    stepAmbientSquares(w, h, k, lay.gridH);
    drawClouds(w, lay.gridH, k, dt);

    // grid area clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, lay.gridH);
    ctx.clip();

    var c = cellPx(k);
    var viewCols = Math.ceil(w / c) + 1, viewRows = Math.ceil(lay.gridH / c) + 1;
    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = Math.max(1, k * 0.6);
    ctx.beginPath();
    for (var gx = 0; gx <= viewCols; gx++){
      var sx = gridToScreen(SB.viewX + gx, 0, k).x;
      if (SB.viewX + gx > SB.cols) break;
      ctx.moveTo(sx, 0); ctx.lineTo(sx, lay.gridH);
    }
    for (var gy = 0; gy <= viewRows; gy++){
      var sy = gridToScreen(0, SB.viewY + gy, k).y;
      if (SB.viewY + gy > SB.rows) break;
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
    }
    ctx.stroke();
    // canvas extent border
    var origin = gridToScreen(0, 0, k), end = gridToScreen(SB.cols, SB.rows, k);
    ctx.fillStyle = 'rgba(10,8,24,0.38)';
    if (end.x < w) ctx.fillRect(end.x, 0, w - end.x, lay.gridH);
    if (end.y < lay.gridH) ctx.fillRect(0, end.y, Math.min(w, end.x), lay.gridH - end.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = Math.max(1.4, k);
    ctx.strokeRect(origin.x, origin.y, end.x - origin.x, end.y - origin.y);

    // placed pixels
    for (var key in SB.grid){
      var p = key.split(','), px = +p[0], py = +p[1];
      if (px < SB.viewX - 1 || px > SB.viewX + viewCols || py < SB.viewY - 1 || py > SB.viewY + viewRows) continue;
      var pt = gridToScreen(px, py, k);
      ctx.drawImage(blockSprite(SB.grid[key], c), pt.x, pt.y, c, c);
    }

    // hover / drag preview
    if (SB.carrying >= 0 && SB.carryPt && SB.carryPt.y < lay.gridH){
      var g = screenToGrid(SB.carryPt.x, SB.carryPt.y, k);
      var hp = gridToScreen(g.gx, g.gy, k);
      ctx.globalAlpha = 0.6;
      ctx.drawImage(blockSprite(SB.carrying, c), hp.x, hp.y, c, c);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1.4, k);
      ctx.strokeRect(hp.x + 1, hp.y + 1, c - 2, c - 2);
    }
    ctx.restore();

    // ghost swatch following the pointer while dragging
    if (SB.carrying >= 0 && SB.carryPt){
      ctx.save();
      ctx.globalAlpha = 0.85;
      var gs = 22 * k;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 6 * k;
      ctx.drawImage(blockSprite(SB.carrying, gs), SB.carryPt.x - gs / 2, SB.carryPt.y - gs / 2, gs, gs);
      ctx.restore();
    }

    /* ---------- palette strip ---------- */
    ctx.fillStyle = 'rgba(16,12,32,0.9)';
    ctx.fillRect(0, lay.palY, w, lay.palH);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = Math.max(1, k);
    ctx.beginPath(); ctx.moveTo(0, lay.palY); ctx.lineTo(w, lay.palY); ctx.stroke();

    var rects = paletteRects(w, h, k);
    for (var i = 0; i < N; i++){
      var r = rects.swatches[i];
      var stock = SB.inventory[i];
      var pad = Math.min(r.w, r.h) * 0.1;
      var sz = Math.min(r.w, r.h) - pad * 2;
      var cx2 = r.x + r.w / 2, cy2 = r.y + r.h / 2;
      ctx.save();
      if (stock <= 0) ctx.globalAlpha = 0.25;
      ctx.drawImage(blockSprite(i, sz), cx2 - sz / 2, cy2 - sz / 2, sz, sz);
      if (SB.carrying === i){
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 * k;
        ctx.strokeRect(cx2 - sz / 2 - k, cy2 - sz / 2 - k, sz + 2 * k, sz + 2 * k);
      }
      ctx.restore();
      if (stock > 0){
        ctx.font = 'bold ' + Math.max(8, sz * 0.36) + 'px Karla, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(String(stock), cx2 + sz / 2 - k * 0.5, cy2 + sz / 2 + k * 0.5);
        ctx.fillStyle = '#fff';
        ctx.fillText(String(stock), cx2 + sz / 2 - k * 1.5, cy2 + sz / 2 - k * 0.5);
      }
    }
    var btns = rects.buttons;
    ['exportBtn', 'fitBtn', 'clearBtn'].forEach(function(id){
      var b = btns[id];
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      U.roundRect(ctx, b.x + 3 * k, b.y + 2 * k, b.w - 6 * k, b.h - 4 * k, 6 * k);
      ctx.fill();
      ctx.font = Math.max(11, b.h * 0.4) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#EDE7FF';      // the Fit sign is text, not an emoji: it needs a colour of its own
      ctx.fillText(b.icon, b.x + b.w / 2, b.y + b.h / 2 - 2 * k);
      ctx.font = Math.max(8, b.h * 0.18) + 'px Karla, sans-serif';
      ctx.fillStyle = '#EDE7FF';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h * 0.82);
    });

    // HUD: gravity state + next grant countdown + zoom
    var untilNext = Math.max(0, Math.ceil((grantSeconds() * 1000 - (Date.now() - SB.lastGrant)) / 1000));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = (11 * k) + 'px Karla, sans-serif';
    var hud = (Cfg.CFG.sandbox.gravity ? 'Gravity: on' : 'Gravity: sky') + '   Next swatch in ' + untilNext + 's   Zoom ' + SB.zoom.toFixed(2) + 'x   ' + SB.cols + '×' + SB.rows;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(hud, 9 * k, 9 * k + 1);
    ctx.fillStyle = 'rgba(244,238,255,0.88)';
    ctx.fillText(hud, 8 * k, 8 * k);

    if (SB.messageT > 0){
      SB.messageT -= dt;
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + (12 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(255,248,255,' + Math.min(1, SB.messageT).toFixed(2) + ')';
      ctx.fillText(SB.message, w / 2, 10 * k);
    }

    SB.saveT += dt;
    if (SB.dirty && SB.saveT > 2){ SB.saveT = 0; save(); }
  }

  function reset(){ SB.carrying = -1; SB.carryPt = null; }
  Can.addResizeHook(function(){
    load();
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    var lay = layout(w, h, k);
    var wantCols = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.round(w / (BASE_CELL * k))));
    var wantRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, Math.round(lay.gridH / (BASE_CELL * k))));
    var grew = wantCols > SB.cols || wantRows > SB.rows;
    SB.cols = Math.max(SB.cols, wantCols);
    SB.rows = Math.max(SB.rows, wantRows);
    if (!SB.userZoomed && (grew || SB.zoom === 1)) fitZoom(w, h, k);
  });

  /* ---------- input: drag from palette to grid, click to erase, scroll to zoom, WASD to pan ---------- */
  canvas.addEventListener('pointerdown', function(ev){
    if (App.modes.current !== 'sandbox') return;
    var pt = App.taps.canvasPoint(ev);
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    var lay = layout(w, h, k);
    if (pt.y >= lay.palY){
      var rects = paletteRects(w, h, k);
      for (var i = 0; i < N; i++){
        var r = rects.swatches[i];
        if (pt.x >= r.x && pt.x < r.x + r.w && pt.y >= r.y && pt.y < r.y + r.h){
          if (SB.inventory[i] > 0){ SB.carrying = i; SB.carryPt = pt; }
          return;
        }
      }
      var b = rects.buttons;
      if (pt.x >= b.exportBtn.x){
        if (pt.y < b.fitBtn.y) exportPNG();
        else if (pt.y < b.clearBtn.y) fitZoom(w, h, k);
        else clearAll();
      }
      return;
    }
    var g = screenToGrid(pt.x, pt.y, k);
    if (SB.carrying >= 0){ /* handled on pointerup */ return; }
    if (g.gx + ',' + g.gy in SB.grid) erasePixel(g.gx, g.gy);
  });
  canvas.addEventListener('pointermove', function(ev){
    if (App.modes.current !== 'sandbox' || SB.carrying < 0) return;
    SB.carryPt = App.taps.canvasPoint(ev);
  });
  canvas.addEventListener('pointerup', function(ev){
    if (App.modes.current !== 'sandbox' || SB.carrying < 0) return;
    var pt = App.taps.canvasPoint(ev);
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    var lay = layout(w, h, k);
    if (pt.y < lay.gridH){
      var g = screenToGrid(pt.x, pt.y, k);
      placePixel(g.gx, g.gy, SB.carrying);
    }
    SB.carrying = -1;
    SB.carryPt = null;
  });
  canvas.addEventListener('wheel', function(ev){
    if (App.modes.current !== 'sandbox') return;
    ev.preventDefault();
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    SB.zoom = Math.max(0.25, Math.min(4, SB.zoom * (ev.deltaY > 0 ? 0.9 : 1.1)));
    SB.userZoomed = true;
    clampView(w, h, k);
  }, { passive: false });
  document.addEventListener('keydown', function(e){
    if (App.modes.current !== 'sandbox') return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var key = e.key.toLowerCase();
    if (key !== 'w' && key !== 'a' && key !== 's' && key !== 'd') return;
    var step = 3;
    if (key === 'a') SB.viewX -= step;
    if (key === 'd') SB.viewX += step;
    if (key === 'w') SB.viewY -= step;
    if (key === 's') SB.viewY += step;
    e.preventDefault();
  });

  // probe: for checks in the browser (play-testing GAME-AUDIT rows by script), never read by the app
  App.modes.register('sandbox', { draw: draw, paintBG: paintBG, reset: reset,
    probe: function(){ return { SB: SB, palette: PALETTE, maxStack: MAX_STACK, baseCell: BASE_CELL,
      api: { placePixel: placePixel, erasePixel: erasePixel, grantTick: grantTick, grantSeconds: grantSeconds, exportPNG: exportPNG,
             layout: layout, paletteRects: paletteRects, cellPx: cellPx, save: save } }; } });

  App.cfg.registerDefaults('sandbox', { grantInterval: 60, gravity: false });
  App.cfg.registerSchema({ id: 'sandbox', label: 'Solarium', fields: [
    ['grantInterval', 'New swatch every (seconds)', 'range', 30, 60, 5],
    ['gravity', 'Gravity (off = sky, pixels stay put)', 'bool']
  ]});
  App.cfg.onGroupChange('sandbox', function(key){
    if ((key === 'gravity' || key === null) && Cfg.CFG.sandbox.gravity) settleGravity();
  });
})();
