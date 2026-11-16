/* =========================================================================
   Shared state
   Grabs the DOM references everything else reads. Loads after the pages
   are mounted (js/pages/pages-mount.js), because the playlist elements
   live inside the Music page.
   ========================================================================= */
(function(){
  'use strict';

  var S = App.state;

  /* ---------- DOM refs ---------- */
  S.audio = document.getElementById('audio');
  // A second player that is NOT wired into the sound analysis. A web address
  // whose server does not allow its sound to be read can only be heard
  // through a plain player like this one: sent through the analysis, the
  // browser replaces its sound with silence. S.player() is whichever of the
  // two is playing the current track.
  S.plainAudio = new Audio();
  S.plainAudio.preload = 'metadata';
  S.usingPlain = false;
  S.player = function(){ return S.usingPlain ? S.plainAudio : S.audio; };
  S.canvas = document.getElementById('visualizer');
  S.ctx = S.canvas.getContext('2d');
  S.nowPlayingEl = document.getElementById('nowPlaying');
  S.corsNoteEl = document.getElementById('corsNote');
  S.playlistEl = document.getElementById('playlistEl');
  S.playlistEmpty = document.getElementById('playlistEmpty');
  S.trackCountEl = document.getElementById('trackCount');
  S.seekBar = document.getElementById('seekBar');
  S.curTimeEl = document.getElementById('curTime');
  S.durTimeEl = document.getElementById('durTime');
  S.volumeEl = document.getElementById('volume');
  S.playBtn = document.getElementById('playBtn');
  S.shuffleBtn = document.getElementById('shuffleBtn');
  S.repeatBtn = document.getElementById('repeatBtn');

  /* ---------- Playlist / playback state ---------- */
  S.playlist = [];        // {name, url, isLocal, retried}
  S.order = [];            // playback order (array of playlist indices)
  S.orderPos = 0;
  S.currentIndex = -1;
  S.shuffleEnabled = false;
  S.repeatMode = 'none';   // 'none' | 'all' | 'one'
  S.isSeeking = false;
})();
