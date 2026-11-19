/* =========================================================================
   MAIN: fullscreen wiring, global keyboard shortcuts, and the bootstrap
   sequence. Loads dead last, after every mode/game/core file has finished
   *defining* itself — this is the only file allowed to actually start
   things (build CFG, size the canvas, pick the initial mode, kick off the
   render loop).
   ========================================================================= */
(function(){
  'use strict';
  var S = App.state, G = App.games, M = App.modes, Can = App.canvas;

  /* ---------- Fullscreen visualizer ---------- */
  var vizCard = document.getElementById('vizCard');
  var fsBtn = document.getElementById('fsBtn');
  // An iPhone's browser has no fullscreen for a page element (an iPad's and
  // every other browser's has). There the button makes the picture fill the
  // window instead: the class "viz-fill" in styles.css.
  var canFs = !!(vizCard.requestFullscreen || vizCard.webkitRequestFullscreen);
  function isFull(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement) || vizCard.classList.contains('viz-fill');
  }
  App.isFull = isFull;
  // On a phone held upright, fullscreen turns the picture sideways, the way
  // a video does: every mode is drawn for a wide picture. The phone lets a
  // page do that only while it is in real fullscreen, and gives the screen
  // back to the user's own setting on leaving. ("Performance & feel" has the
  // switch; an iPhone cannot be turned by a page at all.)
  function turnSideways(){
    var o = screen.orientation;
    var touch = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
    if (!o || !o.lock || !touch || !App.cfg.CFG.look.fsTurn) return;
    try { var p = o.lock('landscape'); if (p && p.catch) p.catch(function(){}); } catch (e) {}
  }
  function toggleFullscreen(){
    if (!canFs){
      var on = vizCard.classList.toggle('viz-fill');
      document.documentElement.classList.toggle('viz-fill-on', on);
      onFsChange();
      return;
    }
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl){
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = vizCard.requestFullscreen || vizCard.webkitRequestFullscreen;
      if (!req) return;
      var p = req.call(vizCard);
      if (p && p.then) p.then(turnSideways, function(){}); else setTimeout(turnSideways, 200);
    }
  }
  App.toggleFullscreen = toggleFullscreen;
  fsBtn.addEventListener('click', toggleFullscreen);

  // In fullscreen the buttons lie over the picture and fade out after a few
  // seconds without a touch, a mouse move or a key (styles.css "is-full").
  var idleTimer = 0, IDLE_MS = 3500;
  function wakeBar(){
    if (!isFull()) return;
    vizCard.classList.remove('fs-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function(){ if (isFull()) vizCard.classList.add('fs-idle'); }, IDLE_MS);
  }
  ['pointerdown', 'pointermove', 'touchstart'].forEach(function(ev){ vizCard.addEventListener(ev, wakeBar, { passive: true }); });
  document.addEventListener('keydown', wakeBar);
  function onFsChange(){
    var full = isFull();
    vizCard.classList.toggle('is-full', full);
    vizCard.classList.remove('fs-idle');
    clearTimeout(idleTimer);
    if (full) wakeBar();
    fsBtn.textContent = full ? '✕' : '⛶';
    Can.resizeCanvas();
    setTimeout(Can.resizeCanvas, 60);
    setTimeout(Can.resizeCanvas, 400);     // a phone finishes turning the screen a moment later
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* ---------- Keyboard shortcuts ---------- */
  var MODE_ORDER = ['basic', 'strings', 'emoji', 'fire', 'rain', 'nature', 'clock', 'liquid', 'ice', 'aqua', 'piano', 'rpg', 'td', 'cards', 'sandbox'];
  document.addEventListener('keydown', function(e){
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
    var isGame = G.isGameMode(M.current);
    if (isGame && G.handleGameKey(e, true)){ e.preventDefault(); return; }
    switch (e.key){
      case ' ':
        e.preventDefault();
        S.playBtn.click();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) App.player.goNext(false);
        else if (S.player().duration) S.player().currentTime = Math.min(S.player().duration, S.player().currentTime + 5);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) App.player.goPrev();
        else if (S.player().duration) S.player().currentTime = Math.max(0, S.player().currentTime - 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        S.volumeEl.value = Math.min(100, Number(S.volumeEl.value) + 5);
        S.volumeEl.dispatchEvent(new Event('input'));
        break;
      case 'ArrowDown':
        e.preventDefault();
        S.volumeEl.value = Math.max(0, Number(S.volumeEl.value) - 5);
        S.volumeEl.dispatchEvent(new Event('input'));
        break;
      case 'm': case 'M':
        App.audio.setMuted(!App.audio.muted);
        break;
      case 'f': case 'F':
        toggleFullscreen();
        break;
      case 's': case 'S':
        App.cfg.openSettings();
        break;
      case 'v': case 'V':
        M.setMode(MODE_ORDER[(MODE_ORDER.indexOf(M.current) + 1) % MODE_ORDER.length]);
        break;
      default:
        if (!isGame && e.key >= '1' && e.key <= '9') M.setMode(MODE_ORDER[Number(e.key) - 1]);
    }
  });

  document.addEventListener('keyup', function(e){
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (G.isGameMode(M.current)) G.handleGameKey(e, false);
  });

  /* ---------- Bootstrap ---------- */
  App.cfg.init();          // build CFG from every registered group, build the settings panel
  App.theme.init();        // colours + title from the saved theme code (default: Omega)
  Can.resizeCanvas();      // needs CFG.look.dprCap, so must come after cfg.init()
  window.addEventListener('resize', Can.resizeCanvas);
  G.init();                // games-panel button wiring, needs CFG.games
  M.init();                // mode buttons + initial setMode()
  App.pages.initAll();     // each page wires its own controls (needs everything above)
  M.startLoop();           // kick off the shared requestAnimationFrame loop
  App.player.renderPlaylist();
})();
