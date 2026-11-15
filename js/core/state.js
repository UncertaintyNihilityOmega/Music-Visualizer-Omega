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
