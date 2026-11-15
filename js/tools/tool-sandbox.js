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

  // Wall-clock based: swatches accrue even across a closed tab, catching up
  // (capped) when you come back, rather than only while Sandbox is on screen.
  function grantTick(){
    var interval = Math.max(5, Cfg.CFG.sandbox.grantInterval) * 1000;
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
  function layout(w, h, k){
    var palH = Math.max(h * 0.27, 100 * k);
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
    var lay = layout(w, h, k);
    var actionW = Math.min(w * 0.16, 64 * k);
    var swW = w - actionW;
    var cellW = swW / 6, cellH = lay.palH / 7;
    var rects = [];
    for (var i = 0; i < N; i++){
      var col = i % 6, row = Math.floor(i / 6);
      rects.push({ x: col * cellW, y: lay.palY + row * cellH, w: cellW, h: cellH });
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
  function paintBG(c, w, h){
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.fillRect(0, 0, w, h);
  }
  function stepAmbientSquares(w, h, k, gridH){
    var tilesX = 12, tilesY = 7;
    var tw = w / tilesX, th = gridH / tilesY;
    for (var ty = 0; ty < tilesY; ty++){
      for (var tx = 0; tx < tilesX; tx++){
        var f = (tx + ty * tilesX) / (tilesX * tilesY);
        var v = Aud.specAt(f);
        var inset = Math.min(tw, th) * (0.16 + (1 - v) * 0.14);
        ctx.fillStyle = 'rgba(130,150,205,' + (0.05 + v * 0.14).toFixed(3) + ')';
        ctx.fillRect(tx * tw + inset, ty * th + inset, tw - inset * 2, th - inset * 2);
      }
    }
  }
  function draw(){
    load();
    grantTick();
    var w = canvas.width, h = canvas.height, k = Can.dpr(), dt = A.dt;
    var lay = layout(w, h, k);
    clampView(w, h, k);
    Can.backdrop(1);

    stepAmbientSquares(w, h, k, lay.gridH);

    // grid area clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, lay.gridH);
    ctx.clip();

    var c = cellPx(k);
    var viewCols = Math.ceil(w / c) + 1, viewRows = Math.ceil(lay.gridH / c) + 1;
    // grid lines
    ctx.strokeStyle = 'rgba(110,30,46,0.10)';
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
    ctx.strokeStyle = 'rgba(110,30,46,0.35)';
    ctx.lineWidth = Math.max(1.4, k);
    ctx.strokeRect(origin.x, origin.y, end.x - origin.x, end.y - origin.y);

    // placed pixels
    for (var key in SB.grid){
      var p = key.split(','), px = +p[0], py = +p[1];
      if (px < SB.viewX - 1 || px > SB.viewX + viewCols || py < SB.viewY - 1 || py > SB.viewY + viewRows) continue;
      var pt = gridToScreen(px, py, k);
      ctx.fillStyle = PALETTE[SB.grid[key]];
      ctx.fillRect(pt.x, pt.y, c, c);
    }

    // hover / drag preview
    if (SB.carrying >= 0 && SB.carryPt && SB.carryPt.y < lay.gridH){
      var g = screenToGrid(SB.carryPt.x, SB.carryPt.y, k);
      var hp = gridToScreen(g.gx, g.gy, k);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = PALETTE[SB.carrying];
      ctx.fillRect(hp.x, hp.y, c, c);
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
      ctx.fillStyle = PALETTE[SB.carrying];
      var gs = 22 * k;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 6 * k;
      ctx.fillRect(SB.carryPt.x - gs / 2, SB.carryPt.y - gs / 2, gs, gs);
      ctx.restore();
    }

    /* ---------- palette strip ---------- */
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(0, lay.palY, w, lay.palH);
    ctx.strokeStyle = 'rgba(110,30,46,0.18)';
    ctx.lineWidth = Math.max(1, k);
    ctx.beginPath(); ctx.moveTo(0, lay.palY); ctx.lineTo(w, lay.palY); ctx.stroke();

    var rects = paletteRects(w, h, k);
    for (var i = 0; i < N; i++){
      var r = rects.swatches[i];
      var stock = SB.inventory[i];
      var pad = Math.min(r.w, r.h) * 0.14;
      var sz = Math.min(r.w, r.h) - pad * 2;
      var cx2 = r.x + r.w / 2, cy2 = r.y + r.h / 2;
      ctx.save();
      if (stock <= 0) ctx.globalAlpha = 0.28;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3 * k;
      ctx.shadowOffsetY = 1 * k;
      ctx.fillStyle = PALETTE[i];
      U.roundRect(ctx, cx2 - sz / 2, cy2 - sz / 2, sz, sz, sz * 0.18);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = (SB.carrying === i) ? '#6E1E2E' : 'rgba(0,0,0,0.25)';
      ctx.lineWidth = (SB.carrying === i ? 2.2 : 1) * k;
      U.roundRect(ctx, cx2 - sz / 2, cy2 - sz / 2, sz, sz, sz * 0.18);
      ctx.stroke();
      ctx.restore();
      if (stock > 0){
        ctx.font = 'bold ' + Math.max(8, sz * 0.32) + 'px Karla, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(String(stock), cx2 + 1, cy2 + sz / 2 + 1);
        ctx.fillStyle = '#fff';
        ctx.fillText(String(stock), cx2, cy2 + sz / 2);
      }
    }
    var btns = rects.buttons;
    ['exportBtn', 'fitBtn', 'clearBtn'].forEach(function(id){
      var b = btns[id];
      ctx.fillStyle = 'rgba(194,98,111,0.12)';
      U.roundRect(ctx, b.x + 3 * k, b.y + 2 * k, b.w - 6 * k, b.h - 4 * k, 6 * k);
      ctx.fill();
      ctx.font = Math.max(11, b.h * 0.4) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.icon, b.x + b.w / 2, b.y + b.h / 2 - 2 * k);
      ctx.font = Math.max(8, b.h * 0.18) + 'px Karla, sans-serif';
      ctx.fillStyle = '#6E1E2E';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h * 0.82);
    });

    // HUD: gravity state + next grant countdown + zoom
    var untilNext = Math.max(0, Math.ceil((Cfg.CFG.sandbox.grantInterval * 1000 - (Date.now() - SB.lastGrant)) / 1000));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = (11 * k) + 'px Karla, sans-serif';
    var hud = (Cfg.CFG.sandbox.gravity ? 'Gravity: on' : 'Gravity: sky') + '   Next swatch in ' + untilNext + 's   Zoom ' + SB.zoom.toFixed(2) + 'x   ' + SB.cols + '×' + SB.rows;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(hud, 9 * k, 9 * k + 1);
    ctx.fillStyle = 'rgba(110,30,46,0.85)';
    ctx.fillText(hud, 8 * k, 8 * k);

    if (SB.messageT > 0){
      SB.messageT -= dt;
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + (12 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(110,30,46,' + Math.min(1, SB.messageT).toFixed(2) + ')';
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

  App.modes.register('sandbox', { draw: draw, paintBG: paintBG, reset: reset });

  App.cfg.registerDefaults('sandbox', { grantInterval: 60, gravity: false });
  App.cfg.registerSchema({ id: 'sandbox', label: 'Sandbox', fields: [
    ['grantInterval', 'New swatch every (seconds)', 'range', 10, 180, 5],
    ['gravity', 'Gravity (off = sky, pixels stay put)', 'bool']
  ]});
  App.cfg.onGroupChange('sandbox', function(key){
    if ((key === 'gravity' || key === null) && Cfg.CFG.sandbox.gravity) settleGravity();
  });
})();
