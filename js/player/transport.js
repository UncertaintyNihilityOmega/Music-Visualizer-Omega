/* =========================================================================
   TRANSPORT: play/pause/seek/volume controls and <audio> event wiring
   ========================================================================= */
(function(){
  'use strict';
  var S = App.state, U = App.util, Aud = App.audio, P = App.player;
  var audio = S.audio;

  // A web address that fails to load is tried once more on the plain player
  // (see state.js): a server that does not allow its sound to be read makes
  // the first try fail. It then plays, and the picture shows the idle preview.
  audio.addEventListener('error', function(){
    var track = S.playlist[S.currentIndex];
    if (S.usingPlain || !track || track.isLocal || track.retried) return;
    track.retried = true;
    track.noRead = true;
    P.start(track);
  });
  S.plainAudio.addEventListener('error', function(){
    if (!S.usingPlain) return;
    S.corsNoteEl.textContent = 'That address could not be played. It must be a direct link to an audio file.';
  });

  // both players drive the same buttons; only the one in use is listened to
  [audio, S.plainAudio].forEach(function(el){
    function mine(){ return el === S.player(); }
    el.addEventListener('ended', function(){
      if (!mine()) return;
      if (S.repeatMode === 'one'){ el.currentTime = 0; el.play(); return; }
      P.goNext(true);
    });
    el.addEventListener('play', function(){ if (mine()){ S.playBtn.textContent = '❚❚'; S.playBtn.setAttribute('aria-label', 'Pause'); } });
    el.addEventListener('pause', function(){ if (mine()){ S.playBtn.textContent = '▶'; S.playBtn.setAttribute('aria-label', 'Play'); } });
    el.addEventListener('timeupdate', function(){
      if (!mine()) return;
      if (!S.isSeeking) S.seekBar.value = el.duration ? (el.currentTime / el.duration * 100) : 0;
      S.curTimeEl.textContent = U.formatTime(el.currentTime);
      S.durTimeEl.textContent = U.formatTime(el.duration);
    });
  });

  S.playBtn.addEventListener('click', function(){
    if (S.currentIndex === -1){
      if (S.playlist.length) P.playIndex(0);
      return;
    }
    Aud.ensureAudioGraph();
    if (Aud.audioCtx.state === 'suspended') Aud.audioCtx.resume();
    var el = S.player();
    if (el.paused) el.play(); else el.pause();
  });
  document.getElementById('nextBtn').addEventListener('click', function(){ P.goNext(false); });
  document.getElementById('prevBtn').addEventListener('click', P.goPrev);

  S.shuffleBtn.addEventListener('click', function(){
    S.shuffleEnabled = !S.shuffleEnabled;
    S.shuffleBtn.classList.toggle('active', S.shuffleEnabled);
    P.rebuildOrder();
  });
  var repeatModes = ['none', 'all', 'one'];
  S.repeatBtn.addEventListener('click', function(){
    var idx = repeatModes.indexOf(S.repeatMode);
    S.repeatMode = repeatModes[(idx + 1) % repeatModes.length];
    S.repeatBtn.classList.toggle('active', S.repeatMode !== 'none');
    S.repeatBtn.classList.toggle('one', S.repeatMode === 'one');   // the icon gains a small "1"
    S.repeatBtn.title = S.repeatMode === 'none' ? 'Repeat off' : (S.repeatMode === 'all' ? 'Repeat all' : 'Repeat one');
  });

  S.seekBar.addEventListener('input', function(){ S.isSeeking = true; });
  S.seekBar.addEventListener('change', function(){
    var el = S.player();
    if (el.duration) el.currentTime = (S.seekBar.value / 100) * el.duration;
    S.isSeeking = false;
  });
  // volume goes through the engine (a gain after the analyser), not audio.volume
  S.volumeEl.addEventListener('input', function(){ Aud.setVolume(S.volumeEl.value / 100); });

  /* ---------- Remember volume between sessions ---------- */
  try {
    var savedVol = localStorage.getItem('viz.volume');
    if (savedVol !== null) S.volumeEl.value = savedVol;
  } catch (e) {}
  Aud.setVolume(S.volumeEl.value / 100);
  S.volumeEl.addEventListener('change', function(){
    try { localStorage.setItem('viz.volume', S.volumeEl.value); } catch (e) {}
  });
})();
