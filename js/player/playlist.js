/* =========================================================================
   PLAYLIST: loading files/folders/URLs, ordering, and rendering the list
   ========================================================================= */
(function(){
  'use strict';
  var P = App.player;
  var S = App.state, U = App.util, Aud = App.audio;
  var audio = S.audio;

  /* ---------- Order / shuffle / repeat ---------- */
  function rebuildOrder(){
    var indices = S.playlist.map(function(_, i){ return i; });
    if (S.shuffleEnabled){
      for (var i = indices.length - 1; i > 0; i--){
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
      }
      if (S.currentIndex !== -1){
        var pos = indices.indexOf(S.currentIndex);
        if (pos > 0){ indices.splice(pos, 1); indices.unshift(S.currentIndex); }
      }
    }
    S.order = indices;
    S.orderPos = S.currentIndex === -1 ? 0 : S.order.indexOf(S.currentIndex);
    applyLoop();
  }
  P.rebuildOrder = rebuildOrder;

  /* ---------- Looping one song ----------
     "Repeat one" (and "repeat all" with a single song) is done by the player
     itself (el.loop), not by starting the song again from script when it
     ends. On a phone with the screen off the page's script may be paused or
     its play() refused at that moment, and the music stopped (reported by
     the user, 2026-11-16: "sometimes it stops, but sometimes it works"). */
  function applyLoop(){
    var one = S.repeatMode === 'one' || (S.repeatMode === 'all' && S.playlist.length === 1);
    audio.loop = one;
    S.plainAudio.loop = one;
  }
  P.applyLoop = applyLoop;

  /* ---------- Starting sound safely ----------
     play() can be refused while the page is hidden. Then the song is owed:
     it starts as soon as the page is seen again (background.js calls
     resumeOwed). A refusal while the page is on screen is left alone, so a
     song never starts by surprise later. */
  S.playOwed = false;
  function safePlay(el){
    var p;
    try { p = el.play(); } catch (e) { p = null; }
    if (p && p.catch) p.catch(function(){ if (document.hidden) S.playOwed = true; });
  }
  P.safePlay = safePlay;
  P.resumeOwed = function(){
    if (!S.playOwed) return;
    S.playOwed = false;
    var el = S.player();
    if (el.paused && S.currentIndex !== -1) safePlay(el);
  };
  // the sound engine may have been put to sleep while the app was away
  function wakeEngine(){
    if (Aud.unfreeze) Aud.unfreeze();      // sound held for Piano's falling notes (audio-engine.js "Late sound")
    var ctx = Aud.audioCtx;
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume){
      var p = ctx.resume();
      if (p && p.catch) p.catch(function(){});
    }
  }
  P.wakeEngine = wakeEngine;

  /* ---------- Playback ---------- */
  function loadAndPlay(i){
    var track = S.playlist[i];
    if (!track) return;
    S.corsNoteEl.textContent = '';
    Aud.ensureAudioGraph();
    wakeEngine();
    S.playOwed = false;
    if (Aud.source === 'mic') Aud.stopMic();   // playing a song hands the visuals back to the music
    S.nowPlayingEl.textContent = track.name;
    renderPlaylist();
    if (track.url){ start(track); return; }
    ready(track).then(function(){
      if (S.playlist[S.currentIndex] === track) start(track);
    }, function(){
      S.corsNoteEl.textContent = 'That file could not be read. If it was moved or its folder was, add it again.';
    });
  }
  // A remembered song is only read now, when it is first played: from the
  // disk through its handle, or from the app's own storage when it is a
  // kept copy (js/player/library.js). Until then the playlist holds no sound.
  function ready(track){
    if (track.url) return Promise.resolve(track);
    if (track.blob){ track.url = URL.createObjectURL(track.blob); return Promise.resolve(track); }
    if (track.handle) return track.handle.getFile().then(function(file){ track.url = URL.createObjectURL(file); return track; });
    return Promise.reject(new Error('nothing to play'));
  }

  /* ---------- Where the music stopped ----------
     The song and the second it had reached are kept, so the next visit
     opens on the same song at the same place, paused. Nothing starts
     playing by itself. */
  var lastSaved = 0;
  function rememberSpot(force){
    var tr = S.playlist[S.currentIndex], el = S.player();
    if (!tr || !tr.path) return;
    var now = Date.now();
    if (!force && now - lastSaved < 5000) return;
    lastSaved = now;
    try { localStorage.setItem('viz.last', JSON.stringify({ path: tr.path, t: Math.floor(el.currentTime || 0) })); } catch (e) {}
  }
  [audio, S.plainAudio].forEach(function(el){
    el.addEventListener('timeupdate', function(){ if (el === S.player() && !el.paused) rememberSpot(false); });
    el.addEventListener('pause', function(){ if (el === S.player()) rememberSpot(true); });
  });
  window.addEventListener('pagehide', function(){ rememberSpot(true); });
  // puts song i on the player at second t without starting it
  function cue(i, t){
    var track = S.playlist[i];
    if (!track || track.noRead) return;
    S.currentIndex = i;
    S.orderPos = Math.max(0, S.order.indexOf(i));
    S.nowPlayingEl.textContent = track.name;
    renderPlaylist();
    ready(track).then(function(){
      if (S.playlist[S.currentIndex] !== track || !audio.paused || S.usingPlain) return;
      audio.crossOrigin = 'anonymous';
      audio.src = track.url;
      audio.load();
      if (t > 0){
        var seek = function(){
          audio.removeEventListener('loadedmetadata', seek);
          if (audio.duration && t < audio.duration - 5) audio.currentTime = t;
        };
        audio.addEventListener('loadedmetadata', seek);
      }
    }, function(){});
  }
  P.cue = cue;
  P.cueLast = function(){
    if (S.currentIndex !== -1 || !S.playlist.length) return;
    var last = null;
    try { last = JSON.parse(localStorage.getItem('viz.last') || 'null'); } catch (e) {}
    var at = -1;
    if (last && last.path) for (var i = 0; i < S.playlist.length; i++) if (S.playlist[i].path === last.path){ at = i; break; }
    cue(at < 0 ? 0 : at, at < 0 ? 0 : (Number(last.t) || 0));
  };
  function start(track){
    var plain = S.plainAudio;
    // a source already found to block reading goes straight to the plain player
    // ... and so does any song while the page is hidden on an iPhone (js/player/background.js)
    if (track.noRead || S.bgPlain){
      audio.pause();
      S.usingPlain = true;
      plain.src = track.url;
      safePlay(plain);
      if (track.noRead) S.corsNoteEl.textContent = P.NO_READ_NOTE;
      return;
    }
    if (S.usingPlain){ plain.pause(); plain.removeAttribute('src'); plain.load(); S.usingPlain = false; }
    audio.crossOrigin = 'anonymous';
    audio.src = track.url;
    audio.load();
    safePlay(audio);
  }
  P.start = start;
  P.NO_READ_NOTE = '🔒 This address lets the music play but does not let the app read its sound, so the picture shows the idle preview. ' +
                   'Download the file and add it to see the visuals follow it.';
  function playIndex(i){
    S.currentIndex = i;
    var pos = S.order.indexOf(i);
    if (pos === -1){ rebuildOrder(); pos = S.order.indexOf(i); }
    S.orderPos = pos;
    loadAndPlay(i);
  }
  P.playIndex = playIndex;
  function goNext(auto){
    if (!S.playlist.length) return;
    S.orderPos++;
    if (S.orderPos >= S.order.length){
      if (S.repeatMode === 'all'){ S.orderPos = 0; }
      else if (auto){ S.orderPos = S.order.length - 1; S.player().pause(); return; }
      else { S.orderPos = 0; }
    }
    S.currentIndex = S.order[S.orderPos];
    loadAndPlay(S.currentIndex);
  }
  P.goNext = goNext;
  function goPrev(){
    if (!S.playlist.length) return;
    if (S.player().currentTime > 3){ S.player().currentTime = 0; return; }
    S.orderPos--;
    if (S.orderPos < 0) S.orderPos = S.order.length - 1;
    S.currentIndex = S.order[S.orderPos];
    loadAndPlay(S.currentIndex);
  }
  P.goPrev = goPrev;

  /* ---------- Playlist rendering ---------- */
  function renderPlaylist(){
    S.playlistEl.innerHTML = '';
    S.trackCountEl.textContent = S.playlist.length + (S.playlist.length === 1 ? ' track' : ' tracks');
    S.playlistEmpty.hidden = S.playlist.length > 0;
    S.playlist.forEach(function(t, i){
      var row = document.createElement('div');
      row.className = 'track-row' + (i === S.currentIndex ? ' active' : '');
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', 'Play track ' + (i + 1) + ': ' + t.name);
      row.innerHTML =
        '<span class="track-num">' + (i + 1) + '</span>' +
        '<span class="track-name">' + U.escapeHtml(t.name) + '</span>' +
        '<button class="track-remove" type="button" aria-label="Remove track">✕</button>';
      row.addEventListener('click', function(){ playIndex(i); });
      row.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); playIndex(i); }
      });
      row.querySelector('.track-remove').addEventListener('click', function(e){
        e.stopPropagation();
        removeTrack(i);
      });
      S.playlistEl.appendChild(row);
    });
  }
  P.renderPlaylist = renderPlaylist;
  function removeTrack(i){
    var wasCurrent = (i === S.currentIndex);
    if (S.playlist[i].isLocal && S.playlist[i].url) URL.revokeObjectURL(S.playlist[i].url);
    if (App.library) App.library.forgetTrack(S.playlist[i]);
    S.playlist.splice(i, 1);
    if (S.currentIndex > i) S.currentIndex--;
    else if (wasCurrent){
      if (S.playlist.length){
        S.currentIndex = Math.min(i, S.playlist.length - 1);
        rebuildOrder();
        playIndex(S.currentIndex);
      } else {
        S.currentIndex = -1;
        audio.pause();
        audio.removeAttribute('src');
        S.plainAudio.pause();
        S.plainAudio.removeAttribute('src');
        S.usingPlain = false;
        S.nowPlayingEl.textContent = 'Nothing loaded yet — add some music below';
      }
    }
    rebuildOrder();
    renderPlaylist();
  }

  /* ---------- Adding files ---------- */
  // tracks: [{ name, url | handle, path?, isLocal }]. A track whose path is
  // already in the playlist is skipped, so reopening a folder adds nothing twice.
  function addTracks(tracks, opts){
    var have = {};
    S.playlist.forEach(function(t){ if (t.path) have[t.path] = 1; });
    var startIndex = S.playlist.length, added = 0;
    tracks.forEach(function(t){
      if (t.path && have[t.path]) return;
      if (t.path) have[t.path] = 1;
      if (t.retried === undefined) t.retried = false;
      S.playlist.push(t);
      added++;
    });
    if (!added) return 0;
    rebuildOrder();
    renderPlaylist();
    if (S.currentIndex === -1 && Aud.source !== 'mic' && !(opts && opts.quiet)) playIndex(startIndex);
    return added;
  }
  P.addTracks = addTracks;
  // An object URL points at the file where it already is; nothing is copied.
  function addFilesToPlaylist(files){
    var audioFiles = Array.prototype.filter.call(files, U.isAudioFile);
    if (!audioFiles.length) return;
    addTracks(audioFiles.map(function(f){
      return { name: U.stripExt(f.name), url: URL.createObjectURL(f), isLocal: true,
               path: (f.webkitRelativePath || f.name) + '|' + f.size };
    }));
    var Lib = App.library;
    if (!Lib || !Lib.keepCopies()) return;
    Lib.keepFiles(audioFiles, function(done, total){
      P.note('Keeping a copy inside the app: ' + done + ' of ' + total + '…');
    }).then(function(res){
      P.note(res.failed ? 'Kept ' + res.kept + ' copies, then stopped: ' + res.failed
                        : (res.kept ? res.kept + (res.kept === 1 ? ' song is' : ' songs are') + ' now kept inside the app. They will be here next time.'
                                    : 'These songs were already kept inside the app.'));
      if (P.onKept) P.onKept();
    });
  }
  // words for the note under the buttons on the Music page (page-music.js sets the real one)
  P.note = function(){};
  // "Add files": the chooser that can remember what is picked, where the browser has one
  P.chooseFiles = function(){
    var Lib = App.library;
    if (!Lib || !Lib.canPickFiles()){ fileInput.click(); return; }
    Lib.pickFiles().then(function(res){
      if (!res) return;
      var n = res.count;
      P.note(res.failed ? n + (n === 1 ? ' song' : ' songs') + ' added, but not remembered: ' + res.failed
           : !n ? 'Those songs are already in the playlist.'
           : Lib.keepCopies() ? n + (n === 1 ? ' song' : ' songs') + ' added and kept inside the app. They will be here next time.'
           : n + (n === 1 ? ' song' : ' songs') + ' added and remembered: next time, one tap on "Reconnect" brings ' + (n === 1 ? 'it' : 'them') + ' back.');
      if (P.onKept) P.onKept();
    }, function(){ fileInput.click(); });      // the chooser failed: the plain file box still works
  };

  /* ---------- File / folder pickers ---------- */
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('file-input');
  var folderInput = document.getElementById('folder-input');
  var folderLink = document.getElementById('folderLink');

  if (!('webkitdirectory' in folderInput)) folderLink.style.display = 'none';

  dropZone.addEventListener('click', function(e){
    if (e.target === folderLink) return;
    P.chooseFiles();
  });
  folderLink.addEventListener('click', function(e){
    e.stopPropagation();
    folderInput.click();
  });
  fileInput.addEventListener('change', function(e){ addFilesToPlaylist(e.target.files); fileInput.value = ''; });
  folderInput.addEventListener('change', function(e){ addFilesToPlaylist(e.target.files); folderInput.value = ''; });

  /* ---------- Drag & drop (files + folders) ---------- */
  dropZone.addEventListener('dragover', function(e){ e.preventDefault(); dropZone.classList.add('hover'); });
  dropZone.addEventListener('dragleave', function(){ dropZone.classList.remove('hover'); });
  dropZone.addEventListener('drop', function(e){
    e.preventDefault();
    dropZone.classList.remove('hover');
    var items = e.dataTransfer.items;
    if (items && items.length && items[0].webkitGetAsEntry){
      var entries = [];
      for (var i = 0; i < items.length; i++){
        var entry = items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      collectFilesFromEntries(entries).then(addFilesToPlaylist);
    } else {
      addFilesToPlaylist(e.dataTransfer.files);
    }
  });
  function collectFilesFromEntries(entries){
    var files = [];
    function readEntry(entry){
      return new Promise(function(resolve){
        if (entry.isFile){
          entry.file(function(file){ if (U.isAudioFile(file)) files.push(file); resolve(); }, function(){ resolve(); });
        } else if (entry.isDirectory){
          var reader = entry.createReader();
          (function readBatch(){
            reader.readEntries(function(subEntries){
              if (!subEntries.length){ resolve(); return; }
              Promise.all(subEntries.map(readEntry)).then(readBatch);
            }, function(){ resolve(); });
          })();
        } else { resolve(); }
      });
    }
    return Promise.all(entries.map(readEntry)).then(function(){ return files; });
  }

  /* ---------- URL loading ---------- */
  var urlInput = document.getElementById('urlInput');
  var loadUrlBtn = document.getElementById('loadUrlBtn');
  function addUrlTrack(){
    var url = urlInput.value.trim();
    if (!url) return;
    var name = 'Track from URL';
    try { name = decodeURIComponent(url.split('/').pop().split('?')[0]) || name; } catch (e) {}
    addTracks([{ name: name, url: url, isLocal: false }]);
    urlInput.value = '';
  }
  loadUrlBtn.addEventListener('click', addUrlTrack);
  urlInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') addUrlTrack(); });
})();
