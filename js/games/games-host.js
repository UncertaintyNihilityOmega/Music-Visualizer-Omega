/* =========================================================================
   GAMES HOST
   State transitions, save/load, and panel wiring shared by every
   registered game. Everything here reads from a game's own descriptor
   (see App.games.register in games-shared.js) instead of branching on a
   game's id, so a third game (Cards) needs no changes in this file.
   ========================================================================= */
(function(){
  'use strict';
  var G = App.games, Cfg = App.cfg, U = App.util, Can = App.canvas, Aud = App.audio;
  var ctx = Can.ctx, canvas = Can.canvas;
  var A = Aud.A;

  var autoLoaded = {};

  function resetGame(g, keepProgress){
    var desc = G.registry[g.id];
    if (!keepProgress){
      g.level = 1;
      g.breaks = 0;
      g.lv = G.blankLevels(desc.items);
      g.time = 0;
      if (desc.afterLevelReset) desc.afterLevelReset(g);
    }
    if (desc.resetField) desc.resetField(g, keepProgress);
    G.GAME.cards = [];
    G.GAME.cardRects = [];
    G.GAME.banner = '';
    if (desc.renderShop) desc.renderShop();
  }
  G.resetGame = resetGame;

  function startGame(){
    var g = G.currentState();
    if (!g) return;
    var desc = G.registry[g.id];
    var fresh = false;
    if (G.GAME.state === 'dead'){ resetGame(g, false); fresh = true; }
    else if (G.GAME.state === 'idle'){
      fresh = (g.time === 0 && g.level === 1);
      resetGame(g, !fresh);
    }
    G.setGameState('playing');
    if (fresh && desc.startExtra) desc.startExtra(g);
  }
  G.startGame = startGame;

  function gameOver(g){
    if (g.time > g.best) g.best = g.time;
    G.setGameState('dead');
    saveAuto(g);
  }
  G.gameOver = gameOver;

  function togglePause(){
    if (G.GAME.state === 'playing') G.setGameState('paused');
    else if (G.GAME.state === 'paused') G.setGameState('playing');
  }
  G.togglePause = togglePause;

  function serializeGame(g){
    var desc = G.registry[g.id];
    var d = { v: 2, game: g.id, diff: Cfg.CFG.games.difficulty, level: g.level, breaks: g.breaks,
              lv: g.lv, time: g.time, best: g.best, ts: Date.now() };
    if (desc.serializeExtra) desc.serializeExtra(g, d);
    return d;
  }
  G.serializeGame = serializeGame;
  function applySave(d){
    if (!d || !d.game) return false;
    var desc = G.registry[d.game];
    if (!desc) return false;
    var g = desc.state;
    g.level = d.level || 1;
    g.breaks = d.breaks || 0;
    g.time = d.time || 0;
    g.best = d.best || 0;
    var base = G.blankLevels(desc.items);
    for (var key in base) if (d.lv && d.lv[key] !== undefined) base[key] = d.lv[key];
    g.lv = base;
    if (d.diff && G.DIFFS[d.diff]) Cfg.CFG.games.difficulty = d.diff;
    if (desc.applyExtra) desc.applyExtra(g, d);
    resetGame(g, true);
    G.setGameState('idle');
    if (desc.renderShop) desc.renderShop();
    return true;
  }
  G.applySave = applySave;
  function saveAuto(g){
    if (!Cfg.CFG.games.autosave) return;
    try { localStorage.setItem('viz.auto.' + g.id, JSON.stringify(serializeGame(g))); } catch (e) {}
  }
  G.saveAuto = saveAuto;
  function loadAuto(g){
    try {
      var d = JSON.parse(localStorage.getItem('viz.auto.' + g.id) || 'null');
      if (d) applySave(d);
    } catch (e) {}
  }
  G.loadAuto = loadAuto;
  function readSlots(){
    try { return JSON.parse(localStorage.getItem('viz.saves') || '[]') || []; } catch (e) { return []; }
  }
  function writeSlots(arr){
    try { localStorage.setItem('viz.saves', JSON.stringify(arr)); } catch (e) {}
  }

  /* ---------- called by mode-registry.js when a game mode becomes active ---------- */
  G.onEnterGame = function(mode){
    var desc = G.registry[mode];
    if (!desc) return;
    var g = desc.state;
    if (!autoLoaded[mode]){ autoLoaded[mode] = true; loadAuto(g); }
    G.GAME.state = g.state || 'idle';
    if (desc.onEnter) desc.onEnter(g);
    renderSaves();
    if (desc.renderShop) desc.renderShop();
    if (desc.renderGridInfo) desc.renderGridInfo();
    else {
      var el = document.getElementById('gridInfo');
      if (el) el.innerHTML = '<span class="grid-empty">No cell selected – tap the board or use WASD.</span>';
    }
  };
  G.updateGamePanel = function(){
    var gp = document.getElementById('gamesPanel');
    if (gp) gp.hidden = !G.isGameMode(App.modes.current);
  };

  /* ---------- per-frame entry, called from the main rAF loop ---------- */
  function drawGame(){
    var g = G.currentState(), k = Can.dpr();
    if (!g) return;
    var desc = G.registry[g.id];
    var dt = Math.min(0.05, A.dt) * G.gameSpeed();
    if (G.GAME.state === 'playing'){
      var steps = Math.max(1, Math.min(4, Math.ceil(dt / 0.02)));
      var sdt = dt / steps;
      for (var st = 0; st < steps && G.GAME.state === 'playing'; st++) desc.update(sdt);
      G.GAME.autoT += dt;
      if (G.GAME.autoT > 12){ G.GAME.autoT = 0; saveAuto(g); if (desc.renderShop) desc.renderShop(); }
      if (Cfg.CFG.games.autoUpgrade && desc.autoBuy){
        desc._autoT = (desc._autoT || 0) + dt;
        if (desc._autoT > 3){ desc._autoT = 0; desc.autoBuy(); }
      }
    }
    desc.draw();

    if (G.GAME.bannerT > 0){
      G.GAME.bannerT -= A.dt;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (15 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(255,214,102,' + Math.min(1, G.GAME.bannerT) + ')';
      ctx.fillText(G.GAME.banner, canvas.width / 2, canvas.height * 0.12);
    }
    if (G.GAME.state === 'choosing') G.drawCards(k);
    else if (G.GAME.state === 'idle') G.drawOverlay(desc.label,
      'Tap to play  -  P pauses  -  progress saves automatically', k);
    else if (G.GAME.state === 'paused') G.drawOverlay('Paused', 'Press P or tap to continue', k);
    else if (G.GAME.state === 'dead') G.drawOverlay('Run over  -  ' + U.formatTime(g.time),
      'Best ' + U.formatTime(g.best) + '  -  tap to start again', k);
  }
  G.drawGame = drawGame;

  function handleGameKey(e, down){
    if (e.repeat) return false; // ignore OS/browser key-autorepeat from a held key - a held '1' shouldn't buy 10 towers or play 10 cards
    var g = G.currentState();
    if (!g) return false;
    var key = e.key.toLowerCase();
    if (key === 'x'){ if (down) G.toggleBoost(); return true; }     // 3x speed on and off (never Shift: see games-shared.js)
    var desc = G.registry[g.id];
    if (desc.handleKey && desc.handleKey(key, down)) return true;
    if (!down) return false;
    if (G.GAME.state === 'choosing' && (key === '1' || key === '2' || key === '3')){
      G.pickCard(parseInt(key, 10) - 1);
      return true;
    }
    if (key === 'p'){ togglePause(); return true; }
    if (key === 'escape'){
      if (desc.cancelKey && desc.cancelKey()) return true;
      if (G.GAME.state === 'playing') G.setGameState('paused');
      return true;
    }
    if (key === 'enter' && (G.GAME.state === 'idle' || G.GAME.state === 'dead')){ startGame(); return true; }
    return false;
  }
  G.handleGameKey = handleGameKey;

  /* ---------- canvas pointer: start / resume / choose upgrade cards ---------- */
  canvas.addEventListener('pointerdown', function(ev){
    if (!G.isGameMode(App.modes.current)) return;
    if (G.GAME.state === 'choosing'){
      var pt = App.taps.canvasPoint(ev);
      for (var i = 0; i < G.GAME.cardRects.length; i++){
        var r = G.GAME.cardRects[i];
        if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){ G.pickCard(i); return; }
      }
      return;
    }
    if (G.GAME.state === 'idle' || G.GAME.state === 'dead'){ startGame(); return; }
    if (G.GAME.state === 'paused'){ G.setGameState('playing'); return; }
  });

  /* ---------- save-slot panel ---------- */
  var savesBody = document.getElementById('savesBody');
  function renderSaves(){
    if (!savesBody) return;
    var slots = readSlots();
    savesBody.innerHTML = '';
    for (var i = 0; i < 5; i++){
      (function(idx){
        var d = slots[idx];
        var desc = d ? G.registry[d.game] : null;
        var row = document.createElement('div');
        row.className = 'slot-row';
        var info = document.createElement('span');
        info.className = 'slot-info';
        info.textContent = d
          ? (desc ? desc.label : d.game) + ' – ' +
            (desc && desc.unit === 'wave' ? 'wave ' : desc && desc.unit === 'dungeon' ? 'dungeon lvl ' : 'level ') + d.level +
            (d.breaks ? ' (break x' + d.breaks + ')' : '') + ' – best ' + U.formatTime(d.best || 0)
          : 'Slot ' + (idx + 1) + ' – empty';
        row.appendChild(info);
        var save = document.createElement('button');
        save.type = 'button';
        save.className = 'slot-btn';
        save.textContent = 'Save';
        save.addEventListener('click', function(){
          var g = G.currentState();
          if (!g) return;
          var s = readSlots();
          s[idx] = serializeGame(g);
          writeSlots(s);
          renderSaves();
        });
        row.appendChild(save);
        var load = document.createElement('button');
        load.type = 'button';
        load.className = 'slot-btn';
        load.textContent = 'Load';
        load.addEventListener('click', function(){
          var s = readSlots();
          if (!s[idx]) return;
          App.modes.setMode(s[idx].game);
          applySave(s[idx]);
          renderSaves();
        });
        row.appendChild(load);
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'slot-btn';
        del.textContent = '✕';
        del.addEventListener('click', function(){
          var s = readSlots();
          s[idx] = null;
          writeSlots(s);
          renderSaves();
        });
        row.appendChild(del);
        savesBody.appendChild(row);
      })(i);
    }
  }
  function exportSaves(){
    var data = JSON.stringify({ kind: 'our-playlist-saves', v: 2, slots: readSlots() }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'music-visualiser-omega-game-saves.json';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
  }
  function importSavesFile(file){
    var fr = new FileReader();
    fr.onload = function(){
      try {
        var parsed = JSON.parse(fr.result);
        var incoming = parsed && parsed.slots ? parsed.slots : (Array.isArray(parsed) ? parsed : null);
        if (!incoming) throw new Error('bad file');
        writeSlots(incoming.slice(0, 5));
        renderSaves();
        setSavesNote('Saves loaded.');
      } catch (e){ setSavesNote("That file isn't a saves file."); }
    };
    fr.readAsText(file);
  }
  function setSavesNote(msg){
    var el = document.getElementById('savesNote');
    if (el) el.textContent = msg;
  }

  /* ---------- panel button wiring ---------- */
  G.init = function(){
    var diffSel = document.getElementById('diffSelect');
    if (diffSel){
      diffSel.value = Cfg.CFG.games.difficulty;
      diffSel.addEventListener('change', function(){
        Cfg.CFG.games.difficulty = diffSel.value;
        Cfg.saveCfg();
        var g = G.currentState();
        var desc = g ? G.registry[g.id] : null;
        if (g && desc && desc.unit === 'wave' && G.GAME.state !== 'playing') g.lives = G.diff().lives;
      });
    }
    var pb = document.getElementById('pauseGameBtn');
    if (pb) pb.addEventListener('click', function(){
      if (G.GAME.state === 'idle' || G.GAME.state === 'dead') startGame(); else togglePause();
    });
    var rb = document.getElementById('restartGameBtn');
    if (rb) rb.addEventListener('click', function(){
      var g = G.currentState();
      if (!g) return;
      resetGame(g, false);
      G.setGameState('idle');
    });
    var spd = document.getElementById('speedBtn');
    if (spd) spd.addEventListener('click', function(){
      spd.textContent = 'Speed ' + G.cycleSpeed() + 'x';
    });
    var ex = document.getElementById('exportSavesBtn');
    if (ex) ex.addEventListener('click', exportSaves);
    var dz = document.getElementById('dropSaves');
    if (dz){
      dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('hover'); });
      dz.addEventListener('dragleave', function(){ dz.classList.remove('hover'); });
      dz.addEventListener('drop', function(e){
        e.preventDefault();
        dz.classList.remove('hover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) importSavesFile(e.dataTransfer.files[0]);
      });
      dz.addEventListener('click', function(){ document.getElementById('savesFile').click(); });
    }
    var sf = document.getElementById('savesFile');
    if (sf) sf.addEventListener('change', function(e){
      if (e.target.files && e.target.files[0]) importSavesFile(e.target.files[0]);
      sf.value = '';
    });
    renderSaves();
    G.updateGamePanel();
  };
})();
