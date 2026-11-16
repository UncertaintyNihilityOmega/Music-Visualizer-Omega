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
  function toggleFullscreen(){
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl){
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = vizCard.requestFullscreen || vizCard.webkitRequestFullscreen;
      if (req) req.call(vizCard);
    }
  }
  if (!(vizCard.requestFullscreen || vizCard.webkitRequestFullscreen)) fsBtn.style.display = 'none';
  fsBtn.addEventListener('click', toggleFullscreen);
  function onFsChange(){
    fsBtn.textContent = (document.fullscreenElement || document.webkitFullscreenElement) ? '✕' : '⛶';
    setTimeout(Can.resizeCanvas, 60);
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* ---------- Keyboard shortcuts ---------- */
  var MODE_ORDER = ['basic', 'strings', 'emoji', 'rain', 'fire', 'ice', 'aqua', 'nature', 'piano', 'clock', 'td', 'rpg', 'cards', 'sandbox'];
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
