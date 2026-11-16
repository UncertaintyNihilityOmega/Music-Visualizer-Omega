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
        '<button type="button" class="pill-btn" id="installBtn">⬇ Install the app</button>' +
      '</div>' +
      '<p class="source-note" id="installNote" aria-live="polite"></p>' +
      '<p class="source-note" id="reconnectRow" hidden>' +
        '<button type="button" class="pill-btn" id="reconnectBtn">↻ Reconnect</button>' +
        '<button type="button" class="link-btn" id="forgetFolderBtn">forget them</button>' +
      '</p>' +
      '<p class="source-note" id="libraryNote">Nothing is uploaded or copied. Songs play straight from where they already are on this device.</p>' +
      '<label class="check-row" id="keepRow"><input type="checkbox" id="keepCopies"> <span>Keep a copy of added songs inside the app</span></label>' +
      '<p class="source-note" id="keepNote"></p>' +
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

    /* ----- install (js/core/install.js) ----- */
    var Ins = App.install, installBtn = document.getElementById('installBtn'), installNote = document.getElementById('installNote');
    function paintInstall(){
      installBtn.hidden = Ins.installed();
      installBtn.classList.toggle('primary', Ins.canPrompt);
      if (Ins.installed()) installNote.textContent = '';
    }
    Ins.onChange = paintInstall;
    paintInstall();
    installBtn.addEventListener('click', function(){
      var words = Ins.install();
      installNote.textContent = words || '';
    });

    /* ----- folder that stays on the device ----- */
    var openBtn = document.getElementById('openFolderBtn');
    var reRow = document.getElementById('reconnectRow');
    var reBtn = document.getElementById('reconnectBtn');
    var note = document.getElementById('libraryNote');
    // a browser that can open neither kind of folder (an iPhone's) gets no folder button: "Add files" does the job
    if (!Lib.supported() && !('webkitdirectory' in document.getElementById('folder-input'))) openBtn.hidden = true;
    P.note = function(words){ note.textContent = words; };
    document.getElementById('addFilesBtn').addEventListener('click', function(){ P.chooseFiles(); });
    openBtn.addEventListener('click', function(){
      if (!Lib.supported()){ document.getElementById('folder-input').click(); return; }
      Lib.pickFolder().then(function(res){
        if (res) note.textContent = res.count + ' songs from "' + res.name + '". The folder is remembered: next time, one tap brings it back.';
      }).catch(function(err){ note.textContent = err.message; });
    });

    /* ----- what was remembered last time (js/player/library.js) ----- */
    function plural(n, one, many){ return n + ' ' + (n === 1 ? one : many); }
    // "2 folders and 3 songs", from the things still waiting for permission
    function waitingWords(list){
      var f = 0, s = 0;
      list.forEach(function(rec){ if (rec.kind === 'folder') f++; else s++; });
      if (f === 1 && !s) return '"' + list[0].name + '"';
      var parts = [];
      if (f) parts.push(plural(f, 'folder', 'folders'));
      if (s) parts.push(plural(s, 'song', 'songs'));
      return parts.join(' and ');
    }
    function paintWaiting(){
      var list = Lib.waiting();
      reRow.hidden = !list.length;
      if (list.length) reBtn.textContent = '↻ Reconnect ' + waitingWords(list);
    }
    reBtn.addEventListener('click', function(){
      Lib.reconnect().then(function(res){
        paintWaiting();
        note.textContent = plural(res.count, 'song is', 'songs are') + ' back.' +
          (res.left ? ' The browser did not give permission for the rest: tap Reconnect again.' : '');
      }).catch(function(err){ note.textContent = err.message; });
    });
    document.getElementById('forgetFolderBtn').addEventListener('click', function(){
      Lib.forget(['folder', 'file']).then(paintWaiting);
    });
    Lib.restore().then(function(res){
      paintWaiting();
      if (res.loaded) note.textContent = plural(res.loaded, 'song', 'songs') + ' from last time.' +
        (res.waiting.length ? ' Tap Reconnect for the rest: the browser asks for permission again after the app was closed.' : '');
      else if (res.waiting.length) note.textContent = 'Tap Reconnect to bring back ' + waitingWords(res.waiting) +
        ' from last time. The browser asks for permission again after the app was closed; copies kept inside the app need no question.';
    });

    /* ----- keep a copy inside the app ----- */
    var keepBox = document.getElementById('keepCopies'), keepNote = document.getElementById('keepNote');
    function megabytes(b){ return b < 1048576 ? '0.' + Math.max(1, Math.round(b / 104858)) + ' MB' : Math.round(b / 1048576) + ' MB'; }
    function paintKeep(){
      keepBox.checked = Lib.keepCopies();
      Lib.summary().then(function(s){
        var words = keepBox.checked
          ? 'On: every song you add from now on is also copied into the app, on this device only. It is there the next time with no question asked, and it takes space.'
          : 'Off: songs play from where they are and nothing is copied. On an iPhone, or for songs added by drag and drop, this switch is the only way to have them back next time.';
        keepNote.textContent = words + (s.copies ? ' Kept now: ' + plural(s.copies, 'song', 'songs') + ', ' + megabytes(s.bytes) + '. ' : '');
        if (s.copies){
          var del = document.createElement('button');
          del.type = 'button'; del.className = 'link-btn'; del.textContent = 'delete the copies';
          del.addEventListener('click', function(){
            Lib.forget(['copy']).then(function(){
              S.playlist.forEach(function(t){ if (t.blob) delete t.savedId; });
              note.textContent = 'The copies are deleted. Songs already in the playlist play until the app is closed.';
              paintKeep();
            });
          });
          keepNote.appendChild(del);
        }
      });
    }
    if (!Lib.canKeep()) document.getElementById('keepRow').hidden = true;
    keepBox.addEventListener('change', function(){ Lib.setKeepCopies(keepBox.checked); paintKeep(); });
    P.onKept = paintKeep;
    paintKeep();

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
