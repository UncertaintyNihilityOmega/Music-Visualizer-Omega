/* =========================================================================
   FOLDERS INSIDE THE APP (ROADMAP item 19 c, asked by the user 2026-11-16)
   The user's own lists of songs, like the playlists of a phone music
   player. A folder holds the KEYS of its songs, not the songs: the key is
   the same one the playlist uses to tell songs apart (a remembered
   folder's song: "Folder/sub/song.mp3"; a song added on its own or kept as
   a copy: "song.mp3|size"; a web address: the address). So nothing is
   copied, and a song shows in a folder whenever it is in the playlist:
   brought back from last time, reconnected, or added again.

   Kept in localStorage "viz.folders" ([{ id, name, keys: [...] }]) with the
   open folder in "viz.folder". A folder works best with remembered songs
   ("Keep a copy" on, or a remembered folder or file); a song that is not
   in the playlist today is counted as "waiting" and comes back on its own.

   playlist.js asks two things of this file: P.inView(track) (is this song
   in the open folder?) and P.decorateRow(row, track, i) (the folder button
   on each row, and what the ✕ does inside a folder).
   ========================================================================= */
(function(){
  'use strict';
  var P = App.player, S = App.state, U = App.util;
  var F = App.folders = {};
  var KEY = 'viz.folders', OPEN = 'viz.folder';

  /* ---------- storage ---------- */
  var folders = [], openId = null;
  function load(){
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      folders = Array.isArray(raw) ? raw.filter(function(f){ return f && f.id && Array.isArray(f.keys); }) : [];
      openId = localStorage.getItem(OPEN) || null;
    } catch (e) { folders = []; openId = null; }
    if (openId && !byId(openId)) openId = null;
  }
  function save(){
    try {
      localStorage.setItem(KEY, JSON.stringify(folders));
      if (openId) localStorage.setItem(OPEN, openId); else localStorage.removeItem(OPEN);
    } catch (e) {}
  }
  function byId(id){ for (var i = 0; i < folders.length; i++) if (folders[i].id === id) return folders[i]; return null; }
  F.keyOf = function(t){ return t.path || t.url || t.name; };
  P.keyOf = F.keyOf;

  /* ---------- what playlist.js asks ---------- */
  P.inView = function(t){
    var f = openId && byId(openId);
    return !f || f.keys.indexOf(F.keyOf(t)) >= 0;
  };
  P.decorateRow = function(row, t){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'track-folder';
    btn.setAttribute('aria-label', 'Put "' + t.name + '" in a folder');
    btn.title = 'Put in a folder';
    btn.innerHTML = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h6l2 2h10v10H3z"/><path d="M12 12v5M9.5 14.5h5"/></svg>';
    btn.addEventListener('click', function(e){ e.stopPropagation(); openMenu(btn, t); });
    row.insertBefore(btn, row.querySelector('.track-remove'));
    // inside a folder the ✕ takes the song out of the folder, not out of the app
    if (openId){
      var x = row.querySelector('.track-remove');
      x.setAttribute('aria-label', 'Take out of this folder');
      x.title = 'Take out of this folder';
      x.dataset.folderOnly = '1';
    }
  };
  P.onAdded = function(list){
    var f = openId && byId(openId);
    if (!f) return;
    list.forEach(function(t){ var k = F.keyOf(t); if (f.keys.indexOf(k) < 0) f.keys.push(k); });
    save();
  };
  // playlist.js calls this before removing a song: true = handled here
  P.removeFromView = function(t){
    var f = openId && byId(openId);
    if (!f) return false;
    var k = F.keyOf(t), at = f.keys.indexOf(k);
    if (at >= 0) f.keys.splice(at, 1);
    save();
    refresh();
    return true;
  };

  /* ---------- the bar of folders above the playlist ---------- */
  var bar = document.getElementById('folderBar');
  var note = document.getElementById('folderNote');
  function countIn(f){
    var here = 0, have = {};
    S.playlist.forEach(function(t){ have[F.keyOf(t)] = 1; });
    f.keys.forEach(function(k){ if (have[k]) here++; });
    return { here: here, waiting: f.keys.length - here };
  }
  function chip(label, active, onClick, extraClass){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill-btn folder-chip' + (active ? ' active' : '') + (extraClass ? ' ' + extraClass : '');
    b.textContent = label;
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
    b.addEventListener('click', onClick);
    return b;
  }
  // a small text box in place of a button, for a new name; done(name) or done(null) on Escape
  function askName(where, start, done){
    var box = document.createElement('input');
    box.type = 'text';
    box.className = 'folder-name';
    box.maxLength = 40;
    box.value = start || '';
    box.placeholder = 'Folder name';
    box.setAttribute('aria-label', 'Folder name');
    var finished = false;
    function finish(ok){
      if (finished) return;
      finished = true;
      var name = box.value.trim();
      done(ok && name ? name : null);
    }
    box.addEventListener('keydown', function(e){
      if (e.key === 'Enter'){ e.preventDefault(); finish(true); }
      else if (e.key === 'Escape'){ e.preventDefault(); finish(false); }
    });
    box.addEventListener('blur', function(){ finish(true); });
    where.replaceWith(box);
    box.focus();
    return box;
  }
  function newFolder(name, firstKey){
    var f = { id: 'f' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: name, keys: firstKey ? [firstKey] : [] };
    folders.push(f);
    save();
    return f;
  }
  function openFolder(id){
    openId = id;
    save();
    refresh();
  }
  function paintBar(){
    if (!bar) return;
    bar.innerHTML = '';
    bar.appendChild(chip('All songs (' + S.playlist.length + ')', !openId, function(){ openFolder(null); }));
    folders.forEach(function(f){
      var c = countIn(f);
      bar.appendChild(chip(f.name + ' (' + c.here + ')', f.id === openId, function(){ openFolder(f.id); }));
    });
    var add = chip('+ New folder', false, function(){
      askName(add, '', function(name){
        if (name){ var f = newFolder(name); openFolder(f.id); } else paintBar();
      });
    }, 'folder-new');
    bar.appendChild(add);

    // under the bar: what the open folder holds, and its own buttons
    note.innerHTML = '';
    var f = openId && byId(openId);
    if (!f){ note.hidden = true; return; }
    note.hidden = false;
    var c = countIn(f), words = document.createElement('span');
    words.textContent = !f.keys.length
      ? 'An empty folder. Tap the folder button on any song in "All songs" to put it here.'
      : c.here + (c.here === 1 ? ' song' : ' songs') + ' here.' +
        (c.waiting ? ' ' + c.waiting + ' more ' + (c.waiting === 1 ? 'is not in the playlist today: it comes back' : 'are not in the playlist today: they come back') + ' with "Reconnect" or when added again.' : '');
    note.appendChild(words);
    var ren = document.createElement('button');
    ren.type = 'button'; ren.className = 'link-btn'; ren.textContent = 'rename';
    ren.addEventListener('click', function(){
      askName(ren, f.name, function(name){ if (name){ f.name = name; save(); } refresh(); });
    });
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'link-btn'; del.textContent = 'delete this folder';
    del.addEventListener('click', function(){
      // a folder holds no songs, only their names: deleting it removes nothing from the device or the app
      folders = folders.filter(function(x){ return x !== f; });
      openId = null;
      save();
      refresh();
      P.note('The folder "' + f.name + '" is deleted. Its songs are still in "All songs".');
    });
    note.appendChild(document.createTextNode(' '));
    note.appendChild(ren);
    note.appendChild(document.createTextNode(' · '));
    note.appendChild(del);
  }

  /* ---------- the menu on a song's folder button ---------- */
  var menu = null;
  function closeMenu(){
    if (!menu) return;
    menu.remove();
    menu = null;
    document.removeEventListener('pointerdown', outside, true);
  }
  function outside(e){ if (menu && !menu.contains(e.target)) closeMenu(); }
  function openMenu(btn, t){
    closeMenu();
    var key = F.keyOf(t);
    menu = document.createElement('div');
    menu.className = 'folder-menu';
    menu.setAttribute('role', 'menu');
    var head = document.createElement('p');
    head.className = 'folder-menu-head';
    head.textContent = 'Put "' + t.name + '" in:';
    menu.appendChild(head);
    folders.forEach(function(f){
      var inIt = f.keys.indexOf(key) >= 0;
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitemcheckbox');
      b.setAttribute('aria-checked', inIt ? 'true' : 'false');
      b.className = 'folder-menu-item' + (inIt ? ' on' : '');
      b.textContent = (inIt ? '✓ ' : '') + f.name;
      b.addEventListener('click', function(){
        var at = f.keys.indexOf(key);
        if (at >= 0) f.keys.splice(at, 1); else f.keys.push(key);
        save();
        closeMenu();
        refresh();
        P.note(at >= 0 ? '"' + t.name + '" is out of "' + f.name + '".' : '"' + t.name + '" is in "' + f.name + '".');
      });
      menu.appendChild(b);
    });
    var nb = document.createElement('button');
    nb.type = 'button';
    nb.className = 'folder-menu-item folder-new';
    nb.textContent = '+ New folder';
    nb.addEventListener('click', function(){
      askName(nb, '', function(name){
        if (name){
          var f = newFolder(name, key);
          P.note('"' + t.name + '" is in the new folder "' + f.name + '".');
        }
        closeMenu();
        refresh();
      });
    });
    menu.appendChild(nb);
    if (!t.savedId && !t.folderId && !(App.library && App.library.keepCopies())){
      var warn = document.createElement('p');
      warn.className = 'folder-menu-note';
      warn.textContent = 'This song is not remembered by the app, so after closing it the folder will wait for it. "Keep a copy" on the Music page keeps songs for good.';
      menu.appendChild(warn);
    }
    // under the row, inside the playlist card
    var row = btn.closest('.track-row');
    row.parentNode.insertBefore(menu, row.nextSibling);
    setTimeout(function(){ document.addEventListener('pointerdown', outside, true); }, 0);
    var first = menu.querySelector('button');
    if (first) first.focus();
    menu.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closeMenu(); btn.focus(); } });
  }

  /* ---------- keep the bar and the list in step ---------- */
  function refresh(){
    closeMenu();
    P.rebuildOrder();
    P.renderPlaylist();
  }
  F.refresh = refresh;
  F.paint = paintBar;
  F.list = function(){ return folders.map(function(f){ return { id: f.id, name: f.name, keys: f.keys.slice() }; }); };
  F.open = openFolder;
  load();
})();
