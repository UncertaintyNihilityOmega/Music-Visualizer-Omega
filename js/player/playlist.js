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
  }
  P.rebuildOrder = rebuildOrder;

  /* ---------- Playback ---------- */
  function loadAndPlay(i){
    var track = S.playlist[i];
    if (!track) return;
    S.corsNoteEl.textContent = '';
    Aud.ensureAudioGraph();
    if (Aud.audioCtx.state === 'suspended') Aud.audioCtx.resume();
    if (Aud.source === 'mic') Aud.stopMic();   // playing a song hands the visuals back to the music
    S.nowPlayingEl.textContent = track.name;
    renderPlaylist();
    // A song from an opened folder is only read from the disk now, when it
    // is first played; until then the playlist just holds its handle.
    if (!track.url && track.handle){
      track.handle.getFile().then(function(file){
        track.url = URL.createObjectURL(file);
        if (S.playlist[S.currentIndex] === track) start(track);
      }, function(){
        S.corsNoteEl.textContent = 'That file could not be read. If the folder was moved, open it again.';
      });
      return;
    }
    start(track);
  }
  function start(track){
    var plain = S.plainAudio;
    // a source already found to block reading goes straight to the plain player
    if (track.noRead){
      audio.pause();
      S.usingPlain = true;
      plain.src = track.url;
      var pp = plain.play();
      if (pp && pp.catch) pp.catch(function(){});
      S.corsNoteEl.textContent = P.NO_READ_NOTE;
      return;
    }
    if (S.usingPlain){ plain.pause(); plain.removeAttribute('src'); plain.load(); S.usingPlain = false; }
    audio.crossOrigin = 'anonymous';
    audio.src = track.url;
    audio.load();
    var p = audio.play();
    if (p && p.catch) p.catch(function(){ /* ignore autoplay edge cases */ });
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
  function addTracks(tracks){
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
    if (S.currentIndex === -1 && Aud.source !== 'mic') playIndex(startIndex);
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
  }

  /* ---------- File / folder pickers ---------- */
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('file-input');
  var folderInput = document.getElementById('folder-input');
  var folderLink = document.getElementById('folderLink');

  if (!('webkitdirectory' in folderInput)) folderLink.style.display = 'none';

  dropZone.addEventListener('click', function(e){
    if (e.target === folderLink) return;
    fileInput.click();
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
