// A sample drawing for Solarium's design pictures (ROADMAP item 16). Not part of the app: load it in the
// preview after engine/probe.js, then ProbeArt.show(). It never touches the user's own art: writes to
// localStorage 'viz.sandbox' are blocked for the rest of this page's life, and ProbeArt.restore() puts the
// art that was in memory back.
(function(){
  'use strict';
  var keep = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v){ if (/^viz\.(auto\.|saves|sandbox)/.test(String(k))) return; return keep.call(this, k, v); };
  var A = window.ProbeArt = {}, snap = null;
  // palette index: row (light 82, 68, 55, 42, 30, 18) * 6 + column (hue 355, 25, 95, 150, 205, 265); greys 36..41
  var GRASS = 20, LEAF = 27, LEAF2 = 21, TRUNK = 25, DIRT = 19, STONE = 38, STONE2 = 39, WATER = 16, WATER2 = 22,
      GOLD = 7, CLOUD = 36, CLOUD2 = 37, ROOF = 18, WALL = 13, DOOR = 31, FLOWER = 12;
  A.show = function(){
    App.modes.setMode('sandbox');
    var SB = App.modes.registry.sandbox.probe().SB;
    if (!snap) snap = JSON.stringify({ grid: SB.grid, inventory: SB.inventory, zoom: SB.zoom, viewX: SB.viewX, viewY: SB.viewY, userZoomed: SB.userZoomed });
    var g = {}, C = SB.cols, R = SB.rows;
    function put(x, y, i){ if (x >= 0 && y >= 0 && x < C && y < R) g[x + ',' + y] = i; }
    var ground = R - 4;
    for (var x = 0; x < C; x++){
      put(x, ground, (x > C * 0.62 && x < C * 0.8) ? WATER : GRASS);
      put(x, ground + 1, (x > C * 0.62 && x < C * 0.8) ? WATER2 : DIRT);
      put(x, ground + 2, x % 7 === 3 ? GOLD : DIRT);
      put(x, ground + 3, x % 5 === 1 ? STONE2 : STONE);
    }
    var tx = Math.round(C * 0.3);
    for (var y = ground - 1; y > ground - 7; y--) put(tx, y, TRUNK);
    for (var dy = -3; dy <= 1; dy++) for (var dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) < 5) put(tx + dx, ground - 8 + dy, (dx + dy) % 3 ? LEAF : LEAF2);
    var hx = Math.round(C * 0.5);
    for (var wy = ground - 1; wy > ground - 4; wy--) for (var wx = 0; wx < 5; wx++) put(hx + wx, wy, (wx === 2 && wy > ground - 3) ? DOOR : WALL);
    for (var r = 0; r < 3; r++) for (var rx = -r; rx < 5 + r; rx++) put(hx + rx, ground - 6 + r, ROOF);
    put(Math.round(C * 0.12), ground - 1, FLOWER); put(Math.round(C * 0.18), ground - 1, FLOWER);
    var clouds = [[Math.round(C * 0.08), 2], [Math.round(C * 0.62), 1]];
    clouds.forEach(function(c){ for (var cx = 0; cx < 6; cx++){ put(c[0] + cx, c[1] + 1, CLOUD); if (cx > 0 && cx < 5) put(c[0] + cx, c[1], cx % 2 ? CLOUD : CLOUD2); } });
    SB.grid = g; SB.dirty = false;
    return { cols: C, rows: R, cells: Object.keys(g).length };
  };
  A.restore = function(){
    if (!snap) return;
    var SB = App.modes.registry.sandbox.probe().SB, back = JSON.parse(snap);
    Object.keys(back).forEach(function(k){ SB[k] = back[k]; });
    SB.dirty = false;
  };
})();
