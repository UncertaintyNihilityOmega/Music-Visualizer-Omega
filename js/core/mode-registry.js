/* =========================================================================
   MODE REGISTRY
   Generic dispatch for both visualizer modes AND games — a "mode" here is
   just whatever button row the user picked. If App.games has a game
   registered under that id, the games host draws it; otherwise it's a
   plain visualizer mode looked up in this registry. Adding a new mode
   (Clock) or a new game (Cards) never touches this file.
   ========================================================================= */
(function(){
  'use strict';
  var M = App.modes;
  M.registry = {};
  M.current = 'basic';

  // def: { draw(), paintBG(c,w,h,k)?, bgColors()?, onTap(x,y)?, drawTapFX()?, reset()?, fx? }
  //   fx: 0..1, how much of the picture layer (js/core/fx.js) this mode wants; left out = 1
  M.register = function(id, def){ M.registry[id] = def; };

  var autoLoaded = {};

  function setMode(mode, userPick){
    var G = App.games;
    if (G.isGameMode(M.current)){
      var leaving = G.currentState();
      if (leaving){
        G.saveAuto(leaving);
        // 'choosing' collapses to 'paused' too, not just 'playing': the
        // shared card-picker state (GAME.cards) isn't namespaced per game,
        // so leaving it pending and letting the OTHER game's own reset
        // clear GAME.cards out from under it would come back as a stuck,
        // undismissable "choose an upgrade" screen with nothing to pick.
        // setGameState (not a direct GAME.state assignment) so the game's
        // OWN .state field agrees - otherwise re-entering this same game
        // later would read its stale 'choosing' right back off itself.
        if (G.GAME.state === 'playing' || G.GAME.state === 'choosing') G.setGameState('paused');
      }
    }
    M.current = mode;

    var btns = document.querySelectorAll('.mode-btn');
    for (var i = 0; i < btns.length; i++){
      var on = btns[i].getAttribute('data-mode') === mode;
      btns[i].classList.toggle('active', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    try { localStorage.setItem('viz.mode', mode); } catch (e) {}

    // every registered mode gets a chance to clear its own transient state —
    // matches the original behavior of resetting everything on every switch
    for (var id in M.registry) if (M.registry[id].reset) M.registry[id].reset();
    if (App.taps && App.taps.reset) App.taps.reset();
    if (App.fx) App.fx.reset();

    var ctx = App.canvas.ctx, canvas = App.canvas.canvas;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    App.cfg.openGroup(G.isGameMode(mode) ? 'games' : mode);

    if (G.isGameMode(mode)){
      var entering = G.currentState();
      if (entering){
        if (!autoLoaded[mode]){ autoLoaded[mode] = true; G.loadAuto(entering); }
        G.onEnterGame(mode);
      }
    }
    G.updateGamePanel();
    // picking a game brings its controls into view; picking a visual never
    // moves the page the user is on (userPick is false on the boot call)
    if (userPick && G.isGameMode(mode) && App.pages) App.pages.show('games');
  }
  M.setMode = setMode;

  /* ---------- master per-frame loop ---------- */
  var lastDraw = 0;
  function drawVisualizer(now){
    requestAnimationFrame(drawVisualizer);
    now = now || performance.now();
    var CFG = App.cfg.CFG, Aud = App.audio;
    var cap = CFG.look.fps;
    if (cap < 60){
      if (now - lastDraw < 1000 / cap - 1) return;
      lastDraw = now;
    }
    frame(now);
  }
  // One frame at time `now` (milliseconds). The loop calls it; a test can
  // call it directly with its own clock to step the idle preview while the
  // page is in the background and animation frames are not firing.
  function frame(now){
    var Aud = App.audio;
    Aud.frame(now);   // real sound when a track or the mic is live, the idle preview otherwise

    var ctx = App.canvas.ctx;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;

    var isGame = App.games.isGameMode(M.current);
    if (isGame){
      App.games.drawGame();
    } else {
      var mode = M.registry[M.current] || M.registry.basic;
      // the picture layer (zoom / shake / flash on hits) wraps the mode's own
      // drawing; mode.fx says how much of it this mode wants (default: all)
      var cv = App.canvas.canvas;
      App.fx.begin(ctx, cv.width, cv.height, mode.fx);
      mode.draw();
      App.taps.drawTaps();
      ctx.shadowBlur = 0;
      App.fx.end(ctx, cv.width, cv.height);
    }
  }
  M.frame = frame;
  M.startLoop = function(){ drawVisualizer(); };

  /* ---------- init: wire the mode buttons, restore last mode ---------- */
  M.init = function(){
    var saved = null;
    try { saved = localStorage.getItem('viz.mode'); } catch (e) {}
    var btns = document.querySelectorAll('.mode-btn');
    var valid = false;
    for (var i = 0; i < btns.length; i++){
      if (btns[i].getAttribute('data-mode') === saved) valid = true;
      (function(b){
        b.addEventListener('click', function(){ setMode(b.getAttribute('data-mode'), true); });
      })(btns[i]);
    }
    setMode(valid ? saved : 'basic');
  };
})();
