/* =========================================================================
   TRANSPORT: play/pause/seek/volume controls and <audio> event wiring
   ========================================================================= */
(function(){
  'use strict';
  var S = App.state, U = App.util, Aud = App.audio, P = App.player;
  var audio = S.audio;

  audio.addEventListener('error', function(){
    var track = S.playlist[S.currentIndex];
    if (!track || track.isLocal || track.retried) return;
    track.retried = true;
    audio.crossOrigin = null;
    audio.src = track.url;
    audio.load();
    audio.play().catch(function(){});
    S.corsNoteEl.textContent = '🔒 Playing, but this source blocks the visualizer (no CORS access).';
  });

  audio.addEventListener('ended', function(){
    if (S.repeatMode === 'one'){ audio.currentTime = 0; audio.play(); return; }
    P.goNext(true);
  });
  audio.addEventListener('play', function(){ S.playBtn.textContent = '❚❚'; S.playBtn.setAttribute('aria-label', 'Pause'); });
  audio.addEventListener('pause', function(){ S.playBtn.textContent = '▶'; S.playBtn.setAttribute('aria-label', 'Play'); });
  audio.addEventListener('timeupdate', function(){
    if (!S.isSeeking) S.seekBar.value = audio.duration ? (audio.currentTime / audio.duration * 100) : 0;
    S.curTimeEl.textContent = U.formatTime(audio.currentTime);
    S.durTimeEl.textContent = U.formatTime(audio.duration);
  });

  S.playBtn.addEventListener('click', function(){
    if (S.currentIndex === -1){
      if (S.playlist.length) P.playIndex(0);
      return;
    }
    Aud.ensureAudioGraph();
    if (Aud.audioCtx.state === 'suspended') Aud.audioCtx.resume();
    if (audio.paused) audio.play(); else audio.pause();
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
    S.repeatBtn.textContent = S.repeatMode === 'one' ? '🔂' : '🔁';
    S.repeatBtn.title = S.repeatMode === 'none' ? 'Repeat off' : (S.repeatMode === 'all' ? 'Repeat all' : 'Repeat one');
  });

  S.seekBar.addEventListener('input', function(){ S.isSeeking = true; });
  S.seekBar.addEventListener('change', function(){
    if (audio.duration) audio.currentTime = (S.seekBar.value / 100) * audio.duration;
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
