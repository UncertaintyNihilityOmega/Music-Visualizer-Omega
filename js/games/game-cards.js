/* =========================================================================
   CARDS — a turn-based roguelike dungeon crawler.
   Distinct from Survivor's real-time auto-casting: here you actively pick
   one card per turn from a small owned hand, the enemy telegraphs its next
   attack a turn ahead, and you descend a branching dungeon map between
   fights. Shares the level/evolution shape from Survivor's Phase 4 rework
   (spells max 30, evolve at 15; passives max 10) and the shared cast of
   dmgMul/maxLvOf/rollEvolutionChoice from games-shared.js.
   ========================================================================= */
(function(){
  'use strict';
  var G = App.games, Cfg = App.cfg, U = App.util, Can = App.canvas, Aud = App.audio;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var SPELL_MAX = 30, PASSIVE_MAX = 10, EVO_AT = 15;
  var BASE_HP = 60;

  /* ---------- 10 spell cards + 5 passives ---------- */
  var CARD_ITEMS = [
    { id: 'ember',   name: 'Ember Lance',  emoji: '🔥', type: 'spell', color: '#FF7A3D',
      desc: 'A bolt of fire. +3 damage per level. Evolves at 15.', base: 9, per: 3 },
    { id: 'frost',   name: 'Frost Shard',  emoji: '❄️', type: 'spell', color: '#9FE3F0',
      desc: 'Damage, and chills the enemy to weaken its next attack. +2.5 damage per level. Evolves at 15.', base: 7, per: 2.5 },
    { id: 'volt',    name: 'Volt Jolt',    emoji: '⚡', type: 'spell', color: '#F7D046',
      desc: 'Damage with a growing chance to arc for a free second hit. +2.8 damage per level. Evolves at 15.', base: 8, per: 2.8 },
    { id: 'verdant', name: 'Verdant Bite', emoji: '🌿', type: 'spell', color: '#7BD389',
      desc: 'Damage, and heals you for a share of it. +2.6 damage per level. Evolves at 15.', base: 7, per: 2.6 },
    { id: 'stone',   name: 'Stone Fist',   emoji: '👊', type: 'spell', color: '#B79A73',
      desc: 'A heavy blow that also weakens the next incoming attack. +4 damage per level. Evolves at 15.', base: 13, per: 4 },
    { id: 'shadow',  name: 'Shadow Strike',emoji: '🗡️', type: 'spell', color: '#7B4B94',
      desc: 'Damage with a growing crit chance for double damage. +2.9 damage per level. Evolves at 15.', base: 8, per: 2.9 },
    { id: 'holy',    name: 'Holy Light',   emoji: '✨', type: 'spell', color: '#F7E7A6',
      desc: 'Light damage, but heals you generously. +1.8 damage, +1.2 healing per level. Evolves at 15.', base: 5, per: 1.8 },
    { id: 'arcane',  name: 'Arcane Bolt',  emoji: '🔮', type: 'spell', color: '#A78BFA',
      desc: 'Damage that grows with every other spell you own. +2.4 damage per level. Evolves at 15.', base: 6, per: 2.4 },
    { id: 'toxic',   name: 'Toxic Vial',   emoji: '🧪', type: 'spell', color: '#6FCF97',
      desc: 'Applies a poison that ticks for 3 turns. +2.2 damage per level. Evolves at 15.', base: 6, per: 2.2 },
    { id: 'meteor',  name: 'Meteor Call',  emoji: '☄️', type: 'spell', color: '#E4572E',
      desc: 'Calls down a huge impact 2 turns later. +5.2 impact damage per level. Evolves at 15.', base: 0, per: 0 },
    { id: 'vigor',   name: 'Vigor',    emoji: '💗', type: 'passive', color: '#F2A6B8', desc: '+9 max HP per level.' },
    { id: 'focus',   name: 'Focus',    emoji: '🎯', type: 'passive', color: '#FFC857', desc: '+2% card damage per level.' },
    { id: 'ward',    name: 'Ward',     emoji: '🛡️', type: 'passive', color: '#8FB7E0', desc: '-1.1 flat damage taken per level (always at least 1 gets through).' },
    { id: 'momentum',name: 'Momentum', emoji: '👟', type: 'passive', color: '#C9A6F7', desc: '3% chance per level to play a bonus card immediately.' },
    { id: 'fortune', name: 'Fortune',  emoji: '🍀', type: 'passive', color: '#C9E265', desc: '+2% post-victory healing per level.' }
  ];

  var CARD_EVOS = {
    ember: [
      { id: 'inferno',  name: 'Inferno Lance', color: '#FF5A1F', desc: 'Also burns for 60% weapon damage over the next 2 turns.', burnMul: 0.6, burnTurns: 2 },
      { id: 'twin',     name: 'Twin Lance',    color: '#FFA35C', desc: 'Fires twice, each hit at 65% damage.', hits2: true, hitMul: 0.65 },
      { id: 'piercing', name: 'Piercing Lance', color: '#B33A0E', desc: 'Deals 45% more damage to bosses.', bossMul: 1.45 }
    ],
    frost: [
      { id: 'shatter',    name: 'Shatter',    color: '#5FC9E8', desc: 'Deals 60% more damage to an already-chilled enemy.', shatterMul: 1.6 },
      { id: 'permafrost', name: 'Permafrost', color: '#B8EEFB', desc: 'Chill lingers for an extra turn.', chillTurns: 2 },
      { id: 'blizzard',   name: 'Blizzard',   color: '#E3F8FF', desc: 'Freezes an already-chilled enemy, skipping its next turn.', freezeIfChilled: true }
    ],
    volt: [
      { id: 'chainlightning', name: 'Chain Lightning', color: '#FFE066', desc: 'Arc chance is much higher.', arcChanceBonus: 0.3 },
      { id: 'overload',       name: 'Overload',        color: '#FFF3B0', desc: 'The arc hit is now guaranteed.', guaranteedArc: true },
      { id: 'thunderstorm',   name: 'Thunderstorm',    color: '#E0C200', desc: 'The arc hit also chills the enemy.', arcChill: true }
    ],
    verdant: [
      { id: 'bloodroot', name: 'Bloodroot', color: '#4CAF6D', desc: 'Heals for much more of the damage dealt.', lifestealMul: 1.9 },
      { id: 'thornmail', name: 'Thornmail', color: '#8FE0A6', desc: 'Also weakens the next enemy attack.', thornsPct: 0.25 },
      { id: 'overgrowth',name: 'Overgrowth',color: '#B8F2C6', desc: 'Also heals a flat amount on top.', flatHeal: 8 }
    ],
    stone: [
      { id: 'quake',    name: 'Quake',    color: '#8C7350', desc: 'A chance to stun the enemy, skipping its next turn.', stunChance: 0.25 },
      { id: 'bulwark',  name: 'Bulwark',  color: '#D9C7A3', desc: 'Also shields you, absorbing incoming damage.', shield: 10 },
      { id: 'avalanche',name: 'Avalanche',color: '#6B5637', desc: 'Deals 60% more damage to enemies below 25% health.', executeBelowPct: 0.25, executeMul: 1.6 }
    ],
    shadow: [
      { id: 'assassinate', name: 'Assassinate', color: '#5C2D7A', desc: 'Guaranteed crit on enemies below 30% health.', executeCritBelowPct: 0.3 },
      { id: 'backstab',    name: 'Backstab',    color: '#9B6FC2', desc: 'Crit chance is much higher.', critBonus: 0.25 },
      { id: 'nightfall',   name: 'Nightfall',   color: '#3D1F52', desc: 'Crits also heal you a little.', critHeal: 6 }
    ],
    holy: [
      { id: 'radiance', name: 'Radiance', color: '#FFF6D0', desc: 'Healing is much bigger.', healMul: 1.8 },
      { id: 'purify',   name: 'Purify',   color: '#FFE9A0', desc: 'Also weakens the next incoming attack.', reduceIncomingPct: 0.3 },
      { id: 'ascension',name: 'Ascension',color: '#F2D480', desc: 'Both healing and damage are boosted.', healMul: 1.3, dmgMul: 1.3 }
    ],
    arcane: [
      { id: 'arcanesurge', name: 'Arcane Surge', color: '#8B5CF6', desc: 'The bonus from other spells is doubled.', synergyMul: 2 },
      { id: 'mindbreak',   name: 'Mind Break',   color: '#6D28D9', desc: 'Also weakens the incoming attack.', reduceIncomingFlat: 5 },
      { id: 'convergence', name: 'Convergence',  color: '#C4B5FD', desc: 'Also gains a bonus from every passive you own.', passiveSynergy: true }
    ],
    toxic: [
      { id: 'plague',   name: 'Plague',   color: '#4CA36F', desc: 'Reapplying poison stacks it instead of refreshing it.', stacking: true },
      { id: 'necrosis', name: 'Necrosis', color: '#2E7D4F', desc: 'Poisoned enemies deal 20% less damage.', poisonWeaken: 0.2 },
      { id: 'epidemic', name: 'Epidemic', color: '#8FE0B0', desc: 'Poison lasts longer and ticks harder.', durationBonus: 2, tickMul: 1.5 }
    ],
    meteor: [
      { id: 'meteorstorm', name: 'Meteor Storm', color: '#F2653D', desc: 'A second, smaller impact follows the first.', extraImpacts: 1 },
      { id: 'cataclysm',   name: 'Cataclysm',    color: '#C13A17', desc: 'Lands a turn sooner and hits harder.', delayReduction: 1, dmgMul: 1.4 },
      { id: 'worldender',  name: 'World Ender',  color: '#7A1E0A', desc: 'If a Meteor kills, your next one lands instantly.', instantOnKill: true }
    ]
  };

  /* ---------- 20 enemies (4 tiers of 5) + 5 bosses ---------- */
  var ENEMIES = [
    { name: 'Rat Swarm',      emoji: '🐀', hp: 18, dmg: 4,  color: '#8D6E63' },
    { name: 'Cave Bat',       emoji: '🦇', hp: 20, dmg: 5,  color: '#6D5A7C' },
    { name: 'Bog Slime',      emoji: '🟢', hp: 26, dmg: 4,  color: '#6FCF97' },
    { name: 'Goblin Scout',   emoji: '👺', hp: 24, dmg: 6,  color: '#5B8C3A' },
    { name: 'Wild Boar',      emoji: '🐗', hp: 30, dmg: 7,  color: '#7A5230' },
    { name: 'Giant Spider',   emoji: '🕷️', hp: 42, dmg: 9,  color: '#4A3B52' },
    { name: 'Bandit Archer',  emoji: '🏹', hp: 38, dmg: 11, color: '#A0703C' },
    { name: 'Venom Snake',    emoji: '🐍', hp: 46, dmg: 8,  color: '#4E8B4E' },
    { name: 'Restless Skeleton', emoji: '💀', hp: 50, dmg: 10, color: '#C9C4B8' },
    { name: 'Grave Ghoul',    emoji: '🧟', hp: 58, dmg: 12, color: '#6E7A4E' },
    { name: 'Ash Imp',        emoji: '🔥', hp: 70, dmg: 14, color: '#D9622B' },
    { name: 'Frost Wisp',     emoji: '❄️', hp: 66, dmg: 13, color: '#7EC8D9' },
    { name: 'Cursed Owl',     emoji: '🦉', hp: 74, dmg: 15, color: '#7A6647' },
    { name: 'Bog Scorpion',   emoji: '🦂', hp: 82, dmg: 16, color: '#3D3D3D' },
    { name: 'Wailing Shade',  emoji: '🌑', hp: 90, dmg: 17, color: '#332B45' },
    { name: 'Stone Golem',    emoji: '🗿', hp: 130,dmg: 20, color: '#8A8578' },
    { name: 'Storm Elemental',emoji: '⚡', hp: 120,dmg: 24, color: '#4C6FE0' },
    { name: 'Eye Horror',     emoji: '👁️', hp: 140,dmg: 22, color: '#7A2E4C' },
    { name: 'Wyrm Whelp',     emoji: '🐲', hp: 150,dmg: 25, color: '#3D7A4E' },
    { name: 'Death Cultist',  emoji: '🧙', hp: 135,dmg: 23, color: '#4A3B6B' }
  ];
  var BOSSES = [
    { name: 'Bramble Warden',  emoji: '🌳', hp: 240, dmg: 22, color: '#3D6B2E', boss: true },
    { name: 'Crimson Wyrm',    emoji: '🐉', hp: 320, dmg: 28, color: '#A31A1A', boss: true },
    { name: 'The Fallen King', emoji: '👑', hp: 400, dmg: 32, color: '#7A6320', boss: true },
    { name: 'Abyssal Kraken',  emoji: '🦑', hp: 480, dmg: 36, color: '#1F3D5C', boss: true },
    { name: 'The Void Sovereign', emoji: '🌌', hp: 600, dmg: 42, color: '#2B1F4A', boss: true }
  ];

  var CARDS = {
    id: 'cards', level: 1, breaks: 0, lv: null, evo: {}, best: 0, time: 0, state: 'idle',
    hp: BASE_HP, maxHp: BASE_HP, shield: 0,
    phase: 'map', frontier: null, nodeRects: [],
    enemy: null, turn: 'player', turnT: 0,
    handRects: [],
    fx: [], shake: 0, log: '', logT: 0,
    meteors: [], meteorInstantCharge: false,
    rewardEntries: null,
    _autoT: 0
  };
  CARDS.lv = G.blankLevels(CARD_ITEMS);

  function maxLvOf(item){ return item.type === 'passive' ? PASSIVE_MAX : SPELL_MAX; }
  function evoOf(id){
    var chosen = CARDS.evo[id];
    if (!chosen) return null;
    var list = CARD_EVOS[id] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === chosen) return list[i];
    return null;
  }
  function itemDef(id){
    for (var i = 0; i < CARD_ITEMS.length; i++) if (CARD_ITEMS[i].id === id) return CARD_ITEMS[i];
    return null;
  }
  function ownedSpells(){ return CARD_ITEMS.filter(function(it){ return it.type === 'spell' && CARDS.lv[it.id] > 0; }); }
  // Each turn the hand is up to 4 cards dealt at random from the cards owned (GAME-AUDIT C3, the old
  // prompt: "pick from 4 random cards; start with 2"); before 2026-11-19 it showed every card owned.
  var HAND_SIZE = 4;
  function dealHand(){ CARDS.hand = shuffle(ownedSpells()).slice(0, HAND_SIZE).map(function(it){ return it.id; }); }
  function handCards(){
    if (!CARDS.hand || !CARDS.hand.length) dealHand();
    return CARDS.hand.map(itemDef).filter(function(it){ return it && CARDS.lv[it.id] > 0; });
  }
  function startPlayerTurn(){ CARDS.turn = 'player'; dealHand(); }
  function unownedSpells(){ return CARD_ITEMS.filter(function(it){ return it.type === 'spell' && CARDS.lv[it.id] === 0; }); }
  function passiveList(){ return CARD_ITEMS.filter(function(it){ return it.type === 'passive'; }); }
  function recomputeMaxHp(){
    CARDS.maxHp = BASE_HP + CARDS.lv.vigor * 9;
  }

  function grantStartingCards(){
    var spells = CARD_ITEMS.filter(function(it){ return it.type === 'spell'; });
    var picks = shuffle(spells).slice(0, 2);
    for (var i = 0; i < picks.length; i++) CARDS.lv[picks[i].id] = 1;
  }
  function shuffle(arr){
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1)), t = copy[i]; copy[i] = copy[j]; copy[j] = t;
    }
    return copy;
  }
  function pickRandom(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- dungeon map: a 3-tier-deep binary preview from the current depth ---------- */
  function pickEnemyIdx(depth){
    var tier = Math.min(3, Math.floor((depth - 1) / 4));
    var base = tier * 5;
    var i = base + Math.floor(Math.random() * 5);
    return Math.min(19, i);
  }
  function bossIdxFor(depth){
    var count = Math.round(depth / Math.max(1, Cfg.CFG.games.bossEvery));
    return Math.max(0, count - 1) % BOSSES.length;
  }
  function getEnemyDef(node){ return node.boss ? BOSSES[node.enemyIdx] : ENEMIES[node.enemyIdx]; }
  function genSubtree(depth, tiersLeft){
    var isBoss = G.isBossLevel(depth);
    var node = { depth: depth, boss: isBoss, enemyIdx: isBoss ? bossIdxFor(depth) : pickEnemyIdx(depth) };
    node.children = tiersLeft > 0 ? [genSubtree(depth + 1, tiersLeft - 1), genSubtree(depth + 1, tiersLeft - 1)] : null;
    return node;
  }
  function genFrontier(){
    CARDS.frontier = { depth: CARDS.level, children: [genSubtree(CARDS.level, 2), genSubtree(CARDS.level, 2)] };
  }

  function enterNode(node){
    var def = getEnemyDef(node);
    var hp = G.enemyHP(CARDS.level, def);
    CARDS.enemy = {
      def: def, boss: node.boss, hp: hp, maxHp: hp,
      poisonTurns: 0, poisonDmg: 0, poisonStacks: 0, poisonWeaken: 0, poisonTickMul: 1,
      burnTurns: 0, burnDmg: 0,
      chillPct: 0, chillTurns: 0, wasChilled: false,
      stunned: false, frozen: false, nextDmg: 0, nextDmgMulIncoming: 1,
      x: 0, y: 0, hitT: 0
    };
    telegraphNext();
    CARDS.phase = 'battle';
    startPlayerTurn();
    setLog((node.boss ? 'Boss: ' : 'A ') + def.name + ' appears!');
  }
  function telegraphNext(){
    var e = CARDS.enemy;
    e.nextDmg = G.enemyDmg(CARDS.level, e.def) * (0.85 + Math.random() * 0.3);
  }

  function setLog(msg){ CARDS.log = msg; CARDS.logT = 2.6; }
  function spawnFX(x, y, text, color){
    CARDS.fx.push({ x: x, y: y, text: text, color: color, life: 1, age: 0 });
    if (CARDS.fx.length > 24) CARDS.fx.shift();
  }
  function healPlayer(amount){
    CARDS.hp = Math.min(CARDS.maxHp, CARDS.hp + amount);
  }

  /* ---------- combat ---------- */
  function cardLevelDmg(card, lv){ return card.base + card.per * (lv - 1); }
  function countOwnedSpells(){ return ownedSpells().length; }
  function countOwnedPassives(){
    var n = 0, pl = passiveList();
    for (var i = 0; i < pl.length; i++) if (CARDS.lv[pl[i].id] > 0) n++;
    return n;
  }

  function applyDamageToEnemy(dmg, tag){
    var e = CARDS.enemy;
    dmg = Math.max(0, dmg);
    e.hp = Math.max(0, e.hp - dmg);
    e.hitT = 0.3;
    CARDS.shake = Math.min(1, CARDS.shake + Math.min(0.5, dmg / (e.maxHp || 1)));
    spawnFX(e.x, e.y - 14, '-' + Math.round(dmg), tag === 'heal' ? '#7BD389' : '#FFE5A6');
  }

  function castCard(card){
    var lv = CARDS.lv[card.id];
    var ev = evoOf(card.id);
    var e = CARDS.enemy;
    var mul = G.dmgMul(CARDS);

    if (card.id === 'meteor'){
      var impact = (20 + 5.2 * (lv - 1)) * mul * (ev && ev.dmgMul ? ev.dmgMul : 1);
      var delay = CARDS.meteorInstantCharge ? 0 : (2 - (ev && ev.delayReduction ? ev.delayReduction : 0));
      CARDS.meteorInstantCharge = false;
      CARDS.meteors.push({ turnsLeft: delay, dmg: impact, extra: ev && ev.extraImpacts ? ev.extraImpacts : 0, instantOnKill: !!(ev && ev.instantOnKill) });
      setLog(delay <= 0 ? 'Meteor strikes instantly!' : 'Meteor Call queued.');
      if (delay <= 0) processMeteors();
    } else {
      var dmg = cardLevelDmg(card, lv) * mul;
      if (ev && ev.dmgMul) dmg *= ev.dmgMul;
      if (ev && ev.bossMul && e.boss) dmg *= ev.bossMul;

      if (card.id === 'frost'){
        var wasChilled = e.chillTurns > 0;
        if (ev && ev.shatterMul && wasChilled) dmg *= ev.shatterMul;
        if (ev && ev.freezeIfChilled && wasChilled) e.frozen = true;
        e.chillPct = Math.min(0.55, 0.12 + lv * 0.013);
        e.chillTurns = ev && ev.chillTurns ? ev.chillTurns : 1;
      }
      applyDamageToEnemy(dmg, card.id);
      if (card.id === 'ember' && ev && ev.burnMul){ e.burnDmg = (dmg * ev.burnMul) / (ev.burnTurns || 2); e.burnTurns = ev.burnTurns || 2; }
      if (card.id === 'ember' && ev && ev.hits2) applyDamageToEnemy(dmg * (ev.hitMul || 0.65), card.id);

      if (card.id === 'volt'){
        var arcChance = Math.min(0.85, 0.05 + lv * 0.012) + (ev && ev.arcChanceBonus ? ev.arcChanceBonus : 0);
        if ((ev && ev.guaranteedArc) || Math.random() < arcChance){
          applyDamageToEnemy(dmg * 0.5, card.id);
          if (ev && ev.arcChill){ e.chillPct = Math.max(e.chillPct, 0.2); e.chillTurns = Math.max(e.chillTurns, 1); }
          setLog('Arc!');
        }
      }
      if (card.id === 'shadow'){
        var critChance = Math.min(0.7, 0.08 + lv * 0.01) + (ev && ev.critBonus ? ev.critBonus : 0);
        var lowHp = e.hp / e.maxHp < (ev && ev.executeCritBelowPct !== undefined ? ev.executeCritBelowPct : -1);
        if (lowHp || Math.random() < critChance){
          applyDamageToEnemy(dmg, card.id);
          setLog('Critical hit!');
          if (ev && ev.critHeal) healPlayer(ev.critHeal);
        }
      }
      if (card.id === 'stone'){
        e.nextDmgMulIncoming *= 0.7;
        if (ev && ev.stunChance && Math.random() < ev.stunChance) e.stunned = true;
        if (ev && ev.shield) CARDS.shield += ev.shield;
        if (ev && ev.executeBelowPct && e.hp / e.maxHp < ev.executeBelowPct) applyDamageToEnemy(dmg * (ev.executeMul - 1), card.id);
      }
      if (card.id === 'verdant'){
        var healPct = 0.3 * (ev && ev.lifestealMul ? ev.lifestealMul : 1);
        healPlayer(dmg * healPct + (ev && ev.flatHeal ? ev.flatHeal : 0));
        if (ev && ev.thornsPct) e.nextDmgMulIncoming *= (1 - ev.thornsPct);
      }
      if (card.id === 'holy'){
        var heal = (10 + lv * 1.2) * (ev && ev.healMul ? ev.healMul : 1);
        healPlayer(heal);
        if (ev && ev.reduceIncomingPct) e.nextDmgMulIncoming *= (1 - ev.reduceIncomingPct);
      }
      if (card.id === 'arcane'){
        var owned = Math.max(0, countOwnedSpells() - 1);
        var synergyMul = ev && ev.synergyMul ? ev.synergyMul : 1;
        var bonus = owned * 1.5 * synergyMul * mul;
        if (ev && ev.passiveSynergy) bonus += countOwnedPassives() * 1.2 * mul;
        if (bonus > 0) applyDamageToEnemy(bonus, card.id);
        if (ev && ev.reduceIncomingFlat) e.nextDmg = Math.max(0, e.nextDmg - ev.reduceIncomingFlat);
      }
      if (card.id === 'toxic'){
        var pdmg = 3 + lv * 0.4;
        if (e.poisonTurns > 0 && ev && ev.stacking) e.poisonStacks = (e.poisonStacks || 1) + 1;
        else e.poisonStacks = 1;
        e.poisonDmg = pdmg;
        e.poisonTurns = 3 + (ev && ev.durationBonus ? ev.durationBonus : 0);
        e.poisonWeaken = ev && ev.poisonWeaken ? ev.poisonWeaken : 0;
        e.poisonTickMul = ev && ev.tickMul ? ev.tickMul : 1;
      }
    }
    CARDS.turn = 'resolving';
    CARDS.turnT = 0.45;
  }

  function processMeteors(){
    var e = CARDS.enemy;
    for (var i = CARDS.meteors.length - 1; i >= 0; i--){
      var m = CARDS.meteors[i];
      m.turnsLeft--;
      if (m.turnsLeft <= 0){
        CARDS.meteors.splice(i, 1);
        applyDamageToEnemy(m.dmg, 'meteor');
        if (e.hp <= 0 && m.instantOnKill) CARDS.meteorInstantCharge = true;
        if (m.extra > 0) CARDS.meteors.push({ turnsLeft: 1, dmg: m.dmg * 0.6, extra: m.extra - 1, instantOnKill: m.instantOnKill });
      }
    }
  }

  function afterPlayerAction(){
    var e = CARDS.enemy;
    if (!e || e.hp <= 0){ handleWin(); return; }
    if (Math.random() < CARDS.lv.momentum * 0.03){
      setLog('Momentum! Play again.');
      startPlayerTurn();
      return;
    }
    CARDS.turn = 'enemyResolving';
    CARDS.turnT = 0.5;
  }

  function resolveEnemyTurn(){
    var e = CARDS.enemy;
    if (e.poisonTurns > 0){
      var pd = e.poisonDmg * (e.poisonStacks || 1) * (e.poisonTickMul || 1);
      applyDamageToEnemy(pd, 'poison');
      e.poisonTurns--;
    }
    if (e.burnTurns > 0){
      applyDamageToEnemy(e.burnDmg, 'burn');
      e.burnTurns--;
    }
    if (e.hp <= 0){ handleWin(); return; }
    if (e.stunned || e.frozen){
      setLog((e.stunned ? 'Stunned' : 'Frozen') + ' - the enemy loses its turn.');
      e.stunned = false; e.frozen = false;
      telegraphNext();
      startPlayerTurn();
      processMeteors();
      if (CARDS.enemy && CARDS.enemy.hp <= 0) handleWin();
      return;
    }
    var weaken = e.poisonTurns > 0 || e.poisonWeaken ? (1 - (e.poisonWeaken || 0)) : 1;
    var incoming = e.nextDmg * e.nextDmgMulIncoming * (1 - (e.chillPct || 0)) * weaken;
    e.chillPct = 0;
    e.nextDmgMulIncoming = 1;
    var reduced = Math.max(1, incoming - CARDS.lv.ward * 1.1);
    if (CARDS.shield > 0){
      var absorb = Math.min(CARDS.shield, reduced);
      CARDS.shield -= absorb;
      reduced -= absorb;
    }
    CARDS.hp = Math.max(0, CARDS.hp - reduced);
    spawnFX(canvas.width / 2, canvas.height * 0.42, '-' + Math.round(reduced), '#EF6F6C');
    CARDS.shake = Math.min(1, CARDS.shake + 0.5);
    if (CARDS.hp <= 0){ G.gameOver(CARDS); return; }
    telegraphNext();
    startPlayerTurn();
    processMeteors();
    if (CARDS.enemy && CARDS.enemy.hp <= 0) handleWin();
  }

  function handleWin(){
    var healPct = 0.22 + CARDS.lv.fortune * 0.02;
    healPlayer(CARDS.maxHp * healPct);
    setLog('Victory!');
    CARDS.enemy = null;
    CARDS.level++;
    renderGridInfo();
    rollCardReward();
  }

  /* ---------- post-victory reward: new card / level-up / passive, 1 of up to 3 ---------- */
  function rollCardReward(){
    var entries = [];
    var unowned = unownedSpells();
    if (unowned.length){
      var offerPool = shuffle(unowned).slice(0, Math.min(4, unowned.length));
      var newCard = pickRandom(offerPool);
      entries.push({ id: 'new:' + newCard.id, name: newCard.name, desc: newCard.desc, color: newCard.color, emoji: newCard.emoji, tag: 'NEW CARD',
        apply: function(){ CARDS.lv[newCard.id] = 1; } });
    }
    var leveled = ownedSpells().filter(function(it){ return CARDS.lv[it.id] < SPELL_MAX; });
    if (leveled.length){
      var lvCard = pickRandom(leveled);
      entries.push({ id: 'lvl:' + lvCard.id, name: lvCard.name, desc: lvCard.desc, color: lvCard.color, emoji: lvCard.emoji, tag: 'LEVEL UP',
        apply: function(){
          var nlv = Math.min(SPELL_MAX, CARDS.lv[lvCard.id] + 1);
          CARDS.lv[lvCard.id] = nlv;
          if (nlv === EVO_AT && !CARDS.evo[lvCard.id] && CARD_EVOS[lvCard.id]){
            G.rollEvolutionChoice(CARD_EVOS[lvCard.id], function(id){ CARDS.evo[lvCard.id] = id; renderShop(); }, lvCard.emoji);
          }
        } });
    }
    var passives = passiveList().filter(function(it){ return CARDS.lv[it.id] < PASSIVE_MAX; });
    if (passives.length){
      var pCard = pickRandom(passives);
      entries.push({ id: 'pass:' + pCard.id, name: pCard.name, desc: pCard.desc, color: pCard.color, emoji: pCard.emoji, tag: 'PASSIVE',
        apply: function(){ CARDS.lv[pCard.id] = Math.min(PASSIVE_MAX, CARDS.lv[pCard.id] + 1); recomputeMaxHp(); } });
    }
    if (!entries.length){
      CARDS.breaks++;
      G.GAME.banner = 'LEVEL BREAK  +1% damage  (x' + CARDS.breaks + ')';
      G.GAME.bannerT = 2.4;
      CARDS.phase = 'reward-done';
      return;
    }
    entries = shuffle(entries).slice(0, Math.min(3, entries.length));
    CARDS.rewardEntries = entries;
    CARDS.phase = 'reward';
    G.GAME.cards = entries.map(function(e){ return { id: e.id, name: e.name, desc: e.desc, color: e.color, emoji: e.emoji, tag: e.tag, evo: true }; });
    G.GAME.cardRects = [];
    if (Cfg.CFG.games.autoUpgrade) pickRewardCard(Math.floor(Math.random() * entries.length));
  }
  function pickRewardCard(n){
    if (CARDS.phase !== 'reward' || !CARDS.rewardEntries) return;
    var entry = CARDS.rewardEntries[n];
    if (!entry) return;
    entry.apply();
    CARDS.rewardEntries = null;
    if (G.GAME.state !== 'choosing'){
      // apply() did not open a nested evolution-choice screen (GAME.cards is
      // still ours to clear) - safe to clear and head back to the map.
      G.GAME.cards = [];
      G.GAME.cardRects = [];
      CARDS.phase = 'map';
      genFrontier();
    } else {
      // apply() called G.rollEvolutionChoice itself (a level-up crossed 15),
      // which already populated GAME.cards with the evolution options -
      // leave it alone, the shared 'choosing' flow now owns the screen.
      CARDS.phase = 'reward-wait-evo';
    }
    renderShop();
    renderGridInfo();
  }

  /* ---------- per-frame update ---------- */
  function update(dt){
    CARDS.time += dt;
    CARDS.shake = Math.max(0, CARDS.shake - dt * 2.4);
    if (CARDS.logT > 0) CARDS.logT -= dt;
    for (var i = CARDS.fx.length - 1; i >= 0; i--){
      var f = CARDS.fx[i];
      f.age += dt;
      if (f.age > f.life) CARDS.fx.splice(i, 1);
    }
    if (CARDS.phase === 'reward-wait-evo' && G.GAME.state === 'playing'){
      CARDS.phase = 'map';
      genFrontier();
    }
    if (CARDS.phase === 'reward-done' && G.GAME.state === 'playing'){
      CARDS.phase = 'map';
      genFrontier();
    }
    if (CARDS.phase !== 'battle' || !CARDS.enemy) return;
    if (CARDS.turn === 'resolving'){
      CARDS.turnT -= dt;
      if (CARDS.turnT <= 0) afterPlayerAction();
    } else if (CARDS.turn === 'enemyResolving'){
      CARDS.turnT -= dt;
      if (CARDS.turnT <= 0) resolveEnemyTurn();
    }
  }

  /* ---------- drawing ---------- */
  function layout(w, h, k){
    var handH = Math.max(h * 0.24, 90 * k);
    return { arenaH: h - handH, handY: h - handH, handH: handH };
  }
  /* ---------- the chamber (ROADMAP item 16, the design pass) ----------
     A stone-brick wall and a flagstone floor, drawn once per size and
     copied; two wall torches whose flames grow with the music (small in a
     quiet passage, tall in a big one); in a fight, a warm ring of sound
     bars round the enemy. Before it: the shared plain game backdrop. */
  var roomCv = null, roomKey = '';
  function roomImage(w, h, floorY, k){
    var key = w + 'x' + h + '|' + Math.round(floorY);
    if (roomCv && roomKey === key) return roomCv;
    roomCv = roomCv || document.createElement('canvas');
    roomCv.width = w; roomCv.height = h; roomKey = key;
    var c = roomCv.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1B1526'); g.addColorStop(1, '#0D0A13');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // bricks: rows offset by half a brick, each a little lighter or darker (the same every time)
    var bh = 15 * k, bw = 38 * k, seed = 7;
    function rnd(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var row = 0, y = 0; y < floorY; row++, y += bh){
      for (var x = (row % 2) ? -bw / 2 : 0; x < w; x += bw){
        var l = 12 + rnd() * 7;
        c.fillStyle = 'hsl(258,14%,' + l.toFixed(1) + '%)';
        U.roundRect(c, x + k, y + k, bw - 2 * k, bh - 2 * k, 2.5 * k); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.045)';
        c.fillRect(x + 2 * k, y + k, bw - 4 * k, Math.max(1, k));
      }
    }
    // the floor: flagstones running toward the back wall
    if (floorY < h){
      var fg = c.createLinearGradient(0, floorY, 0, h);
      fg.addColorStop(0, '#2B2233'); fg.addColorStop(1, '#130F1A');
      c.fillStyle = fg; c.fillRect(0, floorY, w, h - floorY);
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = Math.max(1, k);
      c.beginPath();
      for (var i = -6; i <= 6; i++){ c.moveTo(w / 2 + i * w * 0.05, floorY); c.lineTo(w / 2 + i * w * 0.2, h); }
      for (var j = 1; j < 4; j++){ var fy = floorY + (h - floorY) * (j * j) / 16; c.moveTo(0, fy); c.lineTo(w, fy); }
      c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, floorY - 2 * k, w, 3 * k);
    }
    var v = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.2, w / 2, h * 0.45, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
    return roomCv;
  }
  function drawTorch(x, y, k){
    var mo = Cfg.CFG.look.motion, life = 0.35 + 0.65 * Math.max(A.drive, A.level * 0.8);
    var glow = ctx.createRadialGradient(x, y - 6 * k, 2 * k, x, y - 6 * k, 70 * k);
    glow.addColorStop(0, 'rgba(255,170,90,' + (0.16 + 0.16 * life).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 70 * k, y - 76 * k, 140 * k, 140 * k);
    ctx.fillStyle = '#3A2C22'; ctx.fillRect(x - 3 * k, y, 6 * k, 14 * k);
    ctx.fillStyle = '#58412F'; ctx.fillRect(x - 6 * k, y - 2 * k, 12 * k, 4 * k);
    var fl = (7 + 13 * life + A.punch * 5) * k * (1 + 0.12 * Math.sin(A.t * 11 * mo + x));
    var layers = [['#C2401F', 1, 1], ['#F28A2E', 0.72, 0.8], ['#FFE08A', 0.42, 0.55]];
    for (var i = 0; i < layers.length; i++){
      var L = layers[i], fh = fl * L[1], fw = 5.5 * k * L[2];
      ctx.fillStyle = L[0];
      ctx.beginPath();
      ctx.moveTo(x - fw, y - 2 * k);
      ctx.quadraticCurveTo(x - fw * 1.1, y - fh * 0.55, x + Math.sin(A.t * 7 * mo + i) * 1.5 * k, y - 2 * k - fh);
      ctx.quadraticCurveTo(x + fw * 1.1, y - fh * 0.55, x + fw, y - 2 * k);
      ctx.fill();
    }
  }
  function drawRoom(w, h, floorY, k){
    ctx.drawImage(roomImage(w, h, floorY, k), 0, 0);
    var ty = Math.min(floorY * 0.42, 70 * k);
    drawTorch(w * 0.14, ty, k);
    drawTorch(w * 0.86, ty, k);
  }
  // the sound round the enemy: warm bars, short and dim in a quiet passage
  function drawSoundRing(cx, cy, base, k){
    var bars = 56, m = Math.min(base * 0.9, 60 * k);
    ctx.lineWidth = Math.max(1.5, (6.283 * base / bars) * 0.5);
    ctx.lineCap = 'round';
    for (var i = 0; i < bars; i++){
      var f = i / bars, v = Aud.specAt(f < 0.5 ? f * 2 : (1 - f) * 2), a = f * 6.283 - Math.PI / 2;
      ctx.strokeStyle = 'rgba(255,190,120,' + (0.06 + v * 0.38).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * base, cy + Math.sin(a) * base);
      ctx.lineTo(cx + Math.cos(a) * (base + v * m), cy + Math.sin(a) * (base + v * m));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  function drawHPBar(x, y, w, h, frac, k){
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    U.roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    if (frac > 0.5){ g.addColorStop(0, '#5FCB7A'); g.addColorStop(1, '#8FE0A6'); }
    else if (frac > 0.25){ g.addColorStop(0, '#E8B44D'); g.addColorStop(1, '#F7D046'); }
    else { g.addColorStop(0, '#D9453D'); g.addColorStop(1, '#EF6F6C'); }
    ctx.fillStyle = g;
    U.roundRect(ctx, x, y, w * U.clamp01(frac), h, h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1, k);
    U.roundRect(ctx, x, y, w, h, h / 2); ctx.stroke();
  }

  function drawNode(x, y, node, selectable, tier, k){
    var def = getEnemyDef(node);
    var r = (selectable ? 24 : 18 - tier * 2) * k;
    var pulse = selectable ? (1 + Math.sin(A.t * 3) * 0.06 + A.punch * 0.1) : 1;
    r *= pulse;
    var alpha = selectable ? 1 : Math.max(0.35, 0.75 - tier * 0.16);
    ctx.save();
    ctx.globalAlpha = alpha;
    var grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    if (node.boss){ grad.addColorStop(0, '#FFE29A'); grad.addColorStop(1, '#8A5A1E'); }
    else { grad.addColorStop(0, U.rgba(U.hexRGB(def.color), 1)); grad.addColorStop(1, U.rgba(U.hexRGB(def.color), 0.55)); }
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6 * k;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = node.boss ? 'rgba(255,214,102,0.9)' : (selectable ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)');
    ctx.lineWidth = (node.boss ? 2.4 : 1.4) * k;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke();
    Can.stampEmoji(Can.getEmojiSprite(def.emoji), x, y, 0, r * 1.15, 1);
    ctx.restore();
  }

  function drawMap(w, h, k){
    Can.backdrop(1);
    drawRoom(w, h, h, k);
    ctx.fillStyle = 'rgba(8,6,14,0.35)';          // a little darker, so the paths read
    ctx.fillRect(0, 0, w, h);
    var f = CARDS.frontier;
    if (!f) return;
    var tier1 = f.children;
    var tier2 = [], tier3 = [];
    tier1.forEach(function(n){ tier2.push(n.children[0], n.children[1]); });
    tier2.forEach(function(n){ tier3.push(n.children[0], n.children[1]); });
    var tiers = [[{ you: true }], tier1, tier2, tier3];
    var rowY = [h * 0.17, h * 0.38, h * 0.58, h * 0.79];
    var positions = [[], [], [], []];
    for (var t = 0; t < 4; t++){
      var n = tiers[t].length;
      for (var i = 0; i < n; i++) positions[t].push({ x: w * (i + 1) / (n + 1), y: rowY[t] });
    }
    ctx.strokeStyle = 'rgba(255,200,140,0.35)';     // torch-lit trails between the rooms
    ctx.lineWidth = 1.8 * k;
    ctx.setLineDash([4 * k, 5 * k]);
    for (t = 1; t < 4; t++){
      for (i = 0; i < tiers[t].length; i++){
        var pp = positions[t - 1][Math.floor(i / 2)], cp = positions[t][i];
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y);
        ctx.bezierCurveTo(pp.x, (pp.y + cp.y) / 2, cp.x, (pp.y + cp.y) / 2, cp.x, cp.y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    CARDS.nodeRects = [];
    for (t = 0; t < 4; t++){
      for (i = 0; i < tiers[t].length; i++){
        var pos = positions[t][i], node = tiers[t][i];
        if (node.you){
          ctx.save();
          var yg = ctx.createRadialGradient(pos.x - 6 * k, pos.y - 6 * k, 2 * k, pos.x, pos.y, 20 * k);
          yg.addColorStop(0, '#FFE9A8');
          yg.addColorStop(1, '#C9A24A');
          ctx.fillStyle = yg;
          ctx.shadowColor = 'rgba(255,214,102,0.6)';
          ctx.shadowBlur = 10 * k;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 20 * k, 0, 6.283); ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.6 * k;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, 20 * k, 0, 6.283); ctx.stroke();
          Can.stampEmoji(Can.getEmojiSprite('🧭'), pos.x, pos.y, 0, 20 * k, 1);
          ctx.restore();
          continue;
        }
        var selectable = (t === 1);
        drawNode(pos.x, pos.y, node, selectable, t, k);
        if (selectable) CARDS.nodeRects.push({ x: pos.x, y: pos.y, r: 30 * k, node: node });
      }
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = 'bold ' + (13 * k) + 'px Karla, sans-serif';
    ctx.fillStyle = '#EAF2FF';
    ctx.fillText('Dungeon level ' + CARDS.level + '  -  tap a path', w / 2, 8 * k);
    drawHPBar(w * 0.28, h * 0.92, w * 0.44, 12 * k, CARDS.hp / CARDS.maxHp, k);
    ctx.font = (10.5 * k) + 'px Karla, sans-serif';
    ctx.fillStyle = '#EAF2FF';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(CARDS.hp) + ' / ' + Math.round(CARDS.maxHp) + ' HP', w * 0.28 + w * 0.44 + 8 * k, h * 0.92 + 6 * k);
  }

  function drawBattle(w, h, k){
    var lay = layout(w, h, k);
    Can.backdrop(1);
    var e = CARDS.enemy;
    var sx = (Math.random() - 0.5) * CARDS.shake * 8 * k, sy = (Math.random() - 0.5) * CARDS.shake * 8 * k;
    ctx.save();
    ctx.translate(sx, sy);
    var cx = w / 2;
    var rad = Math.min(46 * k, lay.arenaH * 0.22, w * 0.15);
    var minCy = rad + 36 * k, maxCy = Math.max(minCy, lay.arenaH - rad - 26 * k);
    var cy = Math.max(minCy, Math.min(maxCy, lay.arenaH * 0.52));
    e.x = cx; e.y = cy;
    ctx.restore();
    drawRoom(w, h, Math.min(lay.arenaH, cy + rad * 0.95), k);
    drawSoundRing(cx, cy, rad * 1.45, k);
    ctx.save();
    ctx.translate(sx, sy);
    // its shadow on the floor, and a golden ring under a boss
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(cx, cy + rad * 0.95, rad * 0.95, rad * 0.22, 0, 0, 6.283); ctx.fill();
    if (e.boss){
      ctx.strokeStyle = 'rgba(255,214,102,' + (0.45 + A.punch * 0.4).toFixed(3) + ')';
      ctx.lineWidth = 2 * k;
      ctx.beginPath(); ctx.ellipse(cx, cy + rad * 0.95, rad * 1.1, rad * 0.28, 0, 0, 6.283); ctx.stroke();
    }
    var glow = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad * 1.9);
    glow.addColorStop(0, U.rgba(U.hexRGB(e.def.color), 0.35));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, rad * 1.9, 0, 6.283); ctx.fill();
    var bump = 1 + (e.hitT > 0 ? e.hitT * 0.5 : 0);
    Can.stampEmoji(Can.getEmojiSprite(e.def.emoji), cx, cy, 0, rad * bump, 1);
    if (e.hitT > 0) e.hitT -= A.dt;
    if (e.chillTurns > 0) drawBadge(cx - rad * 0.75, cy - rad * 0.85, '❄️', k);
    if (e.poisonTurns > 0) drawBadge(cx, cy - rad * 1.05, '🧪', k);
    if (e.burnTurns > 0) drawBadge(cx + rad * 0.75, cy - rad * 0.85, '🔥', k);
    drawHPBar(cx - 70 * k, cy - rad - 22 * k, 140 * k, 8 * k, e.hp / e.maxHp, k);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = 'bold ' + (11 * k) + 'px Karla, sans-serif';
    ctx.fillStyle = '#EAF2FF';
    ctx.fillText((e.boss ? '👑 ' : '') + e.def.name, cx, cy - rad - 26 * k);
    if (CARDS.turn === 'player' || CARDS.turn === 'resolving'){
      ctx.font = (10.5 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(255,180,180,0.9)';
      ctx.textBaseline = 'top';
      ctx.fillText('incoming: ⚔ ' + Math.round(e.nextDmg * e.nextDmgMulIncoming * (1 - (e.chillPct || 0))), cx, cy + rad + 12 * k);
    }
    for (var i = 0; i < CARDS.fx.length; i++){
      var f = CARDS.fx[i], t = f.age / f.life;
      ctx.globalAlpha = 1 - t;
      ctx.font = 'bold ' + (13 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - t * 26 * k);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // your bar stops short of the "incoming" line under the enemy (on a phone they ran into each other)
    var barW = Math.max(60 * k, Math.min(w * 0.4, cx - 16 * k - 62 * k));
    drawHPBar(16 * k, lay.arenaH - 20 * k, barW, 11 * k, CARDS.hp / CARDS.maxHp, k);
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.font = (10.5 * k) + 'px Karla, sans-serif';
    ctx.fillStyle = '#EAF2FF';
    ctx.fillText('You: ' + Math.round(CARDS.hp) + '/' + Math.round(CARDS.maxHp) + (CARDS.shield > 0 ? '  🛡' + Math.round(CARDS.shield) : ''), 16 * k, lay.arenaH - 24 * k);

    if (CARDS.logT > 0){
      ctx.font = 'bold ' + (12 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(255,230,180,' + Math.min(1, CARDS.logT) + ')';
      // at the top, unless the enemy's name is up there (a short picture, as on a phone): then at the left
      if (cy - rad - 26 * k - 14 * k > 8 * k + 14 * k){
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(CARDS.log, w / 2, 8 * k);
      } else {
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(CARDS.log, 16 * k, cy - 14 * k, Math.max(40 * k, cx - rad - 30 * k));
      }
    }
    drawHand(w, lay, k);
  }
  function drawBadge(x, y, emoji, k){
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(x, y, 10 * k, 0, 6.283); ctx.fill();
    ctx.font = (12 * k) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
    ctx.restore();
  }

  function drawHand(w, lay, k){
    var hand = handCards();
    var tray = ctx.createLinearGradient(0, lay.handY, 0, lay.handY + lay.handH);
    tray.addColorStop(0, 'rgba(30,22,40,0.94)'); tray.addColorStop(1, 'rgba(12,9,18,0.97)');
    ctx.fillStyle = tray;
    ctx.fillRect(0, lay.handY, w, lay.handH);
    ctx.fillStyle = 'rgba(255,200,140,0.18)';
    ctx.fillRect(0, lay.handY, w, Math.max(1, k));
    var interactive = CARDS.turn === 'player';
    var n = hand.length;
    var cols = Math.min(n, 5) || 1;
    var rows = n > 5 ? 2 : 1;
    var cw = Math.min(w / cols - 6 * k, 96 * k), ch = Math.min(lay.handH / rows - 8 * k, 66 * k);
    CARDS.handRects = [];
    for (var i = 0; i < n; i++){
      var col = i % cols, row = Math.floor(i / cols);
      var rowCount = Math.min(cols, n - row * cols);
      var totalW = rowCount * cw + (rowCount - 1) * 6 * k;
      var x = w / 2 - totalW / 2 + col * (cw + 6 * k);
      var y = lay.handY + 4 * k + row * (ch + 4 * k);
      var card = hand[i], lv = CARDS.lv[card.id], ev = evoOf(card.id);
      CARDS.handRects.push({ x: x, y: y, w: cw, h: ch, card: card });
      ctx.save();
      ctx.globalAlpha = interactive ? 1 : 0.55;
      // the card: its colour washing down from the top, a brighter frame (gold once evolved)
      var rgb = U.hexRGB(card.color), cg = ctx.createLinearGradient(0, y, 0, y + ch);
      cg.addColorStop(0, U.rgba(rgb, '0.42')); cg.addColorStop(0.55, 'rgba(26,20,36,0.96)'); cg.addColorStop(1, 'rgba(14,10,20,0.98)');
      ctx.fillStyle = cg;
      U.roundRect(ctx, x, y, cw, ch, 8 * k); ctx.fill();
      ctx.strokeStyle = ev ? '#FFD666' : U.rgba(rgb, '0.95');
      ctx.lineWidth = (ev ? 2 : 1.6) * k;
      U.roundRect(ctx, x, y, cw, ch, 8 * k); ctx.stroke();
      // the emoji in a round window
      var ex = x + cw / 2, ey = y + ch * 0.34, er = Math.min(ch * 0.24, cw * 0.22);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.283); ctx.fill();
      ctx.strokeStyle = U.rgba(rgb, '0.6'); ctx.lineWidth = Math.max(1, k);
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.283); ctx.stroke();
      Can.stampEmoji(Can.getEmojiSprite(card.emoji), ex, ey, 0, er * 1.15, 1);
      // its key number in a small badge
      var br = 6.5 * k;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.arc(x + br + 3 * k, y + br + 3 * k, br, 0, 6.283); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + (8 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(String(i + 1), x + br + 3 * k, y + br + 3 * k + 0.5 * k);
      ctx.font = 'bold ' + (8.6 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = '#F4EEFF';
      ctx.fillText((ev ? '✦ ' : '') + (ev ? ev.name : card.name), x + cw / 2, y + ch * 0.7, cw * 0.92);
      ctx.font = (7.6 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(244,238,255,0.65)';
      ctx.fillText('Lv ' + lv, x + cw / 2, y + ch * 0.87);
      ctx.restore();
    }
    if (!n){
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = (11 * k) + 'px Karla, sans-serif';
      ctx.fillStyle = 'rgba(234,242,255,0.7)';
      ctx.fillText('No cards yet - win a fight to find one', w / 2, lay.handY + lay.handH / 2);
    }
  }

  function draw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    if (CARDS.phase === 'battle' && CARDS.enemy) drawBattle(w, h, k);
    else drawMap(w, h, k);
    if (CARDS.phase === 'reward' || CARDS.phase === 'reward-wait-evo') G.drawCards(k);
  }

  /* ---------- input ---------- */
  function tryPlayCard(n){
    if (CARDS.phase !== 'battle' || CARDS.turn !== 'player') return false;
    var r = CARDS.handRects[n];
    if (!r) return false;
    castCard(r.card);
    return true;
  }
  function tryTapNode(idx){
    if (CARDS.phase !== 'map') return false;
    var r = CARDS.nodeRects[idx];
    if (!r) return false;
    enterNode(r.node);
    return true;
  }

  // Registered ahead of games-host.js's own shared pointerdown listener on
  // this same canvas. pickRewardCard() can synchronously flip GAME.state to
  // 'choosing' (a level-up crossing 15 opens a nested evolution pick) - if
  // that shared listener then also ran for this same physical click, it
  // would immediately re-interpret the click against the (stale, this-frame)
  // GAME.cardRects and silently auto-pick an evolution. stopImmediatePropagation
  // once we've actually consumed a click keeps every action a single, clean event.
  canvas.addEventListener('pointerdown', function(ev){
    if (App.modes.current !== 'cards' || G.GAME.state !== 'playing') return;
    var pt = App.taps.canvasPoint(ev);
    if (CARDS.phase === 'reward'){
      for (var i = 0; i < G.GAME.cardRects.length; i++){
        var r = G.GAME.cardRects[i];
        if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h){ ev.stopImmediatePropagation(); pickRewardCard(i); return; }
      }
      return;
    }
    if (CARDS.phase === 'map'){
      for (var j = 0; j < CARDS.nodeRects.length; j++){
        var n = CARDS.nodeRects[j];
        var dx = pt.x - n.x, dy = pt.y - n.y;
        if (dx * dx + dy * dy <= n.r * n.r * 2.2){ ev.stopImmediatePropagation(); enterNode(n.node); return; }
      }
      return;
    }
    if (CARDS.phase === 'battle' && CARDS.turn === 'player'){
      for (var i2 = 0; i2 < CARDS.handRects.length; i2++){
        var hr = CARDS.handRects[i2];
        if (pt.x >= hr.x && pt.x <= hr.x + hr.w && pt.y >= hr.y && pt.y <= hr.y + hr.h){ ev.stopImmediatePropagation(); castCard(hr.card); return; }
      }
    }
  });

  function autoBuy(){
    if (CARDS.phase === 'map' && CARDS.nodeRects.length) enterNode(pickRandom(CARDS.nodeRects).node);
    else if (CARDS.phase === 'battle' && CARDS.turn === 'player' && CARDS.handRects.length) castCard(pickRandom(CARDS.handRects).card);
  }

  /* ---------- shop / grid-info panels ---------- */
  var shopBody = document.getElementById('shopBody');
  function renderShop(){
    if (App.modes.current !== 'cards' || !shopBody) return;
    shopBody.innerHTML = '';
    for (var i = 0; i < CARD_ITEMS.length; i++){
      var it = CARD_ITEMS[i];
      var lv = CARDS.lv[it.id] || 0;
      var ev = evoOf(it.id);
      var row = document.createElement('div');
      row.className = 'shop-row';
      var head = document.createElement('div');
      head.className = 'shop-head';
      var name = document.createElement('span');
      name.className = 'shop-name';
      var owned = it.type === 'spell' && lv === 0;
      name.textContent = it.emoji + ' ' + it.name + (ev ? ' → ' + ev.name : '') +
        (owned ? '  (not yet found)' : '  Lv ' + lv + '/' + maxLvOf(it));
      head.appendChild(name);
      row.appendChild(head);
      var desc = document.createElement('div');
      desc.className = 'shop-desc';
      desc.textContent = ev ? ev.desc : it.desc;
      row.appendChild(desc);
      shopBody.appendChild(row);
    }
    var money = document.getElementById('moneyLabel');
    if (money) money.textContent = '';
  }
  function renderGridInfo(){
    var el = document.getElementById('gridInfo');
    if (!el || App.modes.current !== 'cards') return;
    el.innerHTML = '<span>Dungeon level ' + CARDS.level + '  •  HP ' + Math.round(CARDS.hp) + '/' + Math.round(CARDS.maxHp) +
      '  •  cards found: ' + ownedSpells().length + '/10' +
      (CARDS.breaks ? '  •  break x' + CARDS.breaks : '') + '</span>';
  }

  App.games.register('cards', {
    state: CARDS,
    items: CARD_ITEMS,
    label: 'Dungeon of Echoes',
    unit: 'dungeon',
    dmgStat: 'focus',
    dmgStatCoef: 0.02,
    maxLvOf: maxLvOf,
    update: update,
    draw: draw,
    autoBuy: autoBuy,
    afterLevelReset: function(){
      CARDS.evo = {}; CARDS.frontier = null; CARDS.shield = 0; CARDS.meteors = []; CARDS.meteorInstantCharge = false;
      grantStartingCards();
    },
    resetField: function(g, keepProgress){
      recomputeMaxHp();
      if (!keepProgress) g.hp = g.maxHp;
      g.hp = Math.min(g.hp, g.maxHp);
      g.phase = 'map';
      g.turn = 'player';
      g.enemy = null;
      g.fx = [];
      g.shake = 0;
      g.log = ''; g.logT = 0;
      g.rewardEntries = null;
      if (!g.frontier || g.frontier.depth !== g.level) genFrontier();
    },
    serializeExtra: function(g, out){ out.hp = g.hp; out.maxHp = g.maxHp; out.evo = g.evo; },
    applyExtra: function(g, d){
      g.evo = d.evo || {};
      recomputeMaxHp();
      g.hp = d.hp === undefined ? g.maxHp : Math.min(g.maxHp, d.hp);
    },
    renderShop: renderShop,
    renderGridInfo: renderGridInfo,
    // for checks in the browser (play-testing GAME-AUDIT rows by script), never read by the app
    probe: function(){ return { enemies: ENEMIES, bosses: BOSSES, evos: CARD_EVOS, items: CARD_ITEMS, handSize: HAND_SIZE,
      api: { update: update, draw: draw, castCard: castCard, enterNode: enterNode, handCards: handCards, dealHand: dealHand,
             genFrontier: genFrontier, pickRewardCard: pickRewardCard, ownedSpells: ownedSpells, renderGridInfo: renderGridInfo } }; },
    onLevelUp: function(){ renderShop(); },
    handleKey: function(key, down){
      if (!down) return false;
      if (CARDS.phase === 'reward' && key >= '1' && key <= '3'){ pickRewardCard(parseInt(key, 10) - 1); return true; }
      if (CARDS.phase === 'map' && key >= '1' && key <= '2'){ return tryTapNode(parseInt(key, 10) - 1); }
      if (CARDS.phase === 'battle' && key >= '1' && key <= '9'){ return tryPlayCard(parseInt(key, 10) - 1); }
      return false;
    }
  });
})();
