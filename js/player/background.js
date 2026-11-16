/* =========================================================================
   BACKGROUND PLAY
   Keeps the music going when the app is not on screen (another app is
   open, or the phone is locked), like a music app.

   1. Media Session: tells the phone what is playing, so the lock screen
      and the notification show the song with play / pause / next / previous
      buttons, and headphone buttons work.
   2. The sound engine is woken if the phone put it to sleep while the app
      was away.
   3. iPhone and iPad only: Safari silences sound that passes through the
      analysis as soon as the page is hidden. So while the page is hidden
      the song is moved to the plain player (state.js), which Safari lets
      play on, and moved back when the page is seen again. The switch
      costs a short gap, which is why other devices do not do it.
   ========================================================================= */
(function(){
  'use strict';
  var S = App.state, P = App.player, Aud = App.audio;
  var B = App.background = {};
  var MS = navigator.mediaSession || null;

  var ua = navigator.userAgent || '';
  B.needsHandover = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  S.bgPlain = false;     // true while a readable song is on the plain player because the page is hidden

  /* ---------- 1. Media Session ---------- */
  function artwork(){
    return [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ];
  }
  function describe(){
    if (!MS || !window.MediaMetadata) return;
    var tr = S.playlist[S.currentIndex];
    try {
      MS.metadata = tr ? new MediaMetadata({ title: tr.name, artist: 'Music Visualiser Omega', artwork: artwork() }) : null;
    } catch (e) {}
  }
  function position(){
    if (!MS || !MS.setPositionState) return;
    var el = S.player();
    if (!el.duration || !isFinite(el.duration)) return;
    try { MS.setPositionState({ duration: el.duration, position: Math.min(el.currentTime, el.duration), playbackRate: el.playbackRate || 1 }); } catch (e) {}
  }
  B.describe = describe;

  function handler(name, fn){
    if (!MS) return;
    try { MS.setActionHandler(name, fn); } catch (e) {}   // a browser that lacks one action throws
  }
  handler('play', function(){ wake(); var p = S.player().play(); if (p && p.catch) p.catch(function(){}); });
  handler('pause', function(){ S.player().pause(); });
  handler('previoustrack', function(){ P.goPrev(); });
  handler('nexttrack', function(){ P.goNext(false); });
  handler('seekto', function(d){
    var el = S.player();
    if (d && typeof d.seekTime === 'number' && el.duration) el.currentTime = Math.max(0, Math.min(el.duration, d.seekTime));
    position();
  });
  handler('seekbackward', function(d){ var el = S.player(); el.currentTime = Math.max(0, el.currentTime - ((d && d.seekOffset) || 10)); position(); });
  handler('seekforward', function(d){ var el = S.player(); if (el.duration) el.currentTime = Math.min(el.duration, el.currentTime + ((d && d.seekOffset) || 10)); position(); });

  [S.audio, S.plainAudio].forEach(function(el){
    function mine(){ return el === S.player(); }
    el.addEventListener('play', function(){ if (!mine()) return; describe(); if (MS) MS.playbackState = 'playing'; });
    el.addEventListener('pause', function(){ if (mine() && MS) MS.playbackState = 'paused'; });
    el.addEventListener('loadedmetadata', function(){ if (mine()){ describe(); position(); } });
    el.addEventListener('seeked', function(){ if (mine()) position(); });
    el.addEventListener('ratechange', function(){ if (mine()) position(); });
  });

  /* ---------- 2. wake the sound engine ---------- */
  function wake(){
    var ctx = Aud.audioCtx;
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume){
      var p = ctx.resume();
      if (p && p.catch) p.catch(function(){});
    }
  }
  B.wake = wake;

  /* ---------- 3. hand the song over while hidden (iPhone, iPad) ---------- */
  function moveTo(target, from){
    var tr = S.playlist[S.currentIndex];
    if (!tr || !tr.url) return;
    var at = from.currentTime || 0, wasPlaying = !from.paused;
    from.pause();
    function go(){
      target.removeEventListener('loadedmetadata', go);
      try { target.currentTime = at; } catch (e) {}
      if (wasPlaying){ var p = target.play(); if (p && p.catch) p.catch(function(){}); }
    }
    if (target.getAttribute('src') !== tr.url){
      target.addEventListener('loadedmetadata', go);
      target.src = tr.url;
      target.load();
    } else go();
  }
  B.toBackground = function(){
    var tr = S.playlist[S.currentIndex];
    if (S.bgPlain || S.usingPlain || !tr || tr.noRead || S.audio.paused || Aud.source === 'mic') return;
    S.bgPlain = true;
    S.usingPlain = true;
    moveTo(S.plainAudio, S.audio);
  };
  B.toForeground = function(){
    if (!S.bgPlain) return;
    S.bgPlain = false;
    var tr = S.playlist[S.currentIndex];
    if (!tr || tr.noRead) return;          // the song changed to one that must stay on the plain player
    S.usingPlain = false;
    wake();
    moveTo(S.audio, S.plainAudio);
  };

  document.addEventListener('visibilitychange', function(){
    if (document.hidden){
      if (B.needsHandover) B.toBackground();
    } else {
      wake();
      B.toForeground();
      P.resumeOwed();      // a song whose start was refused while the page was hidden
    }
  });
  // some phones pause the engine without hiding the page (a call, another app's sound)
  window.addEventListener('focus', wake);
  window.addEventListener('pageshow', wake);
})();
