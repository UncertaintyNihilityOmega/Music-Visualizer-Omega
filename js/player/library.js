/* =========================================================================
   LIBRARY: a music folder that stays where it is
   Uses the File System Access API (Chrome, Edge and other Chromium
   browsers on a computer, and on Android since Chrome 132) to read a
   folder the user picks, in place. Nothing
   is copied into the app: each song is opened from the disk when it is
   played. The folder's handle (a permission ticket, not the files) is
   kept in IndexedDB so the next visit can bring the folder back with one
   tap.

   Where the API does not exist (Firefox, Safari, every iPhone) supported()
   is false and the Music page falls back to the ordinary file picker.
   ========================================================================= */
(function(){
  'use strict';
  var L = App.library = {};
  var DB = 'viz-library', STORE = 'handles', KEY = 'musicFolder';
  var MAX_FILES = 5000, MAX_DEPTH = 8;

  L.supported = function(){ return typeof window.showDirectoryPicker === 'function' && !!window.indexedDB; };

  function db(){
    return new Promise(function(resolve, reject){
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function(){ req.result.createObjectStore(STORE); };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
  }
  function store(mode, fn){
    return db().then(function(d){
      return new Promise(function(resolve, reject){
        var tx = d.transaction(STORE, mode), out = fn(tx.objectStore(STORE));
        tx.oncomplete = function(){ d.close(); resolve(out && out.result); };
        tx.onerror = function(){ d.close(); reject(tx.error); };
      });
    });
  }
  function saveHandle(h){ return store('readwrite', function(s){ return s.put(h, KEY); }); }
  function loadHandle(){ return store('readonly', function(s){ return s.get(KEY); }).catch(function(){ return null; }); }

  // every audio file under dir, depth first, in name order
  function walk(dir, path, depth, out){
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
            if (App.util.isAudioFile({ name: e.name, type: '' })){
              out.push({ name: App.util.stripExt(e.name), handle: e, path: path + e.name, url: null, isLocal: true, retried: false });
            }
          } else if (e.kind === 'directory'){
            return walk(e, path + e.name + '/', depth + 1, out);
          }
        });
      });
      return chain.then(function(){ return out; });
    });
  }
  function loadFrom(dir){
    return walk(dir, '', 0, []).then(function(tracks){
      App.player.addTracks(tracks);
      return { name: dir.name, count: tracks.length };
    });
  }

  // Opens the system folder chooser. Resolves null if the user cancels.
  L.pickFolder = function(){
    return window.showDirectoryPicker({ id: 'music', mode: 'read' }).then(function(dir){
      return saveHandle(dir).catch(function(){}).then(function(){ return loadFrom(dir); });
    }, function(err){
      if (err && err.name === 'AbortError') return null;
      throw new Error('That folder could not be opened.');
    });
  };

  // { name, granted } for the remembered folder, or null
  L.remembered = function(){
    if (!L.supported()) return Promise.resolve(null);
    return loadHandle().then(function(h){
      if (!h || !h.queryPermission) return null;
      return h.queryPermission({ mode: 'read' }).then(function(p){ return { name: h.name, granted: p === 'granted' }; });
    }).catch(function(){ return null; });
  };

  // Must be called from a tap/click when permission has to be asked again.
  L.reconnect = function(){
    return loadHandle().then(function(h){
      if (!h) return null;
      return h.queryPermission({ mode: 'read' }).then(function(p){
        return p === 'granted' ? p : h.requestPermission({ mode: 'read' });
      }).then(function(p){
        if (p !== 'granted') throw new Error('The folder was not opened: permission was not given.');
        return loadFrom(h);
      });
    });
  };

  L.forget = function(){
    return store('readwrite', function(s){ return s.delete(KEY); }).catch(function(){});
  };
})();
