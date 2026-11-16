/* =========================================================================
   TOWER DEFENSE
   Towers are individual: each one carries its own level, its own
   evolution and its own spent value. All distances are expressed in
   game units (U) derived from the canvas height, so shrinking the
   window zooms the whole board instead of changing the balance.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util, G = App.games;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var TD = {
    id: 'td', level: 1, breaks: 0, lv: {}, lives: 20, best: 0, time: 0, state: 'idle',
    money: 180, enemies: [], shots: [], zones: [], fx: [], turrets: [], path: [], segs: [], total: 0,
    queue: 0, spawnT: 0, killed: 0, waveT: 0, buying: null, drag: null, hover: null,
    sel: null, placing: false, trash: null
  };
  var GRID_COLS = 26, GRID_ROWS = 13;
  var TOWER_MAX = 30, TECH_MAX = 10, EVO_AT = 15;
  function u(){ return canvas.height / 320; }

  var TD_ITEMS = [
    { id: 'cannon',  name: 'Cannon',      emoji: '💣', type: 'shot',  color: '#D8763A', dmg: 13,  rate: 0.95, range: 108, cost: 55,  desc: 'Single target. +14% damage per level, max level 30, evolves at 15.' },
    { id: 'gatling', name: 'Repeater',    emoji: '⚡',       type: 'shot',  color: '#E0B252', dmg: 4.5, rate: 0.2,  range: 92,  cost: 70,  desc: 'Fires 5x per second. +14% damage per level, max level 30, evolves at 15.' },
    { id: 'mortar',  name: 'Mortar',      emoji: '💥', type: 'aoe',   color: '#A2683A', dmg: 20,  rate: 1.9,  range: 160, cost: 120, desc: 'Splash hits everything in the blast for 75% damage. +14% per level, evolves at 15.' },
    { id: 'laser',   name: 'Light Beam',  emoji: '🔦', type: 'beam',  color: '#63D2FF', dmg: 17,  rate: 0,    range: 130, cost: 150, desc: 'Continuous beam. +14% damage per level, evolves at 15.' },
    { id: 'tesla',   name: 'Arc Coil',    emoji: '🌩️', type: 'chain', color: '#B57BFF', dmg: 11, rate: 1.1, range: 118, cost: 140, desc: 'Chains to 2 targets, +1 every 8 levels (max 7). +14% damage per level, evolves at 15.' },
    { id: 'flame',   name: 'Flame Jet',   emoji: '🔥', type: 'flame', color: '#FF7A3D', dmg: 26,  rate: 0,    range: 84,  cost: 110, desc: 'Burns everything in range continuously. +14% damage per level, evolves at 15.' },
    { id: 'frost',   name: 'Frost Field', emoji: '❄️', type: 'slow',  color: '#8FD8E8', dmg: 5,   rate: 0,    range: 104, cost: 95,  desc: 'Slows enemies to 45% speed and damages them. +14% per level, evolves at 15.' },
    { id: 'poison',  name: 'Toxin Spire', emoji: '☣️', type: 'dot',   color: '#8BC34A', dmg: 9,   rate: 0,    range: 96,  cost: 100, desc: 'Poisons for 1.4s at 55% of its damage. +14% per level, evolves at 15.' },
    { id: 'shock',   name: 'Shock Pylon', emoji: '🌀', type: 'push',  color: '#FFD166', dmg: 14,  rate: 3.1,  range: 122, cost: 130, desc: 'Stuns everything in range for 1s and damages it. Never faster than once per 2s. Evolves at 15.' },
    { id: 'power',   name: 'Tower Power Tech', emoji: '💪', type: 'global', color: '#EF6F6C', cost: 220, desc: '+10% damage for every tower, per level. Max 10 (+100%).' },
    { id: 'tempo',   name: 'Tower Speed Tech', emoji: '⏱️', type: 'global', color: '#7BD389', cost: 220, desc: '+10% fire rate for every tower, per level. Max 10 (+100%). Shock Pylon never goes below one hit per 2s.' },
    { id: 'optics',  name: 'Tower Range Tech', emoji: '🎯', type: 'global', color: '#6FA8DC', cost: 200, desc: '+10% range for every tower, per level. Max 10 (+100%).' },
    { id: 'repair',  name: 'Base Healing Tech', emoji: '🛠️', type: 'global', color: '#F5A3C7', cost: 240, desc: 'Rebuilds 1 life every 100s at level 1, down to every 10s at level 10.' }
  ];

  var EVOS = {
    cannon: [
      { id: 'iron',    name: 'Iron Cannon',      color: '#9AA6B2', desc: '3x damage, 25% slower.', dmg: 3, rate: 0.75 },
      { id: 'triple',  name: 'Triple Cannon',    color: '#E0B252', desc: 'Fires 3 shots at 3 different targets, 1x damage each.', split: 3 },
      { id: 'boom',    name: 'Explosion Cannon', color: '#FF7A3D', desc: 'Shots shatter into decaying damage zones. 50% slower.', rate: 0.5, shatter: 1 }
    ],
    gatling: [
      { id: 'laser',   name: 'Laser Repeater',   color: '#63D2FF', desc: '3x fire rate, 25% less damage.', rate: 3, dmg: 0.75 },
      { id: 'toxic',   name: 'Toxic Repeater',   color: '#8BC34A', desc: 'Every shot poisons instead of hitting once.', poison: 1 },
      { id: 'volcano', name: 'Volcanic Repeater',color: '#FF5B2E', desc: 'Every shot sets the target burning.', burn: 1 }
    ],
    mortar: [
      { id: 'iron',    name: 'Iron Mortar',      color: '#9AA6B2', desc: '3x damage, 25% slower.', dmg: 3, rate: 0.75 },
      { id: 'triple',  name: 'Triple Mortar',    color: '#E0B252', desc: '3 shells at 3 different targets, each still splashes.', split: 3 },
      { id: 'magic',   name: 'Magic Mortar',     color: '#B57BFF', desc: 'Shells shatter into decaying damage zones. 50% slower.', rate: 0.5, shatter: 1 }
    ],
    laser: [
      { id: 'hv',      name: 'High Voltage Beam',color: '#FFD166', desc: '3x damage, 25% slower.', dmg: 3, rate: 0.75 },
      { id: 'spectral',name: 'Spectral Beam',    color: '#FF8FD0', desc: 'Beam spreads into a triangle, hitting everything in the cone.', cone: 1 },
      { id: 'frost',   name: 'Frost Beam',       color: '#9FE3F0', desc: 'Freezes one enemy solid until it dies. 50% less damage.', dmg: 0.5, freeze: 1 }
    ],
    tesla: [
      { id: 'plasma',  name: 'Plasma Globe',     color: '#A44BFF', desc: 'Becomes an area tower: 1.2x damage to every enemy in range.', area: 1.2 },
      { id: 'current', name: 'High Current',     color: '#FFE066', desc: '3x damage, 25% slower.', dmg: 3, rate: 0.75 },
      { id: 'shock',   name: 'Shock Coil',       color: '#7BD3F7', desc: 'Stuns for 2s and chains one extra target. 50% slower.', rate: 0.5, stun: 2, chainPlus: 1 }
    ],
    flame: [
      { id: 'blue',    name: 'Blue Flames',      color: '#4FA8FF', desc: '3x damage, 25% slower.', dmg: 3, rate: 0.75 },
      { id: 'burning', name: 'Heart Burning',    color: '#FF4D6D', desc: '+25% range, and gives every tower in range +25% fire rate.', range: 1.25, auraRate: 1.25 },
      { id: 'seeking', name: 'Heart Seeking',    color: '#FF8FA3', desc: '+25% burn duration, and gives every tower in range +25% range.', burnDur: 1.25, auraRange: 1.25 }
    ],
    frost: [
      { id: 'absolute',name: 'Absolute 0',       color: '#CFF6FF', desc: '+50% slow: enemies crawl at 27% speed.', slowBoost: 1.5 },
      { id: 'bloody',  name: 'Bloody Ice',       color: '#E8557F', desc: '3x damage and +25% slow duration.', dmg: 3, slowDur: 1.25 },
      { id: 'cursing', name: 'Cursing Ice',      color: '#7B4B94', desc: 'Towers in range lose 50% range but deal 3x damage.', auraRange: 0.5, auraDmg: 3 }
    ],
    poison: [
      { id: 'radio',   name: 'Radioactive',      color: '#B6FF3D', desc: '3x poison damage and +25% poison duration.', dmg: 3, poisonDur: 1.25 },
      { id: 'longlife',name: 'Long-Life',        color: '#59C36A', desc: '+50% effect duration for every debuff tower in range, itself included.', auraDur: 1.5 },
      { id: 'halflife',name: 'Half-Life',        color: '#2A9D8F', desc: 'No poison. Every 4 minutes, halves the current HP of everything in range.', halve: 1 }
    ],
    shock: [
      { id: 'trickster', name: 'Trickster',      color: '#FFD166', desc: 'Stun lasts 1.5s instead of 1s.', stun: 1.5 },
      { id: 'joker',     name: 'Joker',          color: '#E8557F', desc: 'No stun. Each enemy gets one random buff or debuff (±30% speed or HP).', joker: 1 },
      { id: 'quake',     name: 'Earthquake',     color: '#A2683A', desc: 'No stun, 10x damage, but 6x slower.', dmg: 10, rate: 1 / 6, noStun: 1 }
    ]
  };

  function baseItem(t){ return G.itemById(TD, t.id); }
  function evoOf(t){
    if (!t.evo) return null;
    var list = EVOS[t.id] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === t.evo) return list[i];
    return null;
  }
  function towerColor(t){
    var e = evoOf(t);
    return e ? e.color : baseItem(t).color;
  }
  function rollEvolutions(t){
    G.rollEvolutionChoice(EVOS[t.id] || [], function(id){ t.evo = id; }, baseItem(t).emoji);
  }
  // Tech levels are 1..10 and each level is a flat +10%.
  function techMul(id){ return 1 + (TD.lv[id] || 0) * 0.1; }
  function towerStats(t){
    var it = baseItem(t), e = evoOf(t);
    var lvl = t.lv || 1;
    var growth = 1 + (lvl - 1) * 0.14;          // level 30 = ~5.1x base
    var st = {
      dmg: it.dmg * growth * techMul('power') * (t.aDmg || 1),
      range: it.range * techMul('optics') * (t.aRange || 1),
      rate: it.rate,
      type: it.type, evo: e
    };
    if (e){
      if (e.dmg) st.dmg *= e.dmg;
      if (e.range) st.range *= e.range;
      if (e.rate) st.rate = st.rate / e.rate;
    }
    var rateBoost = techMul('tempo') * (t.aRate || 1);
    st.rate = st.rate / rateBoost;
    if (it.id === 'shock' && !(e && e.noStun)){
      // hard floor: a shock pylon can never fire faster than once every 2s,
      // no matter how much fire-rate tech is stacked on it
      st.rate = Math.max(2, st.rate);
    }
    if (e && e.halve) st.rate = 240;
    return st;
  }
  function sellValue(t){
    return Math.round((t.spent || 0) * (Cfg.CFG.games.sellPrice / 100));
  }
  function upgradeCost(t){
    var it = baseItem(t);
    return Math.round(it.cost * 0.55 * Math.pow(1.17, (t.lv || 1)));
  }

  function buildPath(){
    var w = canvas.width, h = canvas.height;
    var m = w * 0.08;
    TD.path = [
      { x: -20, y: h * 0.2 }, { x: w - m, y: h * 0.2 },
      { x: w - m, y: h * 0.5 }, { x: m, y: h * 0.5 },
      { x: m, y: h * 0.8 }, { x: w + 20, y: h * 0.8 }
    ];
    TD.segs = [];
    TD.total = 0;
    for (var i = 1; i < TD.path.length; i++){
      var dx = TD.path[i].x - TD.path[i - 1].x, dy = TD.path[i].y - TD.path[i - 1].y;
      var len = Math.sqrt(dx * dx + dy * dy);
      TD.segs.push({ x: TD.path[i - 1].x, y: TD.path[i - 1].y, dx: dx / len, dy: dy / len, len: len, at: TD.total });
      TD.total += len;
    }
  }
  function pointAt(d){
    if (d < 0) d = 0;
    for (var i = 0; i < TD.segs.length; i++){
      var sg = TD.segs[i];
      if (d <= sg.at + sg.len || i === TD.segs.length - 1){
        var t = d - sg.at;
        return { x: sg.x + sg.dx * t, y: sg.y + sg.dy * t };
      }
    }
    return { x: 0, y: 0 };
  }
  function distToPath(x, y){
    var best = 1e12;
    for (var i = 0; i < TD.segs.length; i++){
      var sg = TD.segs[i];
      var vx = x - sg.x, vy = y - sg.y;
      var t = Math.max(0, Math.min(sg.len, vx * sg.dx + vy * sg.dy));
      var px = sg.x + sg.dx * t, py = sg.y + sg.dy * t;
      var d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  function cellCenter(gx, gy){
    return { x: (gx + 0.5) * (canvas.width / GRID_COLS), y: (gy + 0.5) * (canvas.height / GRID_ROWS) };
  }
  function cellAt(x, y){
    return {
      gx: Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / (canvas.width / GRID_COLS)))),
      gy: Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y / (canvas.height / GRID_ROWS))))
    };
  }
  function towerAt(gx, gy){
    for (var i = 0; i < TD.turrets.length; i++)
      if (TD.turrets[i].gx === gx && TD.turrets[i].gy === gy) return TD.turrets[i];
    return null;
  }
  function cellFree(gx, gy, ignore){
    var c = cellCenter(gx, gy);
    if (distToPath(c.x, c.y) < canvas.height * 0.075) return false;
    var t = towerAt(gx, gy);
    return !t || t === ignore;
  }
  function findFreeCell(){
    for (var tries = 0; tries < 300; tries++){
      var gx = Math.floor(Math.random() * GRID_COLS), gy = Math.floor(Math.random() * GRID_ROWS);
      if (cellFree(gx, gy)) return { gx: gx, gy: gy };
    }
    return null;
  }
  function placeTower(itemId, gx, gy, cost){
    if (!cellFree(gx, gy)) return null;
    var t = { id: itemId, gx: gx, gy: gy, lv: 1, evo: null, cd: Math.random() * 0.5, rot: 0, spent: cost || 0 };
    TD.turrets.push(t);
    return t;
  }
  // Buying always creates a NEW tower. Upgrading is done per tower.
  function buyItem(id){
    var item = G.itemById(TD, id);
    if (!item) return false;
    if (item.type === 'global'){
      var lv = TD.lv[id];
      if (lv >= TECH_MAX) return false;
      var c = G.costOf(TD, item);
      if (TD.money < c) return false;
      TD.money -= c;
      TD.lv[id] = lv + 1;
      renderShop();
      return true;
    }
    if (TD.money < G.costOf(TD, item)) return false;
    TD.buying = id;
    TD.placing = true;                    // buying drops you into positioning mode
    updatePosButton();
    return true;
  }
  function confirmPlace(gx, gy){
    if (!TD.buying) return false;
    var item = G.itemById(TD, TD.buying);
    var cost = G.costOf(TD, item);
    if (TD.money < cost || !cellFree(gx, gy)) return false;
    var t = placeTower(TD.buying, gx, gy, cost);
    if (!t) return false;
    TD.money -= cost;
    TD.buying = null;
    TD.sel = { gx: gx, gy: gy };
    renderShop();
    renderGridInfo();
    return true;
  }
  function upgradeTower(t){
    if (!t) return false;
    if (t.lv >= TOWER_MAX) return false;
    var c = upgradeCost(t);
    if (TD.money < c) return false;
    TD.money -= c;
    t.spent = (t.spent || 0) + c;
    t.lv++;
    if (t.lv === EVO_AT && !t.evo && EVOS[t.id]) rollEvolutions(t);
    renderShop();
    renderGridInfo();
    return true;
  }
  function sellTower(t){
    var i = TD.turrets.indexOf(t);
    if (i < 0) return;
    TD.money += sellValue(t);
    TD.turrets.splice(i, 1);
    TD.drag = null;
    renderShop();
    renderGridInfo();
  }

  function clearArena(keepTowers){
    TD.enemies = [];
    TD.shots = [];
    TD.zones = [];
    TD.fx = [];
    TD.queue = 0;
    TD.spawnT = 0;
    TD.buying = null;
    TD.drag = null;
    buildPath();
    if (!keepTowers) TD.turrets = [];
  }
  function tdStartWave(){
    var base = Math.round(Cfg.CFG.games.maxPerWave * Math.min(1, 0.35 + TD.level * 0.045) * G.diff().qty);
    TD.queue = Math.max(3, base);
    if (G.isBossLevel(TD.level)) TD.queue += 1;
    TD.spawnT = 0;
    TD.waveT = Cfg.CFG.games.waveTime;
  }
  function tdSpawn(){
    var boss = (G.isBossLevel(TD.level) && TD.queue === 1);
    var kind = boss ? G.BOSS : G.kindFor(TD.level);
    var hp = G.enemyHP(TD.level, kind);
    TD.enemies.push({ kind: kind, hp: hp, maxHp: hp, dist: 0, x: -30, y: 0,
                      slowT: 0, slowMul: 0.45, stunT: 0, burn: 0, burnDmg: 0,
                      pois: 0, poisDmg: 0, frozen: null, joked: false,
                      spd: 1, rot: Math.random() * 6.283 });
    TD.queue--;
  }
  function tdHurt(e, dmg){
    e.hp -= dmg * G.dmgMul(TD);
    if (e.hp <= 0){
      var i = TD.enemies.indexOf(e);
      if (i >= 0) TD.enemies.splice(i, 1);
      TD.killed++;
      TD.money += Math.round(e.kind.cash * (1 + TD.level * 0.03) * G.diff().money);
      if (Cfg.CFG.games.effects > 0 && TD.fx.length < 60){
        TD.fx.push({ x: e.x, y: e.y, r: e.kind.r * u(), max: e.kind.r * 2.4 * u(), life: 1, color: e.kind.color });
      }
    }
  }
  function pickTarget(tu, range2){
    var mode = Cfg.CFG.games.targeting, best = null, bestScore = -1;
    for (var q = 0; q < TD.enemies.length; q++){
      var en = TD.enemies[q];
      var ddx = en.x - tu.x, ddy = en.y - tu.y;
      if (ddx * ddx + ddy * ddy > range2) continue;
      var score = mode === 'hp' ? en.hp : en.dist;
      if (score > bestScore){ bestScore = score; best = en; }
    }
    return best;
  }
  function tdUpdate(dt){
    var uu = u();
    TD.time += dt;
    TD.waveT -= dt;
    if (TD.waveT <= 0 || (!TD.queue && !TD.enemies.length)){
      TD.level++;
      tdStartWave();
      if (Cfg.CFG.games.autoUpgrade) tdAutoBuy();
    }

    TD.spawnT -= dt;
    var hardCap = Math.round(Cfg.CFG.games.maxPerWave * 2.2);
    var interval = Math.max(0.12, Cfg.CFG.games.waveTime / Math.max(4, TD.queue + 1) * 0.75);
    while (TD.queue > 0 && TD.spawnT <= 0 && TD.enemies.length < hardCap){
      tdSpawn();
      TD.spawnT += interval;
    }

    // ---- aura pass: buff/debuff towers standing inside other towers' fields
    for (var ai = 0; ai < TD.turrets.length; ai++){
      var at = TD.turrets[ai];
      at.aDmg = 1; at.aRate = 1; at.aRange = 1; at.aDur = 1;
      var p0 = cellCenter(at.gx, at.gy);
      at.x = p0.x; at.y = p0.y;
    }
    for (var si = 0; si < TD.turrets.length; si++){
      var src = TD.turrets[si], se = evoOf(src);
      if (!se || (!se.auraRate && !se.auraRange && !se.auraDmg && !se.auraDur)) continue;
      var sr = towerStats(src).range * uu;
      for (var ti2 = 0; ti2 < TD.turrets.length; ti2++){
        var dst = TD.turrets[ti2];
        var ddx2 = dst.x - src.x, ddy2 = dst.y - src.y;
        if (ddx2 * ddx2 + ddy2 * ddy2 > sr * sr) continue;
        var self = dst === src;
        if (se.auraRate) dst.aRate *= se.auraRate;
        if (se.auraRange && !(se.id === 'cursing' && self)) dst.aRange *= se.auraRange;
        if (se.auraDmg && !(se.id === 'cursing' && self)) dst.aDmg *= se.auraDmg;
        if (se.auraDur){
          var de = evoOf(dst), di = baseItem(dst);
          var isDebuff = di && (di.type === 'slow' || di.type === 'dot' || di.type === 'flame');
          if (isDebuff || self) dst.aDur *= se.auraDur;
        }
      }
    }

    var speedBase = 26 * uu * G.musicSpeedMul() * G.diff().spd;
    for (var i = TD.enemies.length - 1; i >= 0; i--){
      var e = TD.enemies[i];
      e.stunT = Math.max(0, e.stunT - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      var moving = e.stunT <= 0 && !(e.frozen && TD.turrets.indexOf(e.frozen) >= 0);
      var mul = (e.slowT > 0 ? e.slowMul : 1) * (e.spd || 1);
      if (moving) e.dist += e.kind.spd * speedBase * mul * dt;
      if (e.burn > 0){ e.burn -= dt; tdHurt(e, e.burnDmg * dt); if (e.hp <= 0) continue; }
      if (e.pois > 0){ e.pois -= dt; tdHurt(e, e.poisDmg * dt); if (e.hp <= 0) continue; }
      var p = pointAt(e.dist);
      e.x = p.x; e.y = p.y;
      e.rot += dt * 0.6;
      if (e.dist >= TD.total){
        TD.lives -= (e.kind === G.BOSS ? 5 : 1);
        TD.enemies.splice(i, 1);
      }
    }
    if (TD.lives <= 0){ App.games.gameOver(TD); return; }

    if (TD.lv.repair > 0){
      // level 1 = one life per 100s, level 10 = one per 10s
      var period = 100 - (TD.lv.repair - 1) * 10;
      TD.repairAcc = (TD.repairAcc || 0) + dt / Math.max(10, period);
      if (TD.repairAcc >= 1){ TD.repairAcc -= 1; TD.lives = Math.min(G.diff().lives + 10, TD.lives + 1); }
    }

    for (var t = 0; t < TD.turrets.length; t++){
      var tu = TD.turrets[t], it = baseItem(tu);
      if (!it) continue;
      var st = towerStats(tu), ev = st.evo;
      var range = st.range * uu, range2 = range * range;
      var dmg = st.dmg;
      var durMul = (tu.aDur || 1) * (ev && ev.burnDur ? ev.burnDur : 1)
                 * (ev && ev.poisonDur ? ev.poisonDur : 1) * (ev && ev.slowDur ? ev.slowDur : 1);
      var target = pickTarget(tu, range2);
      if (target) tu.rot = Math.atan2(target.y - tu.y, target.x - tu.x);
      tu.target = target;

      // --- continuous field towers
      if (it.type === 'slow' || it.type === 'dot' || it.type === 'flame' || (ev && ev.area)){
        if (ev && ev.halve){
          tu.cd -= dt;
          if (tu.cd <= 0){
            tu.cd = 240;
            for (var hz = TD.enemies.length - 1; hz >= 0; hz--){
              var he = TD.enemies[hz];
              var hdx = he.x - tu.x, hdy = he.y - tu.y;
              if (hdx * hdx + hdy * hdy > range2) continue;
              he.hp *= 0.5;                       // ignores damage buffs entirely
              if (he.hp <= 1) tdHurt(he, 999999);
            }
            if (Cfg.CFG.games.effects > 0 && TD.fx.length < 60)
              TD.fx.push({ x: tu.x, y: tu.y, r: 4 * uu, max: range, life: 1, color: '#2A9D8F' });
          }
          continue;
        }
        for (var a2 = TD.enemies.length - 1; a2 >= 0; a2--){
          var ae = TD.enemies[a2];
          var adx = ae.x - tu.x, ady = ae.y - tu.y;
          if (adx * adx + ady * ady > range2) continue;
          if (ev && ev.area){ tdHurt(ae, dmg * ev.area * dt); continue; }
          if (it.type === 'slow'){
            ae.slowT = 0.35 * durMul;
            ae.slowMul = ev && ev.slowBoost ? 0.45 / ev.slowBoost : 0.45;
            tdHurt(ae, dmg * dt);
          } else if (it.type === 'dot'){
            ae.pois = 1.4 * durMul;
            ae.poisDmg = dmg * 0.55;
          } else {
            ae.burn = 1.2 * durMul;
            ae.burnDmg = dmg * 0.5;
            tdHurt(ae, dmg * dt);
          }
        }
        continue;
      }
      // --- beams
      if (it.type === 'beam'){
        if (ev && ev.freeze){
          if (tu.lock && TD.enemies.indexOf(tu.lock) < 0) tu.lock = null;
          if (!tu.lock) tu.lock = target;
          if (tu.lock){
            var lx = tu.lock.x - tu.x, ly = tu.lock.y - tu.y;
            if (lx * lx + ly * ly <= range2){
              tu.lock.frozen = tu;
              tu.lock.stunT = Math.max(tu.lock.stunT, 0.2);
              tdHurt(tu.lock, dmg * dt);
              tu.target = tu.lock;
            } else tu.lock = null;
          }
          continue;
        }
        if (ev && ev.cone){
          var ca = tu.rot, spread = 0.42;
          for (var cz = TD.enemies.length - 1; cz >= 0; cz--){
            var ce = TD.enemies[cz];
            var cdx = ce.x - tu.x, cdy = ce.y - tu.y;
            if (cdx * cdx + cdy * cdy > range2) continue;
            var da = Math.atan2(cdy, cdx) - ca;
            while (da > Math.PI) da -= 6.283;
            while (da < -Math.PI) da += 6.283;
            if (Math.abs(da) < spread) tdHurt(ce, dmg * 0.75 * dt);
          }
          continue;
        }
        if (target) tdHurt(target, dmg * dt);
        continue;
      }

      tu.cd -= dt;
      if (tu.cd > 0 || !target) continue;
      tu.cd = st.rate;

      if (it.type === 'shot' || it.type === 'aoe'){
        var shots = (ev && ev.split) ? ev.split : 1;
        var targets = [target];
        if (shots > 1){
          for (var xt = 0; xt < TD.enemies.length && targets.length < shots; xt++){
            var cand = TD.enemies[xt];
            if (targets.indexOf(cand) >= 0) continue;
            var tdx = cand.x - tu.x, tdy = cand.y - tu.y;
            if (tdx * tdx + tdy * tdy <= range2) targets.push(cand);
          }
        }
        for (var sIdx = 0; sIdx < targets.length; sIdx++){
          if (TD.shots.length >= 200) break;
          var tg = targets[sIdx];
          var ang = Math.atan2(tg.y - tu.y, tg.x - tu.x);
          var spd = it.type === 'aoe' ? 250 : 420;
          TD.shots.push({
            x: tu.x, y: tu.y, vx: Math.cos(ang) * spd * uu, vy: Math.sin(ang) * spd * uu,
            dmg: dmg, life: it.type === 'aoe' ? 2 : 1.2, color: towerColor(tu),
            splash: it.type === 'aoe' ? 44 * uu : 0,
            shatter: ev && ev.shatter ? 1 : 0,
            poison: ev && ev.poison ? dmg * 0.6 * durMul : 0,
            burn: ev && ev.burn ? dmg * 0.6 * durMul : 0
          });
        }
      } else if (it.type === 'chain'){
        var hops = Math.min(7, 2 + Math.floor(tu.lv / 8) + (ev && ev.chainPlus ? ev.chainPlus : 0));
        var from = tu, cur = target, hit = [];
        for (var hc = 0; hc < hops && cur; hc++){
          if (Cfg.CFG.games.effects > 0 && TD.fx.length < 60)
            TD.fx.push({ line: [from.x, from.y, cur.x, cur.y], life: 0.9, color: towerColor(tu) });
          tdHurt(cur, dmg);
          if (ev && ev.stun) cur.stunT = Math.max(cur.stunT, ev.stun);
          hit.push(cur);
          from = { x: cur.x, y: cur.y };
          var next = null, nd = (70 * uu) * (70 * uu);
          for (var z = 0; z < TD.enemies.length; z++){
            var ze = TD.enemies[z];
            if (hit.indexOf(ze) >= 0) continue;
            var zdx = ze.x - from.x, zdy = ze.y - from.y, z2 = zdx * zdx + zdy * zdy;
            if (z2 < nd){ nd = z2; next = ze; }
          }
          cur = next;
        }
      } else if (it.type === 'push'){
        // Shock Pylon stuns instead of shoving enemies backwards, which is
        // what made stacked pylons a permanent wall.
        for (var pz = TD.enemies.length - 1; pz >= 0; pz--){
          var pe = TD.enemies[pz];
          var pdx = pe.x - tu.x, pdy = pe.y - tu.y;
          if (pdx * pdx + pdy * pdy > range2) continue;
          if (ev && ev.joker){
            if (!pe.joked){
              pe.joked = true;
              var roll = Math.floor(Math.random() * 4);
              if (roll === 0) pe.spd = (pe.spd || 1) * 0.7;
              else if (roll === 1) pe.hp *= 0.7;
              else if (roll === 2) pe.spd = (pe.spd || 1) * 1.3;
              else { pe.hp = Math.min(pe.maxHp, pe.hp * 1.3); }
            }
          } else if (!(ev && ev.noStun)){
            pe.stunT = Math.max(pe.stunT, ev && ev.stun ? ev.stun : 1);
          }
          tdHurt(pe, dmg);
        }
        if (Cfg.CFG.games.effects > 0 && TD.fx.length < 60)
          TD.fx.push({ x: tu.x, y: tu.y, r: 4 * uu, max: range, life: 1, color: towerColor(tu) });
      }
    }

    // projectiles
    for (var s2 = TD.shots.length - 1; s2 >= 0; s2--){
      var sh = TD.shots[s2];
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life -= dt;
      var gone = sh.life <= 0;
      if (!gone){
        for (var m = TD.enemies.length - 1; m >= 0; m--){
          var me = TD.enemies[m];
          var mdx = me.x - sh.x, mdy = me.y - sh.y, rr = (me.kind.r + 3) * uu;
          if (mdx * mdx + mdy * mdy > rr * rr) continue;
          if (sh.poison){ me.pois = 1.4; me.poisDmg = sh.poison; }
          if (sh.burn){ me.burn = 1.2; me.burnDmg = sh.burn; }
          if (sh.splash > 0){
            for (var spz = TD.enemies.length - 1; spz >= 0; spz--){
              var se2 = TD.enemies[spz];
              var sdx = se2.x - sh.x, sdy = se2.y - sh.y;
              if (sdx * sdx + sdy * sdy <= sh.splash * sh.splash) tdHurt(se2, sh.dmg * 0.75);
            }
          } else tdHurt(me, sh.dmg);
          if (sh.shatter && TD.zones.length < 40){
            for (var zc = 0; zc < 3; zc++){
              TD.zones.push({ x: sh.x + (Math.random() - 0.5) * 40 * uu, y: sh.y + (Math.random() - 0.5) * 40 * uu,
                              r: 22 * uu, dmg: sh.dmg * 0.5, life: 2.2, max: 2.2, color: sh.color });
            }
          }
          if (Cfg.CFG.games.effects > 0 && sh.splash > 0 && TD.fx.length < 60)
            TD.fx.push({ x: sh.x, y: sh.y, r: 3 * uu, max: sh.splash, life: 1, color: sh.color });
          gone = true;
          break;
        }
      }
      if (gone) TD.shots.splice(s2, 1);
    }
    // decaying damage zones from shatter evolutions
    for (var zi = TD.zones.length - 1; zi >= 0; zi--){
      var zo = TD.zones[zi];
      zo.life -= dt;
      if (zo.life <= 0){ TD.zones.splice(zi, 1); continue; }
      var decay = zo.life / zo.max;
      for (var ze2 = TD.enemies.length - 1; ze2 >= 0; ze2--){
        var zen = TD.enemies[ze2];
        var zdx2 = zen.x - zo.x, zdy2 = zen.y - zo.y;
        if (zdx2 * zdx2 + zdy2 * zdy2 <= zo.r * zo.r) tdHurt(zen, zo.dmg * decay * dt);
      }
    }
    for (var f = TD.fx.length - 1; f >= 0; f--){
      TD.fx[f].life -= dt * 2.6;
      if (TD.fx[f].life <= 0) TD.fx.splice(f, 1);
    }
  }
  function tdAutoBuy(){
    for (var pass = 0; pass < 3; pass++){
      var afford = [];
      for (var i = 0; i < TD_ITEMS.length; i++){
        var it = TD_ITEMS[i];
        if (it.type === 'global' && TD.lv[it.id] >= TECH_MAX) continue;
        if (TD.money >= G.costOf(TD, it)) afford.push(it);
      }
      // upgrading an existing tower is often better value than another tower.
      // (if this level-up crosses EVO_AT, rollEvolutions -> rollEvolutionChoice
      // already auto-picks the evolution itself when autoUpgrade is on)
      if (TD.turrets.length && Math.random() < 0.5){
        var tw = TD.turrets[Math.floor(Math.random() * TD.turrets.length)];
        if (upgradeTower(tw)) continue;
      }
      if (!afford.length) return;
      var pick = afford[Math.floor(Math.random() * afford.length)];
      if (pick.type === 'global'){ buyItem(pick.id); }
      else {
        var cell = findFreeCell();
        if (!cell) return;
        TD.buying = pick.id;
        confirmPlace(cell.gx, cell.gy);
      }
    }
  }
  function tdDraw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), uu = u();
    G.gameBackdrop(false);
    var cw = w / GRID_COLS, chh = h / GRID_ROWS;

    // positioning mode paints every cell green (free) or red (blocked)
    if (TD.placing){
      for (var gx = 0; gx < GRID_COLS; gx++){
        for (var gy = 0; gy < GRID_ROWS; gy++){
          var ok = cellFree(gx, gy, TD.drag);
          ctx.fillStyle = ok ? 'rgba(90,220,130,0.10)' : 'rgba(240,90,90,0.13)';
          ctx.fillRect(gx * cw + 1, gy * chh + 1, cw - 2, chh - 2);
        }
      }
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 26 * uu;
    ctx.beginPath();
    ctx.moveTo(TD.path[0].x, TD.path[0].y);
    for (var i = 1; i < TD.path.length; i++) ctx.lineTo(TD.path[i].x, TD.path[i].y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(140,200,255,0.22)';
    ctx.lineWidth = 1.4 * uu;
    ctx.stroke();

    // zones
    for (var zq = 0; zq < TD.zones.length; zq++){
      var zz = TD.zones[zq];
      ctx.globalAlpha = 0.25 * (zz.life / zz.max);
      ctx.fillStyle = zz.color;
      ctx.beginPath();
      ctx.arc(zz.x, zz.y, zz.r, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (var t = 0; t < TD.turrets.length; t++){
      var tu = TD.turrets[t], it = baseItem(tu);
      if (!it) continue;
      var pos = cellCenter(tu.gx, tu.gy);
      if (TD.drag === tu && TD.hover) pos = cellCenter(TD.hover.gx, TD.hover.gy);
      var col = towerColor(tu);
      var st = towerStats(tu);

      // clean white range border
      var showRange = TD.placing || (TD.sel && TD.sel.gx === tu.gx && TD.sel.gy === tu.gy) || TD.drag === tu;
      if (showRange){
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1.2 * uu;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, st.range * uu, 0, 6.283);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(8,14,26,0.82)';
      U.polyPath(ctx, pos.x, pos.y, 13 * uu, 6, 0.52);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8 * uu;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3 * uu;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x + Math.cos(tu.rot) * 14 * uu, pos.y + Math.sin(tu.rot) * 14 * uu);
      ctx.stroke();
      Can.stampEmoji(Can.getEmojiSprite(it.emoji), pos.x, pos.y, 0, 15 * uu, 1);
      ctx.fillStyle = 'rgba(234,242,255,0.85)';
      ctx.font = (8 * uu) + 'px Karla, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(tu.lv + (tu.evo ? '✦' : ''), pos.x, pos.y + 13 * uu);
      if (it.type === 'beam' && tu.target){
        ctx.strokeStyle = col;
        ctx.lineWidth = (1.6 + A.punch * 2.4) * uu;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(tu.target.x, tu.target.y);
        ctx.stroke();
      }
    }

    for (var e2 = 0; e2 < TD.enemies.length; e2++){
      var en2 = TD.enemies[e2];
      G.drawEnemy(en2, uu);
      if (en2.stunT > 0 || en2.frozen){
        ctx.strokeStyle = en2.frozen ? 'rgba(180,240,255,0.9)' : 'rgba(255,220,120,0.9)';
        ctx.lineWidth = 1.6 * uu;
        U.polyPath(ctx, en2.x, en2.y, (en2.kind.r + 3) * uu, en2.kind.sides, en2.rot);
        ctx.stroke();
      }
    }
    for (var s3 = 0; s3 < TD.shots.length; s3++){
      var sh2 = TD.shots[s3];
      ctx.fillStyle = sh2.color;
      ctx.beginPath();
      ctx.arc(sh2.x, sh2.y, (sh2.splash > 0 ? 4 : 2.6) * uu, 0, 6.283);
      ctx.fill();
    }
    for (var fq = 0; fq < TD.fx.length; fq++){
      var fx = TD.fx[fq];
      ctx.globalAlpha = Math.max(0, fx.life) * 0.7;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2 * uu;
      ctx.beginPath();
      if (fx.line){ ctx.moveTo(fx.line[0], fx.line[1]); ctx.lineTo(fx.line[2], fx.line[3]); }
      else ctx.arc(fx.x, fx.y, fx.r + (fx.max - fx.r) * (1 - fx.life), 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // trash can, only while positioning
    if (TD.placing){
      var tw2 = cw * 2.2, th2 = chh * 1.8;
      TD.trash = { x: w - tw2 - 8 * uu, y: h - th2 - 8 * uu, w: tw2, h: th2 };
      ctx.fillStyle = 'rgba(190,40,50,0.28)';
      U.roundRect(ctx, TD.trash.x, TD.trash.y, tw2, th2, 8 * uu);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,120,120,0.9)';
      ctx.lineWidth = 1.6 * uu;
      ctx.stroke();
      Can.stampEmoji(Can.getEmojiSprite('🗑️'), TD.trash.x + tw2 / 2, TD.trash.y + th2 * 0.42, 0, 16 * uu, 0.95);
      ctx.fillStyle = '#FFD9D9';
      ctx.font = (8 * uu) + 'px Karla, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('sell ' + Cfg.CFG.games.sellPrice + '%', TD.trash.x + tw2 / 2, TD.trash.y + th2 * 0.68);
    } else TD.trash = null;

    // the selected cell: an empty rectangle, white when usable, red when not
    if (TD.sel){
      var free = cellFree(TD.sel.gx, TD.sel.gy, TD.drag);
      var occupied = !!towerAt(TD.sel.gx, TD.sel.gy);
      ctx.strokeStyle = (free && !occupied) ? 'rgba(255,255,255,0.95)' : 'rgba(255,70,70,0.95)';
      ctx.lineWidth = 2.2 * uu;
      ctx.strokeRect(TD.sel.gx * cw + 1.5 * uu, TD.sel.gy * chh + 1.5 * uu, cw - 3 * uu, chh - 3 * uu);
    }
    if (TD.buying && TD.hover){
      var bi = G.itemById(TD, TD.buying);
      if (bi) Can.stampEmoji(Can.getEmojiSprite(bi.emoji), cellCenter(TD.hover.gx, TD.hover.gy).x,
                         cellCenter(TD.hover.gx, TD.hover.gy).y, 0, 18 * uu, 0.6);
    }

    G.hudText([
      'Wave ' + TD.level + (TD.breaks ? '   break x' + TD.breaks : '') + '   next in ' + Math.max(0, Math.ceil(TD.waveT)) + 's',
      '💰 ' + Math.round(TD.money) + '   Lives ' + TD.lives + '   Enemies ' + TD.enemies.length,
      'Time ' + U.formatTime(TD.time) + '   Best ' + U.formatTime(TD.best) + '   ' + G.gameSpeed() + 'x',
      TD.buying ? 'Placing ' + G.itemById(TD, TD.buying).name + ' – tap a cell or press Enter (Esc cancels)'
                : (TD.placing ? 'Positioning – drag towers, drop on the bin to sell'
                              : G.DIFFS[Cfg.CFG.games.difficulty].label + ' – WASD moves the selector, Enter upgrades')
    ], k);
  }

  /* ---------- panel wiring specific to Tower Defense ---------- */
  var shopBody = document.getElementById('shopBody');
  function renderShop(){
    if (App.modes.current !== 'td' || !shopBody) return;
    shopBody.innerHTML = '';
    for (var i = 0; i < TD_ITEMS.length; i++){
      (function(it, idx){
        var lv = TD.lv[it.id] || 0;
        var own = 0;
        if (it.type !== 'global'){
          for (var oi = 0; oi < TD.turrets.length; oi++) if (TD.turrets[oi].id === it.id) own++;
        }
        var row = document.createElement('div');
        row.className = 'shop-row';
        var head = document.createElement('div');
        head.className = 'shop-head';
        var name = document.createElement('span');
        name.className = 'shop-name';
        name.textContent = (idx < 9 ? '[' + (idx + 1) + '] ' : '') + it.emoji + ' ' + it.name +
          (it.type === 'global' ? '  Lv ' + lv + '/' + TECH_MAX : '  owned: ' + own);
        head.appendChild(name);
        var buy = document.createElement('button');
        buy.type = 'button';
        buy.className = 'slot-btn';
        var isTech = it.type === 'global';
        var maxed = isTech && lv >= TECH_MAX;
        var cost = G.costOf(TD, it);
        buy.textContent = maxed ? 'MAX' : ('💰' + cost + (isTech ? '' : ' buy'));
        buy.disabled = maxed || TD.money < cost;
        buy.addEventListener('click', function(){ buyItem(it.id); renderShop(); });
        head.appendChild(buy);
        row.appendChild(head);
        var desc = document.createElement('div');
        desc.className = 'shop-desc';
        desc.textContent = it.desc || '';
        row.appendChild(desc);
        shopBody.appendChild(row);
      })(TD_ITEMS[i], i);
    }
    var money = document.getElementById('moneyLabel');
    if (money) money.textContent = '💰 ' + Math.round(TD.money);
  }
  function renderGridInfo(){
    var el = document.getElementById('gridInfo');
    if (!el) return;
    if (!TD.sel){ el.innerHTML = '<span class="grid-empty">No cell selected – tap the board or use WASD.</span>'; return; }
    var t = towerAt(TD.sel.gx, TD.sel.gy);
    if (!t){
      var blocked = !cellFree(TD.sel.gx, TD.sel.gy);
      el.innerHTML = '<span class="grid-empty">Cell ' + TD.sel.gx + ',' + TD.sel.gy + ' – ' +
        (blocked ? 'blocked (too close to the road)' : 'empty and free to build on') + '</span>';
      return;
    }
    var it = baseItem(t), st = towerStats(t), ev = evoOf(t);
    var cost = upgradeCost(t);
    var canUp = t.lv < TOWER_MAX && TD.money >= cost;
    el.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'grid-head';
    head.innerHTML = '<b>' + it.emoji + ' ' + (ev ? ev.name : it.name) + '</b> – Lv ' + t.lv + '/' + TOWER_MAX;
    el.appendChild(head);
    var stats = document.createElement('div');
    stats.className = 'grid-stats';
    stats.textContent = 'Damage ' + st.dmg.toFixed(1) +
      '   Range ' + Math.round(st.range) +
      (st.rate ? '   Every ' + st.rate.toFixed(2) + 's' : '   Continuous') +
      '   Value 💰' + sellValue(t);
    el.appendChild(stats);
    if (ev){
      var evd = document.createElement('div');
      evd.className = 'grid-evo';
      evd.textContent = ev.desc;
      el.appendChild(evd);
    } else if (t.lv < EVO_AT){
      var soon = document.createElement('div');
      soon.className = 'grid-evo';
      soon.textContent = 'Evolves at level ' + EVO_AT + ' (' + (EVO_AT - t.lv) + ' to go).';
      el.appendChild(soon);
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = t.lv >= TOWER_MAX ? 'Max level' : ('Upgrade 💰' + cost + '  (Enter)');
    btn.disabled = !canUp;
    btn.addEventListener('click', function(){ upgradeTower(t); });
    el.appendChild(btn);
  }
  function updatePosButton(){
    var b = document.getElementById('posBtn');
    if (b) b.textContent = TD.placing ? 'Positioning: ON' : 'Positioning: off';
  }

  App.canvas.addResizeHook(function(){
    if (!TD.path.length) return;
    buildPath();
    // a portrait/landscape change moves the road relative to the grid, so
    // re-seat any tower that would now be standing on it
    for (var ti = 0; ti < TD.turrets.length; ti++){
      var tw = TD.turrets[ti];
      if (cellFree(tw.gx, tw.gy, tw)) continue;
      var moved = false;
      for (var rad = 1; rad < 6 && !moved; rad++){
        for (var ox = -rad; ox <= rad && !moved; ox++){
          for (var oy = -rad; oy <= rad && !moved; oy++){
            var nx = tw.gx + ox, ny = tw.gy + oy;
            if (nx < 0 || ny < 0 || nx >= GRID_COLS || ny >= GRID_ROWS) continue;
            if (cellFree(nx, ny, tw)){ tw.gx = nx; tw.gy = ny; moved = true; }
          }
        }
      }
    }
  });

  /* ---------- pointer input ---------- */
  canvas.addEventListener('pointerdown', function(ev){
    if (App.modes.current !== 'td') return;
    if (G.GAME.state === 'choosing' || G.GAME.state === 'idle' || G.GAME.state === 'dead' || G.GAME.state === 'paused') return;
    var pt = App.taps.canvasPoint(ev);
    var cell = cellAt(pt.x, pt.y);
    TD.sel = cell;
    TD.hover = cell;
    if (TD.buying){ confirmPlace(cell.gx, cell.gy); return; }
    var t = towerAt(cell.gx, cell.gy);
    if (t && TD.placing) TD.drag = t;      // dragging only inside positioning mode
    renderGridInfo();
  });
  canvas.addEventListener('pointermove', function(ev){
    if (App.modes.current !== 'td' || (!TD.buying && !TD.drag)) return;
    var pt2 = App.taps.canvasPoint(ev);
    TD.hover = cellAt(pt2.x, pt2.y);
    TD.pointer = pt2;
  });
  canvas.addEventListener('pointerup', function(){
    if (App.modes.current !== 'td' || !TD.drag) return;
    // dropped on the bin: sell it back at the configured percentage
    if (TD.trash && TD.pointer &&
        TD.pointer.x >= TD.trash.x && TD.pointer.x <= TD.trash.x + TD.trash.w &&
        TD.pointer.y >= TD.trash.y && TD.pointer.y <= TD.trash.y + TD.trash.h){
      sellTower(TD.drag);
      TD.drag = null;
      TD.hover = null;
      return;
    }
    if (TD.hover && cellFree(TD.hover.gx, TD.hover.gy, TD.drag)){
      TD.drag.gx = TD.hover.gx;
      TD.drag.gy = TD.hover.gy;
      TD.sel = { gx: TD.drag.gx, gy: TD.drag.gy };
    }
    TD.drag = null;
    TD.hover = null;
    renderGridInfo();
  });

  var posBtn = document.getElementById('posBtn');
  if (posBtn) posBtn.addEventListener('click', function(){
    if (App.modes.current !== 'td') return;
    TD.placing = !TD.placing;
    if (!TD.placing){ TD.buying = null; TD.drag = null; }
    updatePosButton();
  });
  var skipBtn = document.getElementById('skipWaveBtn');
  if (skipBtn) skipBtn.addEventListener('click', function(){
    if (App.modes.current === 'td' && G.GAME.state === 'playing') TD.waveT = 0;
  });

  App.games.register('td', {
    state: TD,
    items: TD_ITEMS,
    label: 'Artificium',
    unit: 'wave',
    dmgStat: 'power',
    update: tdUpdate,
    draw: tdDraw,
    autoBuy: tdAutoBuy,
    onEnter: function(){ if (!TD.path.length) buildPath(); },
    // Only the fields that were actually 0/full get reset when resuming a
    // saved or paused-then-idle run - lives and money are already
    // restored by applyExtra() before this runs, and must not be clobbered.
    resetField: function(g, keepProgress){
      if (!keepProgress) g.lives = G.diff().lives;
      g.killed = 0;
      clearArena(keepProgress);
      tdStartWave();
    },
    afterLevelReset: function(g){ g.money = 260; },
    startExtra: function(g){
      if (!TD.turrets.length){
        var cell = findFreeCell();
        if (cell){ placeTower('cannon', cell.gx, cell.gy, G.itemById(TD, 'cannon').cost); TD.sel = cell; }
      }
      renderShop();
      renderGridInfo();
    },
    serializeExtra: function(g, out){
      out.lives = g.lives;
      out.money = g.money;
      out.towers = TD.turrets.map(function(t){ return { id: t.id, gx: t.gx, gy: t.gy, lv: t.lv, evo: t.evo, spent: t.spent }; });
    },
    applyExtra: function(g, d){
      g.lives = d.lives || G.diff().lives;
      g.money = d.money === undefined ? 180 : d.money;
      if (d.towers){
        g.turrets = d.towers.map(function(t){ return { id: t.id, gx: t.gx, gy: t.gy, lv: t.lv || 1, evo: t.evo || null, spent: t.spent || 0, cd: 0, rot: 0 }; });
      }
    },
    renderShop: renderShop,
    renderGridInfo: renderGridInfo,
    handleKey: function(key, down){
      if (!down) return false;
      if (key >= '1' && key <= '9'){
        var it = TD_ITEMS[parseInt(key, 10) - 1];
        if (it){ buyItem(it.id); renderShop(); }
        return true;
      }
      if (key === 'w' || key === 'a' || key === 's' || key === 'd'){
        if (!TD.sel) TD.sel = { gx: Math.floor(GRID_COLS / 2), gy: Math.floor(GRID_ROWS / 2) };
        if (key === 'a') TD.sel.gx = Math.max(0, TD.sel.gx - 1);
        if (key === 'd') TD.sel.gx = Math.min(GRID_COLS - 1, TD.sel.gx + 1);
        if (key === 'w') TD.sel.gy = Math.max(0, TD.sel.gy - 1);
        if (key === 's') TD.sel.gy = Math.min(GRID_ROWS - 1, TD.sel.gy + 1);
        TD.hover = TD.sel;
        renderGridInfo();
        return true;
      }
      if (key === 'enter'){
        if (TD.buying){ confirmPlace(TD.sel ? TD.sel.gx : 0, TD.sel ? TD.sel.gy : 0); return true; }
        if (TD.sel){ upgradeTower(towerAt(TD.sel.gx, TD.sel.gy)); return true; }
      }
      return false;
    },
    cancelKey: function(){
      if (TD.buying){ TD.buying = null; return true; }
      return false;
    }
  });
})();
