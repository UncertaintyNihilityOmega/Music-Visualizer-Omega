/* =========================================================================
   TAP / TOUCH — every mode reacts where you touch.
   This file owns only the generic expanding-ring effect (used by Rain,
   Fire, Ice, Aquatic, Nature, Emoji) plus the dispatch/pointer wiring.
   Basic/String/Piano have their own bespoke tap visuals and render them
   through their own drawTapFX hook; everything else's tap-spawned
   particles ride along in that mode's own normal per-frame draw already,
   so they need no extra hook here.
   ========================================================================= */
(function(){
  'use strict';
  var T = App.taps = {};
  var canvas = App.canvas.canvas;

  function canvasPoint(ev){
    var r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / Math.max(1, r.width)),
      y: (ev.clientY - r.top) * (canvas.height / Math.max(1, r.height))
    };
  }
  T.canvasPoint = canvasPoint;

  var tapRings = [];
  function spawnRing(x, y, color){
    tapRings.push({ x: x, y: y, age: 0, life: 0.9, color: color || '#C2626F' });
    if (tapRings.length > 20) tapRings.shift();
  }
  T.spawnRing = spawnRing;

  function tapAt(x, y){
    var mode = App.modes.registry[App.modes.current];
    if (mode && mode.onTap) mode.onTap(x, y);
  }
  T.tapAt = tapAt;

  function drawTaps(){
    var ctx = App.canvas.ctx, dt = App.audio.A.dt, k = App.canvas.dpr();
    for (var i = tapRings.length - 1; i >= 0; i--){
      var tp = tapRings[i];
      tp.age += dt;
      if (tp.age > tp.life){ tapRings.splice(i, 1); continue; }
      var f = tp.age / tp.life;
      ctx.save();
      ctx.globalAlpha = (1 - f) * 0.55;
      ctx.strokeStyle = tp.color;
      ctx.lineWidth = (2.4 * (1 - f) + 0.4) * k;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, f * 46 * k, 0, 6.283);
      ctx.stroke();
      ctx.restore();
    }
    // only the active mode's own tap effects render, so switching modes
    // doesn't leave another mode's tap particles briefly showing through
    var mode = App.modes.registry[App.modes.current];
    if (mode && mode.drawTapFX) mode.drawTapFX();
  }
  T.drawTaps = drawTaps;
  T.reset = function(){ tapRings.length = 0; };

  // In fullscreen a short tap on the picture pauses or plays the song (ROADMAP
  // item 21), so fullscreen need not be closed to stop the music. The mode's
  // own touch effect is skipped then, except where the mode keeps the tap
  // (keepsTap: Piano's keys). Outside fullscreen a tap is the mode's, as before.
  // A press that moves more than 14 px or lasts over 0.5 s is not a tap.
  var press = null;
  function tapPauses(pt){
    if (!App.cfg.CFG.look.fsTapPause || !App.isFull || !App.isFull()) return false;
    var mode = App.modes.registry[App.modes.current];
    return !(mode && mode.keepsTap && mode.keepsTap(pt.x, pt.y));
  }
  T.tapPauses = tapPauses;
  canvas.addEventListener('pointerdown', function(ev){
    if (App.games.isGameMode(App.modes.current)) return;   // games use the canvas for their own input
    var pt = canvasPoint(ev);
    if (tapPauses(pt)){ press = { x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId }; return; }
    tapAt(pt.x, pt.y);
  });
  canvas.addEventListener('pointerup', function(ev){
    var p = press; press = null;
    if (!p || p.id !== ev.pointerId) return;
    if (Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > 14 || performance.now() - p.t > 500) return;
    var S = App.state;
    if (S.currentIndex === -1 && !S.playlist.length) return;   // nothing to play
    S.playBtn.click();
    T.flashPlayState();
  });
  canvas.addEventListener('pointercancel', function(){ press = null; });

  // A large pause or play sign in the middle of the picture for 0.7 s.
  var sign = null, signTimer = 0;
  T.flashPlayState = function(){
    if (!sign){
      sign = document.createElement('div');
      sign.className = 'tap-sign';
      sign.setAttribute('aria-hidden', 'true');
      canvas.parentNode.appendChild(sign);
    }
    var paused = App.state.player().paused;
    sign.innerHTML = paused
      ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';
    sign.classList.remove('show');
    void sign.offsetWidth;            // restart the fade
    sign.classList.add('show');
    clearTimeout(signTimer);
    signTimer = setTimeout(function(){ sign.classList.remove('show'); }, 700);
  };
  // drop a photo straight onto the canvas for Emoji mode
  canvas.addEventListener('dragover', function(ev){ ev.preventDefault(); });
  canvas.addEventListener('drop', function(ev){
    ev.preventDefault();
    if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]){
      if (App.cfg.ACTIONS.photoPick) App.cfg.ACTIONS.photoPick(ev.dataTransfer.files[0]);
      App.modes.setMode('emoji');
    }
  });
})();
