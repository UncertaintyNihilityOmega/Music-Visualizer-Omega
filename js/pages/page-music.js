/* =========================================================================
   PAGE: Music
   Where sound comes from: a folder or files already on this device, the
   microphone, or a direct link. Markup only - the behaviour lives in
   js/player/playlist.js, js/player/library.js and init() below.
   ========================================================================= */
App.pages.define('music', {
  label: 'Music',
  html:
    '<div class="card">' +
      '<div class="source-row">' +
        '<button type="button" class="pill-btn primary" id="openFolderBtn">📁 Open a music folder</button>' +
        '<button type="button" class="pill-btn" id="addFilesBtn">🎵 Add files</button>' +
        '<button type="button" class="pill-btn" id="micBtn" aria-pressed="false">🎙 Microphone: off</button>' +
      '</div>' +
      '<p class="source-note" id="reconnectRow" hidden>' +
        '<button type="button" class="pill-btn" id="reconnectBtn">↻ Reconnect folder</button>' +
        '<button type="button" class="link-btn" id="forgetFolderBtn">forget it</button>' +
      '</p>' +
      '<p class="source-note" id="libraryNote">Nothing is uploaded or copied. Songs play straight from where they already are on this device.</p>' +
      '<p class="source-note" id="micNote" aria-live="polite"></p>' +
      '<div class="drop-zone" id="dropZone">' +
        '<p>Drag &amp; drop songs or a whole folder here</p>' +
        '<p class="sub">or tap to choose files</p>' +
        '<button type="button" class="folder-link" id="folderLink">choose an entire folder instead</button>' +
        '<input type="file" id="file-input" accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.flac,.ogg,.opus,.wav,.mp4,.webm" multiple>' +
        '<input type="file" id="folder-input" webkitdirectory multiple>' +
      '</div>' +
      '<div class="url-row">' +
        '<input type="url" id="urlInput" placeholder="Paste a direct audio file URL">' +
        '<button id="loadUrlBtn" type="button">Add</button>' +
      '</div>' +
      '<p class="url-hint">A direct link to an audio file works. YouTube and Spotify links do not: those sites do not allow it.</p>' +
      '<p class="source-note" id="devRow" hidden>' +
        '<button type="button" class="pill-btn" id="devSongsBtn">🧪 Load the test-songs folder</button> ' +
        '<span class="muted">shown on the local dev server only</span>' +
      '</p>' +
    '</div>' +
    '<div class="card">' +
      '<div class="playlist-title"><span>Playlist</span><span id="trackCount">0 tracks</span></div>' +
      '<div class="playlist" id="playlistEl"></div>' +
      '<p class="playlist-empty" id="playlistEmpty">Your songs will show up here once you add them</p>' +
    '</div>',

  init: function(){
    var Aud = App.audio, S = App.state, Lib = App.library, P = App.player;
    var micBtn = document.getElementById('micBtn');
    var micNote = document.getElementById('micNote');

    /* ----- microphone ----- */
    function paintMic(){
      var on = Aud.source === 'mic';
      micBtn.textContent = on ? '🎙 Microphone: on' : '🎙 Microphone: off';
      micBtn.classList.toggle('active', on);
      micBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on){
        micNote.textContent = 'Listening. The visuals follow whatever the microphone hears; nothing is recorded or sent anywhere.';
        S.nowPlayingEl.textContent = '🎙 Microphone';
      } else {
        if (micNote.textContent.indexOf('Listening') === 0) micNote.textContent = '';
        var tr = S.playlist[S.currentIndex];
        S.nowPlayingEl.textContent = tr ? tr.name : 'Nothing loaded yet — add some music below';
      }
    }
    Aud.onSourceChange = paintMic;
    if (!Aud.micSupported()) micBtn.disabled = true;
    micBtn.addEventListener('click', function(){
      if (Aud.source === 'mic'){ Aud.stopMic(); return; }
      micNote.textContent = 'Asking for the microphone…';
      Aud.startMic().catch(function(err){ micNote.textContent = err.message; });
    });

    /* ----- folder that stays on the device ----- */
    var openBtn = document.getElementById('openFolderBtn');
    var reRow = document.getElementById('reconnectRow');
    var reBtn = document.getElementById('reconnectBtn');
    var note = document.getElementById('libraryNote');
    document.getElementById('addFilesBtn').addEventListener('click', function(){
      document.getElementById('file-input').click();
    });
    openBtn.addEventListener('click', function(){
      if (!Lib.supported()){ document.getElementById('folder-input').click(); return; }
      Lib.pickFolder().then(function(res){
        if (res) note.textContent = res.count + ' songs from "' + res.name + '". The folder is remembered: next time, one tap brings it back.';
      }).catch(function(err){ note.textContent = err.message; });
    });
    reBtn.addEventListener('click', function(){
      Lib.reconnect().then(function(res){
        if (res){ reRow.hidden = true; note.textContent = res.count + ' songs from "' + res.name + '".'; }
      }).catch(function(err){ note.textContent = err.message; });
    });
    document.getElementById('forgetFolderBtn').addEventListener('click', function(){
      Lib.forget().then(function(){ reRow.hidden = true; });
    });
    Lib.remembered().then(function(info){
      if (!info) return;
      if (info.granted){
        // permission is still held from last time: just load it
        Lib.reconnect().then(function(res){ if (res) note.textContent = res.count + ' songs from "' + res.name + '".'; }).catch(function(){});
      } else {
        reBtn.textContent = '↻ Reconnect "' + info.name + '"';
        reRow.hidden = false;
      }
    });

    /* ----- dev only: the real songs in test-songs/ ----- */
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
      fetch('__dev/test-songs').then(function(r){ return r.ok ? r.json() : null; }).then(function(list){
        if (!list || !list.length) return;
        document.getElementById('devRow').hidden = false;
        document.getElementById('devSongsBtn').addEventListener('click', function(){
          P.addTracks(list.map(function(name){
            return { name: App.util.stripExt(name), url: 'test-songs/' + encodeURIComponent(name), isLocal: false, sameOrigin: true };
          }));
        });
      }).catch(function(){});
    }
  }
});
