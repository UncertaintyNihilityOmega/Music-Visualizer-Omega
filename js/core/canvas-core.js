/* =========================================================================
   CANVAS CORE
   Resize handling, the cached-background system (one drawImage per frame
   instead of repainting a gradient + decorations every frame), and the
   generic emoji-sprite cache shared by every mode AND both games (towers,
   the trash-can icon, evolution icons all stamp emoji the same way Emoji
   mode does).

   Resize needs to reset per-mode/per-game transient state (rain drop
   positions, ice motes, the TD path, the RPG player's clamp, etc) but has
   no business knowing what those are — each mode/game registers its own
   resize hook instead of this file reaching into their state directly.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas;
  var canvas = App.state.canvas, ctx = App.state.ctx;
  Can.canvas = canvas;
  Can.ctx = ctx;

  var resizeHooks = [];
  Can.addResizeHook = function(fn){ resizeHooks.push(fn); };

  var bgVersion = 0;
  Can.invalidateBG = function(){ bgVersion++; };

  function dpr(){ return Math.min(App.cfg.CFG.look.dprCap, window.devicePixelRatio || 1); }
  Can.dpr = dpr;

  function resizeCanvas(){
    var ratio = dpr();
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    bgVersion++;
    for (var i = 0; i < resizeHooks.length; i++) resizeHooks[i]();
  }
  Can.resizeCanvas = resizeCanvas;

  /* ---------- Cached backgrounds (one drawImage per frame) ---------- */
  var bgCanvas = null, bgKey = '';
  function getBG(){
    var key = App.modes.current + '|' + canvas.width + 'x' + canvas.height + '|' + bgVersion;
    if (bgCanvas && bgKey === key) return bgCanvas;
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = canvas.width;
    bgCanvas.height = canvas.height;
    paintBG(bgCanvas.getContext('2d'), canvas.width, canvas.height);
    bgKey = key;
    return bgCanvas;
  }
  function paintBG(c, w, h){
    var CFG = App.cfg.CFG;
    var cfg = CFG[App.modes.current] || CFG.basic;
    var mode = App.modes.registry[App.modes.current];
    // a mode may supply its own background colours (Basic follows the theme)
    var over = mode && mode.bgColors ? mode.bgColors() : null;
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, (over && over.bg1) || cfg.bg1 || '#ffffff');
    g.addColorStop(1, (over && over.bg2) || cfg.bg2 || '#eeeeee');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // each mode paints its own decorative backdrop on top of the base gradient
    if (mode && mode.paintBG) mode.paintBG(c, w, h, dpr());
  }
  function backdrop(trail){
    var bg = getBG();
    ctx.globalAlpha = trail;
    ctx.drawImage(bg, 0, 0);
    ctx.globalAlpha = 1;
  }
  Can.backdrop = backdrop;

  /* ---------- Emoji sprites ----------
     Glyphs are pre-rendered into sprite canvases and blitted with drawImage.
     fillText inherits whatever fillStyle the previous mode left behind,
     which is what made emoji translucent in the original single-canvas
     version; drawImage cannot inherit anything. Cached forever by glyph —
     a given glyph's bitmap never needs to change, so there's nothing to
     invalidate. */
  var emojiSprites = {};
  var EMOJI_SPRITE_PX = 128;
  function getEmojiSprite(glyph){
    if (emojiSprites[glyph]) return emojiSprites[glyph];
    var pad = Math.round(EMOJI_SPRITE_PX * 0.28);
    var size = EMOJI_SPRITE_PX + pad * 2;
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var c = cv.getContext('2d');
    c.font = EMOJI_SPRITE_PX + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.globalAlpha = 1;
    c.fillStyle = '#000000';
    c.fillText(glyph, size / 2, size / 2);
    emojiSprites[glyph] = cv;
    return cv;
  }
  function stampEmoji(sprite, x, y, rot, size, alpha){
    var d = size * 1.56;
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(sprite, -d / 2, -d / 2, d, d);
    ctx.restore();
  }
  Can.getEmojiSprite = getEmojiSprite;
  Can.stampEmoji = stampEmoji;

  App.cfg.registerDefaults('look', { dprCap: 1.5, fps: 60, motion: 1, glow: 0.5 });
  App.cfg.registerSchema({ id: 'look', label: 'Performance & feel', fields: [
    ['dprCap', 'Render resolution', 'range', 1, 2, 0.25],
    ['fps', 'Frame rate cap', 'select', [30, 45, 60]],
    ['motion', 'Motion speed', 'range', 0.2, 2, 0.05],
    ['glow', 'Glow amount', 'range', 0, 1, 0.05]
  ]}, 1);
  App.cfg.onGroupChange('look', function(key){
    if (key === 'dprCap' || key === null) resizeCanvas();
  });
})();
