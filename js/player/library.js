/* =========================================================================
   LIBRARY: what the app remembers between visits
   Three kinds of remembered thing, all kept in IndexedDB ("viz-library"):

     folder  a music folder the user picked. Only its handle is kept (a
             permission ticket, not the files); the songs are read from the
             disk when played. File System Access API: Chrome, Edge and
             other Chromium browsers on a computer, and on Android since
             Chrome 132.
     file    one song picked with the file chooser, kept the same way as a
             handle. Same browsers.
     copy    a song copied into the app's own storage. Works in every
             browser (an iPhone can remember a song no other way) and needs
             no permission question later, but it takes space on the
             device. Only made while "Keep a copy" is switched on (user
             decision, 2026-11-16); off by default, so by default nothing is
             copied.

   On the next visit: copies are simply there. A folder or file whose
   permission the browser still holds is loaded at once; the others wait
   for one tap on "Reconnect", because the browser only lets a page ask
   for permission from a tap. Nothing starts playing by itself.
   ========================================================================= */
(function(){
  'use strict';
  var L = App.library = {};
  var U = App.util;
  var DB = 'viz-library', OLD = 'handles', ITEMS = 'items', OLD_KEY = 'musicFolder';
  var MAX_FILES = 5000, MAX_DEPTH = 8;

  L.supported = function(){ return typeof window.showDirectoryPicker === 'function' && !!window.indexedDB; };
  L.canPickFiles = function(){ return typeof window.showOpenFilePicker === 'function' && !!window.indexedDB; };
  L.canKeep = function(){ return !!window.indexedDB; };

  /* ---------- the "keep a copy" switch ---------- */
  L.keepCopies = function(){
    try { return localStorage.getItem('viz.keepCopies') === '1'; } catch (e) { return false; }
  };
  L.setKeepCopies = function(on){
    try { localStorage.setItem('viz.keepCopies', on ? '1' : '0'); } catch (e) {}
    // ask the browser not to clear the copies when the device runs short of space
    if (on && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function(){});
  };

  /* ---------- storage ---------- */
  function db(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB, 2);
      req.onupgradeneeded = function(){
        var d = req.result;
        if (!d.objectStoreNames.contains(OLD)) d.createObjectStore(OLD);
        if (!d.objectStoreNames.contains(ITEMS)) d.createObjectStore(ITEMS, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }
  function tx(name, mode, fn){
    return db().then(function(d){
      return new Promise(function(resolve, reject){
        var t = d.transaction(name, mode), out = fn(t.objectStore(name));
        t.oncomplete = function(){ d.close(); resolve(out && out.result); };
        t.onerror = function(){ d.close(); reject(t.error); };
        t.onabort = function(){ d.close(); reject(t.error || new Error('The device has no room left for this.')); };
      });
    });
  }
  function putItem(rec){ return tx(ITEMS, 'readwrite', function(s){ return s.put(rec); }); }   // resolves with the id
  function delItem(id){ return tx(ITEMS, 'readwrite', function(s){ return s.delete(id); }); }
  function allItems(){ return tx(ITEMS, 'readonly', function(s){ return s.getAll(); }).then(function(a){ return a || []; }); }
  // the one folder kept by the first version of this file moves into the new list
  function migrate(){
    return tx(OLD, 'readonly', function(s){ return s.get(OLD_KEY); }).then(function(h){
      if (!h) return;
      return putItem({ kind: 'folder', name: h.name, handle: h }).then(function(){
        return tx(OLD, 'readwrite', function(s){ return s.delete(OLD_KEY); });
      });
    }).catch(function(){});
  }

  /* ---------- reading a folder ---------- */
  // every audio file under dir, depth first, in name order
  function walk(dir, path, depth, out, folderId){
    if (depth > MAX_DEPTH || out.length >= MAX_FILES) return Promise.resolve(out);
    var entries = [];
    var it = dir.values();
    function next(){
      return it.next().then(function(r){
        if (r.done) return;
        entries.push(r.value);
        return next();
      });
    }
    return next().then(function(){
      entries.sort(function(a, b){ return a.name.localeCompare(b.name, undefined, { numeric: true }); });
      var chain = Promise.resolve();
      entries.forEach(function(e){
        chain = chain.then(function(){
          if (out.length >= MAX_FILES) return;
          if (e.kind === 'file'){
            if (U.isAudioFile({ name: e.name, type: '' })){
              out.push({ name: U.stripExt(e.name), handle: e, path: path + e.name, url: null, isLocal: true, retried: false, folderId: folderId });
            }
          } else if (e.kind === 'directory'){
            return walk(e, path + e.name + '/', depth + 1, out, folderId);
          }
        });
      });
      return chain.then(function(){ return out; });
    });
  }
  function loadFolder(rec, quiet){
    return walk(rec.handle, rec.name + '/', 0, [], rec.id).then(function(tracks){
      App.player.addTracks(tracks, { quiet: quiet });
      return tracks.length;
    });
  }
  function trackOf(rec){
    var t = { name: rec.name, path: rec.path, url: null, isLocal: true, retried: false, savedId: rec.id };
    if (rec.kind === 'copy') t.blob = rec.blob; else t.handle = rec.handle;
    return t;
  }
  function pathOf(file){ return (file.webkitRelativePath || file.name) + '|' + file.size; }

  /* ---------- adding ---------- */
  // Opens the system folder chooser. Resolves null if the user cancels.
  L.pickFolder = function(){
    return window.showDirectoryPicker({ id: 'music', mode: 'read' }).then(function(dir){
      var rec = { kind: 'folder', name: dir.name, handle: dir };
      return allItems().then(function(items){
        // the same folder picked twice is kept once
        var same = Promise.resolve(null);
        items.forEach(function(it){
          if (it.kind !== 'folder' || !it.handle.isSameEntry) return;
          same = same.then(function(found){ return found || it.handle.isSameEntry(dir).then(function(y){ return y ? it : null; }, function(){ return null; }); });
        });
        return same;
      }).then(function(found){
        if (found){ rec.id = found.id; return; }
        return putItem(rec).then(function(id){ rec.id = id; });
      }).catch(function(){}).then(function(){
        return loadFolder(rec, false);
      }).then(function(count){ return { name: dir.name, count: count }; });
    }, function(err){
      if (err && err.name === 'AbortError') return null;
      throw new Error('That folder could not be opened.');
    });
  };

  // Opens the system file chooser and remembers what is picked: as copies
  // when "Keep a copy" is on, as handles otherwise. Resolves null on cancel.
  L.pickFiles = function(){
    var exts = ['.mp3', '.m4a', '.flac', '.ogg', '.oga', '.opus', '.wav', '.aac', '.weba', '.mp4', '.webm', '.mov'];
    return window.showOpenFilePicker({ id: 'songs', multiple: true, types: [{ description: 'Music', accept: { 'audio/*': exts } }] }).then(function(handles){
      var out = { count: 0, kept: 0, failed: '' }, tracks = [], chain = Promise.resolve();
      handles.forEach(function(h){
        chain = chain.then(function(){ return h.getFile(); }).then(function(file){
          if (!U.isAudioFile(file)) return;
          var rec = { kind: L.keepCopies() ? 'copy' : 'file', name: U.stripExt(file.name), path: pathOf(file), size: file.size };
          if (rec.kind === 'copy') rec.blob = file; else rec.handle = h;
          return putItem(rec).then(function(id){ rec.id = id; out.kept++; }, function(e){
            out.failed = (e && e.message) || 'It could not be remembered.';
            if (rec.kind === 'copy'){ rec.kind = 'file'; rec.handle = h; delete rec.blob; }
          }).then(function(){ tracks.push(trackOf(rec)); });
        }).catch(function(){});
      });
      return chain.then(function(){
        out.count = App.player.addTracks(tracks) || 0;
        return out;
      });
    }, function(err){
      if (err && err.name === 'AbortError') return null;
      throw err;
    });
  };

  // Files that came from an ordinary file box or a drag and drop are already
  // in the playlist. With "Keep a copy" on they are copied in here, one at a
  // time; progress(done, total) is called after each.
  L.keepFiles = function(files, progress){
    var out = { kept: 0, failed: '' };
    if (!L.keepCopies() || !L.canKeep()) return Promise.resolve(out);
    var list = Array.prototype.filter.call(files, U.isAudioFile), chain = Promise.resolve();
    return allItems().then(function(items){
      var have = {};
      items.forEach(function(it){ if (it.path) have[it.path] = it.id; });
      list.forEach(function(file, i){
        chain = chain.then(function(){
          if (out.failed) return;
          var path = pathOf(file);
          if (have[path]) return;
          return putItem({ kind: 'copy', name: U.stripExt(file.name), path: path, size: file.size, blob: file }).then(function(id){
            out.kept++;
            have[path] = id;
            App.state.playlist.forEach(function(t){ if (t.path === path && !t.savedId) t.savedId = id; });
          }, function(e){ out.failed = (e && e.message) || 'The device has no room left for more copies.'; });
        }).then(function(){ if (progress) progress(i + 1, list.length); });
      });
      return chain;
    }).then(function(){ return out; }, function(){ return out; });
  };

  /* ---------- the next visit ---------- */
  var waiting = [];        // remembered folders and files whose permission must be asked again
  L.waiting = function(){ return waiting.slice(); };
  function permission(h){
    if (!h || !h.queryPermission) return Promise.resolve('denied');
    return h.queryPermission({ mode: 'read' }).catch(function(){ return 'denied'; });
  }
  // Loads everything that needs no question. Resolves { loaded, waiting }.
  L.restore = function(){
    if (!L.canKeep()) return Promise.resolve({ loaded: 0, waiting: [] });
    waiting = [];
    var loaded = 0;
    return migrate().then(allItems).then(function(items){
      var chain = Promise.resolve(), singles = [];
      items.forEach(function(rec){
        if (rec.kind === 'copy'){ singles.push(trackOf(rec)); return; }
        chain = chain.then(function(){ return permission(rec.handle); }).then(function(p){
          if (p !== 'granted'){ waiting.push(rec); return; }
          if (rec.kind === 'folder') return loadFolder(rec, true).then(function(n){ loaded += n; }, function(){ waiting.push(rec); });
          singles.push(trackOf(rec));
        });
      });
      return chain.then(function(){
        if (singles.length) loaded += App.player.addTracks(singles, { quiet: true }) || 0;
        if (loaded && App.player.cueLast) App.player.cueLast();
        return { loaded: loaded, waiting: L.waiting() };
      });
    }).catch(function(){ return { loaded: 0, waiting: [] }; });
  };
  // Must be called from a tap: asks again for each thing that is waiting.
  // Resolves { count, left }: songs brought back, things still waiting.
  // One question for all of them (ROADMAP item 23): Chrome's prompt lists every
  // handle the app had last time and grants them together, so the first thing
  // is asked for and the rest are only checked; one is asked for again only if
  // the check says no (that later ask may be refused, as the tap is used up:
  // it then stays waiting for the next tap). In that prompt "Allow on every
  // visit" makes the browser stop asking; an installed app keeps the
  // permission by itself (FACTS.md "Remembering songs").
  var asked = false;
  function ask(rec){
    var first = !asked;
    asked = true;
    var check = first ? Promise.resolve('prompt') : permission(rec.handle);
    return check.then(function(p){
      if (p === 'granted') return p;
      return rec.handle.requestPermission({ mode: 'read' }).catch(function(){ return 'denied'; });
    });
  }
  L.reconnect = function(){
    var todo = waiting.slice(), count = 0, singles = [], chain = Promise.resolve();
    waiting = [];
    asked = false;
    todo.forEach(function(rec){
      chain = chain.then(function(){
        return ask(rec);
      }).then(function(p){
        if (p !== 'granted'){ waiting.push(rec); return; }
        if (rec.kind === 'folder') return loadFolder(rec, true).then(function(n){ count += n; }, function(){ waiting.push(rec); });
        singles.push(trackOf(rec));
      });
    });
    return chain.then(function(){
      if (singles.length) count += App.player.addTracks(singles, { quiet: true }) || 0;
      if (count && App.state.currentIndex === -1 && App.player.cueLast) App.player.cueLast();
      return { count: count, left: waiting.length };
    });
  };

  /* ---------- forgetting ---------- */
  // a song taken out of the playlist is forgotten too (a folder's songs come back with their folder)
  L.forgetTrack = function(track){
    if (track && track.savedId) delItem(track.savedId).catch(function(){});
  };
  // kinds: which to forget, e.g. ['folder', 'file'] or ['copy']
  L.forget = function(kinds){
    return allItems().then(function(items){
      var chain = Promise.resolve();
      items.forEach(function(rec){
        if (kinds.indexOf(rec.kind) < 0) return;
        chain = chain.then(function(){ return delItem(rec.id); });
      });
      return chain;
    }).then(function(){
      waiting = waiting.filter(function(rec){ return kinds.indexOf(rec.kind) < 0; });
    }).catch(function(){});
  };
  // { folders, files, copies, bytes }: what is remembered now
  L.summary = function(){
    return allItems().then(function(items){
      var s = { folders: 0, files: 0, copies: 0, bytes: 0 };
      items.forEach(function(rec){
        if (rec.kind === 'folder') s.folders++;
        else if (rec.kind === 'file') s.files++;
        else { s.copies++; s.bytes += rec.size || (rec.blob && rec.blob.size) || 0; }
      });
      return s;
    }).catch(function(){ return { folders: 0, files: 0, copies: 0, bytes: 0 }; });
  };
})();
