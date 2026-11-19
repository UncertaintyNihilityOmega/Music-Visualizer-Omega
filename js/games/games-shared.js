/* =========================================================================
   MINI-GAMES: shared framework
   Enemies scale with level, new spawns take their HP from the music, and
   every item maxes out into a permanent damage "level break". No audio is
   generated here - the only sound is your own playlist.

   Each game registers itself via App.games.register(id, descriptor) with
   its own live state object, item table, and a handful of small hooks for
   the bits that genuinely differ (see game-tower-defense.js /
   game-survivor.js for the two current descriptors). Everything in this
   file is written against that descriptor, never against 'td'/'rpg' by
   name, so a third game (Cards) needs no changes here.
   ========================================================================= */
(function(){
  'use strict';
  var G = App.games = {};
  var Cfg = App.cfg, Aud = App.audio, U = App.util, Can = App.canvas;
  var A = Aud.A;
  var ctx = Can.ctx;

  G.registry = {};
  G.register = function(id, desc){ G.registry[id] = desc; };
  G.isGameMode = function(id){ return !!G.registry[id]; };
  G.currentState = function(){
    var d = G.registry[App.modes.current];
    return d ? d.state : null;
  };
  function descFor(g){ return G.registry[g.id]; }
  G.descFor = descFor;

  var DIFFS = {
    normal: { hp: 1,    dmg: 1,    qty: 1,    spd: 1,    lives: 20, money: 1,    label: 'Normal' },
    hard:   { hp: 1.5,  dmg: 1.35, qty: 1.25, spd: 1.1,  lives: 16, money: 0.85, label: 'Hard' },
    insane: { hp: 2.1,  dmg: 1.75, qty: 1.5,  spd: 1.22, lives: 11, money: 0.7,  label: 'Insane' }
  };
  G.DIFFS = DIFFS;
  function diff(){ return DIFFS[Cfg.CFG.games.difficulty] || DIFFS.normal; }
  G.diff = diff;

  // 3x speed is a switch (the X key), not a held key: on Windows, holding Shift for 8 s opens the Filter
  // Keys box and pressing it 5 times opens Sticky Keys; either takes the focus and ends fullscreen (the
  // user, 2026-11-19). It goes off when the window loses the focus, so it can never be left stuck on.
  var GSPEED = 1, boost = false;
  function gameSpeed(){ return boost ? 3 : GSPEED; }
  G.gameSpeed = gameSpeed;
  G.toggleBoost = function(){ boost = !boost; return boost; };
  G.setBoost = function(v){ boost = !!v; };
  window.addEventListener('blur', function(){ boost = false; });
  G.cycleSpeed = function(){ GSPEED = GSPEED >= 3 ? 1 : GSPEED + 1; return GSPEED; };

  // shape and colour are fixed per enemy type - never random
  var KINDS = [
    { id: 'tri',  sides: 3,  color: '#E4572E', hp: 11,  spd: 1.4,  dmg: 6,  xp: 1,  cash: 4,   r: 8 },
    { id: 'squ',  sides: 4,  color: '#3D7EA6', hp: 20,  spd: 1.05, dmg: 9,  xp: 3,  cash: 7,   r: 9 },
    { id: 'pen',  sides: 5,  color: '#E8A33D', hp: 36,  spd: 0.85, dmg: 13, xp: 6,  cash: 12,  r: 10 },
    { id: 'hex',  sides: 6,  color: '#7B4B94', hp: 58,  spd: 0.72, dmg: 18, xp: 11, cash: 20,  r: 11 },
    { id: 'oct',  sides: 8,  color: '#2A9D8F', hp: 92,  spd: 0.62, dmg: 24, xp: 19, cash: 33,  r: 12 },
    { id: 'boss', sides: 12, color: '#C1121F', hp: 780, spd: 0.44, dmg: 55, xp: 140, cash: 260, r: 22 }
  ];
  var BOSS = KINDS[5];
  G.KINDS = KINDS;
  G.BOSS = BOSS;
  function kindFor(level){
    var pool = Math.min(5, 1 + Math.floor(level / 4));
    var i = Math.floor(Math.random() * pool);
    if (Math.random() < Math.min(0.45, level / 90)) i = Math.min(pool - 1, i + 1);
    return KINDS[i];
  }
  G.kindFor = kindFor;
  // music raises the HP of newly spawned enemies only - anything already on
  // the field keeps the HP it was born with
  function enemyHP(level, kind){
    return kind.hp * (1 + level * Cfg.CFG.games.hpGrowth) * Math.pow(1.009, level)
           * diff().hp * (1 + A.level * Cfg.CFG.games.musicHp);
  }
  function enemyDmg(level, kind){
    return kind.dmg * (1 + level * Cfg.CFG.games.dmgGrowth) * diff().dmg;
  }
  G.enemyHP = enemyHP;
  G.enemyDmg = enemyDmg;
  G.musicSpeedMul = function(){ return 1 + A.level * Cfg.CFG.games.musicSpeed; };
  G.isBossLevel = function(n){ return n > 0 && n % Math.round(Cfg.CFG.games.bossEvery) === 0; };

  function blankLevels(items){
    var o = {};
    for (var i = 0; i < items.length; i++) o[items[i].id] = 0;
    return o;
  }
  G.blankLevels = blankLevels;
  function itemsOf(g){ var d = descFor(g); return d ? d.items : []; }
  G.itemsOf = itemsOf;
  function itemById(g, id){
    var it = itemsOf(g);
    for (var i = 0; i < it.length; i++) if (it[i].id === id) return it[i];
    return null;
  }
  G.itemById = itemById;
  // Every item has a max level, but it isn't always the same number within
  // one game (Tower Defense's tech is capped at 10 while towers go to 30;
  // Survivor's passives are capped at 10 while spells go to 30) - each game
  // supplies its own maxLvOf(item), so this stays generic across all of them.
  function maxLvOf(g, item){
    var d = descFor(g);
    return (d && d.maxLvOf) ? d.maxLvOf(item) : 30;
  }
  G.maxLvOf = maxLvOf;
  G.allMaxed = function(g){
    var it = itemsOf(g);
    for (var i = 0; i < it.length; i++) if (g.lv[it[i].id] < maxLvOf(g, it[i])) return false;
    return true;
  };
  function dmgMul(g){
    var d = descFor(g);
    var stat = d && d.dmgStat ? (g.lv[d.dmgStat] || 0) : 0;
    var coef = (d && d.dmgStatCoef !== undefined) ? d.dmgStatCoef : 0.012;
    // small permanent bump once every levelled item is maxed, instead of a
    // wall - +1% per level break, stacking
    return (1 + g.breaks * 0.01) * (1 + stat * coef);
  }
  G.dmgMul = dmgMul;
  G.lvScale = function(g, id, per){
    var l = g.lv[id];
    return l > 0 ? (1 + (l - 1) * per) : 0;
  };
  G.costOf = function(g, item){
    var lv = g.lv[item.id];
    return Math.round(item.cost * Math.pow(1.16, lv));
  };

  /* ---------- shared UI state: upgrade cards, banners, pause overlay ---------- */
  var GAME = { state: 'idle', cards: [], cardRects: [], banner: '', bannerT: 0, autoT: 0, evoApply: null };
  G.GAME = GAME;
  function setGameState(v){
    GAME.state = v;
    var g = G.currentState();
    if (g) g.state = v;
  }
  G.setGameState = setGameState;

  function rollCards(g){
    var it = itemsOf(g), pool = [];
    for (var i = 0; i < it.length; i++) if (g.lv[it[i].id] < maxLvOf(g, it[i])) pool.push(it[i]);
    if (!pool.length){
      g.breaks++;
      GAME.banner = 'LEVEL BREAK  +1% damage  (x' + g.breaks + ')';
      GAME.bannerT = 2.4;
      setGameState('playing');
      return;
    }
    for (var s = pool.length - 1; s > 0; s--){
      var j = Math.floor(Math.random() * (s + 1)), t = pool[s];
      pool[s] = pool[j]; pool[j] = t;
    }
    GAME.cards = pool.slice(0, Math.min(3, pool.length));
    setGameState('choosing');
    if (Cfg.CFG.games.autoUpgrade) pickCard(Math.floor(Math.random() * GAME.cards.length));
  }
  G.rollCards = rollCards;
  // Generic evolution-choice prompt: any game can show a 3-way pick-an-
  // evolution screen through the same card UI regular leveling uses.
  // applyFn(chosenId) is however that game wants to record the choice (a
  // tower instance's own .evo field for Tower Defense, a per-spell-id map
  // entry for Survivor) - this file never needs to know which.
  function rollEvolutionChoice(list, applyFn, emoji){
    GAME.cards = list.map(function(e){
      return { id: e.id, name: e.name, desc: e.desc, color: e.color, emoji: emoji, evo: true };
    });
    GAME.evoApply = applyFn;
    setGameState('choosing');
    if (Cfg.CFG.games.autoUpgrade) pickCard(Math.floor(Math.random() * GAME.cards.length));
  }
  G.rollEvolutionChoice = rollEvolutionChoice;
  function pickCard(n){
    var g = G.currentState();
    if (!g || GAME.state !== 'choosing') return;
    var card = GAME.cards[n];
    if (!card) return;
    if (card.evo){
      if (GAME.evoApply) GAME.evoApply(card.id);
      GAME.evoApply = null;
      GAME.cards = [];
      GAME.cardRects = [];
      setGameState('playing');
      var d0 = descFor(g);
      if (d0 && d0.renderShop) d0.renderShop();
      if (d0 && d0.renderGridInfo) d0.renderGridInfo();
      return;
    }
    var item = itemById(g, card.id);
    g.lv[card.id] = Math.min(maxLvOf(g, item), g.lv[card.id] + 1);
    GAME.cards = [];
    GAME.cardRects = [];
    setGameState('playing');
    var d = descFor(g);
    if (d && d.onLevelUp) d.onLevelUp(item, g.lv[card.id]);
  }
  G.pickCard = pickCard;

  /* ---------- drawing helpers shared by every game ---------- */
  function gameBackdrop(circular){
    var w = Can.canvas.width, h = Can.canvas.height, k = Can.dpr();
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, Cfg.CFG.games.bg1);
    g.addColorStop(1, Cfg.CFG.games.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (circular){
      // circular spectrum ring behind the arena
      var cx = w / 2, cy = h / 2, base = Math.min(w, h) * 0.3, bars = 72;
      ctx.lineWidth = Math.max(1.5, (6.283 * base / bars) * 0.6);
      for (var i = 0; i < bars; i++){
        var f = i / bars;
        var v = Aud.specAt(f < 0.5 ? f * 2 : (1 - f) * 2);
        var a = f * 6.283 - Math.PI / 2;
        var r0 = base, r1 = base + v * Math.min(w, h) * 0.2;
        ctx.strokeStyle = 'rgba(130,190,255,' + (0.08 + v * 0.35).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(130,190,255,' + (0.08 + A.punch * 0.25).toFixed(3) + ')';
      ctx.lineWidth = 1.5 * k;
      ctx.beginPath();
      ctx.arc(cx, cy, base * (1 + A.punch * 0.05), 0, 6.283);
      ctx.stroke();
    } else {
      var bands = 34;
      for (var b = 0; b < bands; b++){
        var vv = Aud.specAt(b / bands), bw = w / bands;
        ctx.fillStyle = 'rgba(120,180,255,' + (0.03 + vv * 0.1).toFixed(3) + ')';
        ctx.fillRect(b * bw, h - vv * h * 0.5, bw - 1, vv * h * 0.5);
      }
    }
    if (A.punch > 0.03){
      ctx.fillStyle = 'rgba(150,200,255,' + (A.punch * 0.06).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  }
  G.gameBackdrop = gameBackdrop;
  function drawEnemy(e, k){
    var pulse = 1 + A.punch * 0.16;
    ctx.fillStyle = e.kind.color;
    U.polyPath(ctx, e.x, e.y, e.kind.r * k * pulse, e.kind.sides, e.rot || 0);
    ctx.fill();
    if (e.slowT > 0){
      ctx.strokeStyle = 'rgba(160,230,255,0.75)';
      ctx.lineWidth = 1.4 * k;
      ctx.stroke();
    }
    var frac = e.hp / e.maxHp;
    if (frac < 0.999){
      var bw = e.kind.r * 2 * k;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(e.x - bw / 2, e.y - (e.kind.r + 7) * k, bw, 2.6 * k);
      ctx.fillStyle = frac > 0.4 ? '#7BD389' : '#EF6F6C';
      ctx.fillRect(e.x - bw / 2, e.y - (e.kind.r + 7) * k, bw * frac, 2.6 * k);
    }
  }
  G.drawEnemy = drawEnemy;
  function hudText(lines, k){
    ctx.font = (11 * k) + 'px Karla, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (var i = 0; i < lines.length; i++){
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillText(lines[i], 10 * k + 1, (10 + i * 15) * k + 1);
      ctx.fillStyle = '#EAF2FF';
      ctx.fillText(lines[i], 10 * k, (10 + i * 15) * k);
    }
  }
  G.hudText = hudText;
  function drawCards(k){
    var w = Can.canvas.width, h = Can.canvas.height;
    ctx.fillStyle = 'rgba(4,8,18,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + (13 * k) + 'px Karla, sans-serif';
    ctx.fillStyle = '#EAF2FF';
    ctx.fillText('Choose an upgrade  -  tap it, or press 1 / 2 / 3', w / 2, h * 0.11);
    var g = G.currentState();
    var n = GAME.cards.length;
    var cw = Math.min(w * 0.29, 210 * k), ch = Math.min(h * 0.62, 190 * k);
    var gap = cw * 0.1;
    var total = n * cw + (n - 1) * gap;
    GAME.cardRects = [];
    for (var i = 0; i < n; i++){
      var c = GAME.cards[i];
      var x = w / 2 - total / 2 + i * (cw + gap), y = h / 2 - ch / 2 + h * 0.04;
      GAME.cardRects.push({ x: x, y: y, w: cw, h: ch });
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      U.roundRect(ctx, x, y, cw, ch, 12 * k);
      ctx.fill();
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2 * k;
      ctx.stroke();
      if (c.emoji) Can.stampEmoji(Can.getEmojiSprite(c.emoji), x + cw / 2, y + ch * 0.17, 0, 22 * k, 1);
      ctx.fillStyle = c.color;
      ctx.font = 'bold ' + (15 * k) + 'px Karla, sans-serif';
      ctx.fillText(String(i + 1), x + 14 * k, y + 14 * k);
      ctx.font = 'bold ' + (12.5 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = '#EAF2FF';
      ctx.fillText(c.name, x + cw / 2, y + ch * 0.35);
      ctx.font = (10.5 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(234,242,255,0.72)';
      var label;
      if (c.evo) label = c.tag || 'EVOLUTION';
      else { var lv = g.lv[c.id]; label = lv === 0 ? 'NEW' : 'Lv ' + lv + '  →  ' + (lv + 1); }
      ctx.fillText(label, x + cw / 2, y + ch * 0.47);
      U.wrapText(ctx, c.desc || '', x + cw / 2, y + ch * 0.58, cw * 0.86, 12 * k, 10 * k);
    }
  }
  G.drawCards = drawCards;
  function drawOverlay(title, sub, k){
    var w = Can.canvas.width, h = Can.canvas.height;
    ctx.fillStyle = 'rgba(4,8,18,0.66)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#EAF2FF';
    ctx.font = 'bold ' + (20 * k) + 'px Karla, sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 12 * k);
    ctx.font = (12 * k) + 'px Karla, sans-serif';
    ctx.fillStyle = 'rgba(234,242,255,0.75)';
    ctx.fillText(sub, w / 2, h / 2 + 14 * k);
  }
  G.drawOverlay = drawOverlay;

  App.cfg.registerDefaults('games', {
    difficulty: 'normal', maxPerWave: 26, waveTime: 22, bossEvery: 20,
    musicHp: 0.6, musicSpeed: 0.35, musicPlayer: 0.35, musicHaste: 0.25,
    autoUpgrade: false, hpGrowth: 0.085, dmgGrowth: 0.04, effects: 1, autosave: true,
    targeting: 'forward', sellPrice: 80,
    bg1: '#101B2E', bg2: '#04070F'
  });
  App.cfg.registerSchema({ id: 'games', label: 'Mini-games', fields: [
    ['difficulty', 'Difficulty', 'select', ['normal', 'hard', 'insane']],
    ['maxPerWave', 'Max enemies per wave', 'range', 5, 90, 1],
    ['waveTime', 'Seconds between waves', 'range', 5, 60, 1],
    ['bossEvery', 'Boss every N levels', 'range', 10, 50, 1],
    ['autoUpgrade', 'Auto-pick upgrades (plays itself)', 'bool'],
    ['targeting', 'Towers target', 'select', ['forward', 'hp']],
    ['sellPrice', 'Selling price (% of value)', 'range', 10, 100, 5],
    ['musicHp', 'Music -> new enemy HP', 'range', 0, 2, 0.05],
    ['musicSpeed', 'Music -> enemy speed', 'range', 0, 1.5, 0.05],
    ['musicPlayer', 'Music -> your move speed', 'range', 0, 1.5, 0.05],
    ['musicHaste', 'Music -> your cast speed', 'range', 0, 1.5, 0.05],
    ['hpGrowth', 'Enemy HP per wave/level', 'range', 0.01, 0.3, 0.005],
    ['dmgGrowth', 'Enemy damage per level', 'range', 0.01, 0.2, 0.005],
    ['effects', 'Hit effects', 'range', 0, 1, 1],
    ['autosave', 'Autosave', 'bool'],
    ['bg1', 'Arena top', 'color'],
    ['bg2', 'Arena bottom', 'color']
  ]}, 2);
})();
