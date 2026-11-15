/* =========================================================================
   SURVIVOR SHOOTER
   Spells level to 30 and offer a 3-way evolution choice at 15, mirroring
   Tower Defense's towers; passives are simpler support stats capped at 10,
   mirroring Tower Defense's tech tree. Evolution data lives in RPG_EVOS,
   shaped exactly like Tower Defense's EVOS table (id/name/desc/color plus
   whatever numeric or flag fields that evolution's block below reads) so
   the pattern stays recognizable across both games.
   ========================================================================= */
(function(){
  'use strict';
  var Can = App.canvas, Aud = App.audio, Cfg = App.cfg, U = App.util, G = App.games;
  var canvas = Can.canvas, ctx = Can.ctx;
  var A = Aud.A;

  var SPELL_MAX = 30, PASSIVE_MAX = 10, EVO_AT = 15;

  var RPG_ITEMS = [
    { id: 'satellite', name: 'Satellite',      emoji: '🛰️', type: 'spell', color: '#7BD3F7', desc: 'Orbiting orbs, +1 orb every 6 levels (max 7). +3 damage and +1.4px orbit per level. Evolves at 15.' },
    { id: 'firebreath',name: 'Fire Breath',    emoji: '🔥', type: 'spell', color: '#FF7A3D', desc: 'Cone of fire every 1.3s. +4.4 damage and +4.4px reach per level. Evolves at 15.' },
    { id: 'frost',     name: 'Frost Nova',     emoji: '❄️', type: 'spell', color: '#9FE3F0', desc: 'Ring every 2.4s, slows to 45%. +2.6 damage and +4.8px radius per level. Evolves at 15.' },
    { id: 'nature',    name: 'Nature Bloom',   emoji: '🌿', type: 'spell', color: '#7BD389', desc: 'Damaging patch lasting 3.2s. +3.4 damage and +3px radius per level. Evolves at 15.' },
    { id: 'laser',     name: 'Sweeping Laser', emoji: '🔴', type: 'spell', color: '#FF5D8F', desc: 'Rotating beam through you, damage every frame. +5.2 damage and +6.8px reach per level. Evolves at 15.' },
    { id: 'chain',     name: 'Chain Spark',    emoji: '⚡', type: 'spell', color: '#B57BFF', desc: 'Chains every 1.6s, +1 target every 6 levels (max 7). +3.8 damage per level. Evolves at 15.' },
    { id: 'shuriken',  name: 'Star Shot',      emoji: '⭐', type: 'spell', color: '#E0B252', desc: 'Fires every 0.85s, +1 star every 7 levels (max 5), pierces from level 20. +4 damage per level. Evolves at 15.' },
    { id: 'aura',      name: 'Searing Aura',   emoji: '🔥', type: 'spell', color: '#EF6F6C', desc: 'Constant damage around you. +1.8 damage/s and +3px radius per level. Evolves at 15.' },
    { id: 'meteor',    name: 'Meteor',         emoji: '☄️', type: 'spell', color: '#D8763A', desc: 'Strike every 2.8s. +9 damage and +3.6px radius per level. Evolves at 15.' },
    { id: 'boomerang', name: 'Boomerang',      emoji: '🥏', type: 'spell', color: '#6FE3C4', desc: 'Returning shot every 1.5s, pierces everything. +4.8 damage per level. Evolves at 15.' },
    { id: 'might',     name: 'Might',          emoji: '💪', type: 'passive', color: '#EF6F6C', desc: '+7.2% damage from every spell, per level (+72% at level 10).' },
    { id: 'swift',     name: 'Swiftness',      emoji: '👟', type: 'passive', color: '#7BD389', desc: '+9% move speed per level (+90% at level 10).' },
    { id: 'vitality',  name: 'Vitality',       emoji: '❤️', type: 'passive', color: '#F5A3C7', desc: '+42 max HP per level and 0.27 HP/s regen per level.' },
    { id: 'magnet',    name: 'Magnet',         emoji: '🧲', type: 'passive', color: '#6FA8DC', desc: '+19.2px pickup radius per level (+192px at level 10).' },
    { id: 'haste',     name: 'Haste',          emoji: '⏩', type: 'passive', color: '#FFD166', desc: '-7.2% spell cooldown per level, and the music speeds casting further.' }
  ];

  var RPG_EVOS = {
    satellite: [
      { id: 'heavy',  name: 'Heavy Satellites', color: '#4A90C9', desc: '3x damage per orb, 25% slower orbit.', dmg: 3, orbitSpeed: 0.75 },
      { id: 'swarm',  name: 'Satellite Swarm',  color: '#A8E0FF', desc: '+3 more orbs (max 10), 30% less damage each.', extraOrbs: 3, dmg: 0.7 },
      { id: 'pulsar', name: 'Pulsar Array',     color: '#FFE066', desc: 'Each orb also fires a bolt at the nearest enemy every 1.6s.', bolt: 1 }
    ],
    firebreath: [
      { id: 'dragon',   name: "Dragon's Breath", color: '#B33A1E', desc: '3x damage, 25% shorter reach.', dmg: 3, reach: 0.75 },
      { id: 'wildfire', name: 'Wildfire',        color: '#FF9A4D', desc: 'Leaves a burning patch that lingers 2.2s.', groundFire: 1 },
      { id: 'phoenix',  name: 'Phoenix Breath',  color: '#FFD1A8', desc: 'Heals you for 15% of the damage it deals.', lifesteal: 0.15 }
    ],
    frost: [
      { id: 'absolute',   name: 'Absolute Zero', color: '#CFF6FF', desc: '+50% slow strength.', slowMul: 0.3 },
      { id: 'blizzard',   name: 'Blizzard',      color: '#8FD8E8', desc: 'Fires every 0.9s instead of 2.4s, 60% less damage.', rate: 0.375, dmg: 0.4 },
      { id: 'permafrost', name: 'Permafrost',    color: '#6FC7DD', desc: 'Leaves a lingering slow patch for 3.2s after.', linger: 1 }
    ],
    nature: [
      { id: 'overgrowth', name: 'Overgrowth', color: '#5FA32E', desc: 'Each patch spreads a smaller linked patch to a nearby enemy.', spread: 1 },
      { id: 'thornskin',  name: 'Thornskin',  color: '#3E7C4C', desc: '-25% damage taken while standing in your own patch.', guard: 0.25 },
      { id: 'worldtree',  name: 'World Tree', color: '#2F5233', desc: 'Patches are 60% bigger and last 60% longer, but only 2 grow at a time.', size: 1.6, life: 1.6, count: 2 }
    ],
    laser: [
      { id: 'twin',       name: 'Twin Beam',       color: '#FF8FD0', desc: 'A second beam sweeps at a right angle to the first.', twin: 1 },
      { id: 'overcharge', name: 'Overcharge Beam', color: '#FFE066', desc: 'Damage breathes up and down as it charges and discharges.', overcharge: 1 },
      { id: 'prism',      name: 'Prism Beam',      color: '#B57BFF', desc: 'Splits into 3 thinner beams, 40% less damage each.', split: 3, dmg: 0.6 }
    ],
    chain: [
      { id: 'storm',    name: 'Storm Call', color: '#D6BBFF', desc: 'Hits every enemy within range at once instead of hopping.', chainAll: 1 },
      { id: 'overload', name: 'Overload',   color: '#7B2FF7', desc: 'Each hop deals 25% more damage than the last.', escalate: 0.25 },
      { id: 'static',   name: 'Static Field', color: '#9B6BFF', desc: 'Each hop leaves a lingering shock zone for 1.5s.', staticZone: 1 }
    ],
    shuriken: [
      { id: 'storm',  name: 'Star Storm',   color: '#F5D06F', desc: 'Fires in a full ring around you instead of an aimed volley.', ring: 1 },
      { id: 'homing', name: 'Homing Stars', color: '#E8C468', desc: 'Stars curve toward the nearest enemy in flight.', homing: 1 },
      { id: 'shower', name: 'Star Shower',  color: '#FFE8A3', desc: 'Extra stars also fall from above around you.', shower: 1 }
    ],
    aura: [
      { id: 'wildfire', name: 'Wildfire Aura',   color: '#FF9A4D', desc: 'Also ignites enemies for a burn that outlasts the aura.', ignite: 1 },
      { id: 'absorb',   name: 'Absorbing Aura',  color: '#FFB3B0', desc: "Heals you for 20% of the aura's damage.", lifesteal: 0.2 },
      { id: 'nova',     name: 'Nova Aura',       color: '#FF4D4D', desc: 'Pulses a damage spike every 2s on top of the steady burn.', nova: 1 }
    ],
    meteor: [
      { id: 'shower', name: 'Meteor Shower', color: '#E89A5C', desc: '+2 more meteors (4 total), 35% less damage each.', count: 2, dmg: 0.65 },
      { id: 'crater', name: 'Impact Crater', color: '#A85A34', desc: 'Leaves a lingering damage crater for 2.2s.', crater: 1 },
      { id: 'echo',   name: 'Echo Strike',   color: '#FFB27A', desc: 'Every impact strikes the same spot again half a second later.', echo: 1 }
    ],
    boomerang: [
      { id: 'twin',    name: 'Twin Boomerang',    color: '#A8F0DD', desc: 'Throws 2 at once in a spread, 25% less damage each.', twin: 1, dmg: 0.75 },
      { id: 'chakram', name: 'Chakram',           color: '#4FD8B8', desc: 'Returns twice as fast for more hits per throw.', turn: 0.5 },
      { id: 'homing',  name: 'Homing Boomerang',  color: '#89E8C8', desc: 'Curves toward the nearest enemy during flight.', homing: 1 }
    ]
  };
  function maxLvOf(item){ return item.type === 'passive' ? PASSIVE_MAX : SPELL_MAX; }
  function evoOf(id){
    var chosen = RPG.evo[id];
    if (!chosen) return null;
    var list = RPG_EVOS[id] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === chosen) return list[i];
    return null;
  }

  var RPG = {
    id: 'rpg', level: 1, breaks: 0, lv: G.blankLevels(RPG_ITEMS), evo: {}, best: 0, time: 0,
    xp: 0, xpNeed: 5, enemies: [], orbs: [], shots: [], zones: [], fx: [], meteorEchoes: [],
    player: { x: 0, y: 0, hp: 120, maxHp: 120, face: 0, hurtT: 0 },
    keys: { w: false, a: false, s: false, d: false }, touch: null, spawnT: 0, cds: {}, bossAt: 0
  };

  function rpgResetField(){
    RPG.enemies = [];
    RPG.orbs = [];
    RPG.shots = [];
    RPG.zones = [];
    RPG.fx = [];
    RPG.meteorEchoes = [];
    RPG.cds = {};
    RPG.player.x = canvas.width / 2;
    RPG.player.y = canvas.height / 2;
    RPG.player.maxHp = 120 + (RPG.lv.vitality || 0) * 42;
    RPG.player.hp = RPG.player.maxHp;
    RPG.player.hurtT = 0;
    RPG.spawnT = 0;
    RPG.bossAt = 0;
  }
  // Returns the damage actually applied, so lifesteal evolutions can heal
  // off the real post-multiplier number.
  function rpgHurt(e, dmg){
    var applied = dmg * G.dmgMul(RPG);
    e.hp -= applied;
    if (e.hp <= 0){
      var i = RPG.enemies.indexOf(e);
      if (i >= 0) RPG.enemies.splice(i, 1);
      // orbs carry the enemy's own colour and are worth more for tougher shapes
      if (RPG.orbs.length < 200) RPG.orbs.push({ x: e.x, y: e.y, xp: e.kind.xp, color: e.kind.color, r: 2 + Math.min(5, e.kind.xp * 0.25) });
      if (Cfg.CFG.games.effects > 0 && RPG.fx.length < 50){
        RPG.fx.push({ x: e.x, y: e.y, r: e.kind.r * Can.dpr(), max: e.kind.r * 2.2 * Can.dpr(), life: 1, color: e.kind.color });
      }
    }
    return applied;
  }
  function rpgSpawn(forceBoss){
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    var kind = forceBoss ? G.BOSS : G.kindFor(RPG.level);
    var side = Math.floor(Math.random() * 4), x, y;
    if (side === 0){ x = Math.random() * w; y = -20 * k; }
    else if (side === 1){ x = w + 20 * k; y = Math.random() * h; }
    else if (side === 2){ x = Math.random() * w; y = h + 20 * k; }
    else { x = -20 * k; y = Math.random() * h; }
    var hp = G.enemyHP(RPG.level, kind);
    RPG.enemies.push({ kind: kind, hp: hp, maxHp: hp, x: x, y: y, slowT: 0, slowMul: 0.45, poisT: 0, poisDmg: 0, rot: Math.random() * 6.283, hitT: 0 });
  }
  function rpgUpdate(dt){
    var w = canvas.width, h = canvas.height, k = Can.dpr();
    var p = RPG.player;
    RPG.time += dt;

    // the music drives the character too, not just the enemies
    var speed = (108 + (RPG.lv.swift || 0) * 9.6) * k * (1 + A.level * Cfg.CFG.games.musicPlayer);
    var mx = (RPG.keys.d ? 1 : 0) - (RPG.keys.a ? 1 : 0);
    var my = (RPG.keys.s ? 1 : 0) - (RPG.keys.w ? 1 : 0);
    // touch steering, so the game is playable without a keyboard
    if (!mx && !my && RPG.touch){
      var tdx = RPG.touch.x - p.x, tdy = RPG.touch.y - p.y;
      if (Math.abs(tdx) + Math.abs(tdy) > 6 * k){ mx = tdx; my = tdy; }
    }
    if (mx || my){
      var ml = Math.sqrt(mx * mx + my * my);
      p.x += (mx / ml) * speed * dt;
      p.y += (my / ml) * speed * dt;
      p.face = Math.atan2(my, mx);
    }
    var pad = 14 * k;
    p.x = Math.max(pad, Math.min(w - pad, p.x));
    p.y = Math.max(pad, Math.min(h - pad, p.y));
    p.hurtT = Math.max(0, p.hurtT - dt);
    if (RPG.lv.vitality) p.hp = Math.min(p.maxHp, p.hp + RPG.lv.vitality * 0.27 * dt);

    RPG.spawnT -= dt;
    var want = Math.min(Cfg.CFG.games.maxPerWave, Math.round((6 + RPG.level * 0.7) * G.diff().qty));
    var interval = Math.max(0.1, 0.7);
    while (RPG.spawnT <= 0 && RPG.enemies.length < want){
      rpgSpawn(false);
      RPG.spawnT += interval;
    }
    // boss arrives on the configured level, once per level
    if (G.isBossLevel(RPG.level) && RPG.bossAt !== RPG.level){
      RPG.bossAt = RPG.level;
      rpgSpawn(true);
      G.GAME.banner = 'BOSS';
      G.GAME.bannerT = 1.8;
    }

    var natureGuard = 1;
    if (evoOf('nature') && evoOf('nature').guard){
      for (var zg = 0; zg < RPG.zones.length; zg++){
        var zgz = RPG.zones[zg];
        if (zgz.natureGuard){
          var gdx = p.x - zgz.x, gdy = p.y - zgz.y;
          if (gdx * gdx + gdy * gdy <= zgz.r * zgz.r){ natureGuard = 1 - evoOf('nature').guard; break; }
        }
      }
    }
    var eSpeed = 30 * k * G.musicSpeedMul() * G.diff().spd;
    for (var i = RPG.enemies.length - 1; i >= 0; i--){
      var e = RPG.enemies[i];
      var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var mul = e.slowT > 0 ? (e.slowMul || 0.45) : 1;
      e.slowT = Math.max(0, e.slowT - dt);
      e.hitT = Math.max(0, e.hitT - dt);
      if (e.poisT > 0){ e.poisT -= dt; rpgHurt(e, e.poisDmg * dt); if (e.hp <= 0) continue; }
      e.x += (dx / d) * e.kind.spd * eSpeed * mul * dt;
      e.y += (dy / d) * e.kind.spd * eSpeed * mul * dt;
      e.rot += dt * 0.8;
      if (d < (e.kind.r + 10) * k && p.hurtT <= 0){
        p.hp -= G.enemyDmg(RPG.level, e.kind) * 0.25 * natureGuard;
        p.hurtT = 0.7;
        if (p.hp <= 0){ App.games.gameOver(RPG); return; }
      }
    }

    var magnet = (44 + (RPG.lv.magnet || 0) * 19.2) * k;
    for (var o = RPG.orbs.length - 1; o >= 0; o--){
      var orb = RPG.orbs[o];
      var odx = p.x - orb.x, ody = p.y - orb.y, od = Math.sqrt(odx * odx + ody * ody) || 1;
      if (od < magnet){
        orb.x += (odx / od) * 240 * k * dt;
        orb.y += (ody / od) * 240 * k * dt;
      }
      if (od < 12 * k){
        RPG.xp += orb.xp;
        RPG.orbs.splice(o, 1);
        if (RPG.xp >= RPG.xpNeed){
          RPG.xp -= RPG.xpNeed;
          RPG.level++;
          RPG.xpNeed = Math.round(5 + RPG.level * 3.2);
          RPG.player.maxHp = 120 + (RPG.lv.vitality || 0) * 42;
          G.rollCards(RPG);
          if (G.GAME.state === 'choosing') return;
        }
      }
    }

    rpgSpells(dt, k);

    for (var s = RPG.shots.length - 1; s >= 0; s--){
      var sh = RPG.shots[s];
      sh.life -= dt;
      if (sh.homing){
        var ht = nearestEnemy(sh.x, sh.y, 260 * k);
        if (ht){
          var hsp = Math.sqrt(sh.vx * sh.vx + sh.vy * sh.vy) || 1;
          var hAng = Math.atan2(ht.y - sh.y, ht.x - sh.x), curAng = Math.atan2(sh.vy, sh.vx);
          var diff = hAng - curAng;
          while (diff > Math.PI) diff -= 6.283;
          while (diff < -Math.PI) diff += 6.283;
          curAng += Math.max(-5 * dt, Math.min(5 * dt, diff));
          sh.vx = Math.cos(curAng) * hsp; sh.vy = Math.sin(curAng) * hsp;
        }
      }
      if (sh.boomer){
        sh.t += dt;
        var dir = sh.t > sh.turn ? -1 : 1;
        sh.x += sh.vx * dir * dt;
        sh.y += sh.vy * dir * dt;
      } else {
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
      }
      var dead = sh.life <= 0;
      if (!dead){
        for (var m = RPG.enemies.length - 1; m >= 0; m--){
          var me = RPG.enemies[m];
          var mdx = me.x - sh.x, mdy = me.y - sh.y, rr = (me.kind.r + (sh.big || 4)) * k;
          if (mdx * mdx + mdy * mdy <= rr * rr){
            rpgHurt(me, sh.dmg);
            if (!sh.pierce){ dead = true; break; }
          }
        }
      }
      if (dead) RPG.shots.splice(s, 1);
    }
    for (var z = RPG.zones.length - 1; z >= 0; z--){
      var zo = RPG.zones[z];
      zo.life -= dt;
      if (zo.life <= 0){ RPG.zones.splice(z, 1); continue; }
      for (var y2 = RPG.enemies.length - 1; y2 >= 0; y2--){
        var ye = RPG.enemies[y2];
        var ydx = ye.x - zo.x, ydy = ye.y - zo.y;
        if (ydx * ydx + ydy * ydy <= zo.r * zo.r){
          var applied = rpgHurt(ye, zo.dmg * dt);
          if (zo.slow){ ye.slowT = 0.4; ye.slowMul = zo.slowMul !== undefined ? zo.slowMul : 0.45; }
          if (zo.lifesteal) p.hp = Math.min(p.maxHp, p.hp + applied * zo.lifesteal);
          if (zo.ignite){ ye.poisT = 1.5; ye.poisDmg = zo.dmg * 0.5; }
        }
      }
    }
    for (var ec = RPG.meteorEchoes.length - 1; ec >= 0; ec--){
      var eco = RPG.meteorEchoes[ec];
      eco.t -= dt;
      if (eco.t <= 0){
        RPG.zones.push({ x: eco.x, y: eco.y, r: eco.r, dmg: eco.dmg, life: 0.4, color: '#FFB27A' });
        RPG.meteorEchoes.splice(ec, 1);
      }
    }
    for (var f = RPG.fx.length - 1; f >= 0; f--){
      RPG.fx[f].life -= dt * 2.4;
      if (RPG.fx[f].life <= 0) RPG.fx.splice(f, 1);
    }
  }
  function cdReady(id, base, dt){
    // haste comes from the passive AND from how hard the track is going
    var haste = 1 / (1 + (RPG.lv.haste || 0) * 0.072 + A.level * Cfg.CFG.games.musicHaste);
    RPG.cds[id] = (RPG.cds[id] || 0) - dt;
    if (RPG.cds[id] <= 0){ RPG.cds[id] = base * haste; return true; }
    return false;
  }
  function nearestEnemy(x, y, maxR){
    var best = null, bd = maxR * maxR;
    for (var i = 0; i < RPG.enemies.length; i++){
      var e = RPG.enemies[i];
      var dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
      if (d2 < bd){ bd = d2; best = e; }
    }
    return best;
  }
  function satelliteCount(lv, ev){
    var max = (ev && ev.extraOrbs) ? 7 + ev.extraOrbs : 7;
    return Math.min(max, 2 + Math.floor(lv / 6));
  }
  function laserBeamAngles(ev){
    if (ev && ev.twin) return [0, Math.PI / 2];
    if (ev && ev.split) return [-0.44, 0, 0.44];
    return [0];
  }
  function rpgSpells(dt, k){
    var p = RPG.player, lv = RPG.lv;
    if (lv.satellite){
      var evSat = evoOf('satellite');
      var n = satelliteCount(lv.satellite, evSat);
      var rad = (46 + lv.satellite * 1.4) * k;
      var dmg = (7 + lv.satellite * 3) * (evSat && evSat.dmg ? evSat.dmg : 1);
      var spinMul = (evSat && evSat.orbitSpeed) ? evSat.orbitSpeed : 1;
      RPG.satAng = (RPG.satAng || 0) + dt * (2.1 + A.level * 1.4) * spinMul;
      for (var i = 0; i < n; i++){
        var a = RPG.satAng + (i / n) * 6.283;
        var sx = p.x + Math.cos(a) * rad, sy = p.y + Math.sin(a) * rad;
        for (var e = RPG.enemies.length - 1; e >= 0; e--){
          var en = RPG.enemies[e];
          if (en.hitT > 0) continue;
          var dx = en.x - sx, dy = en.y - sy, rr = (en.kind.r + 7) * k;
          if (dx * dx + dy * dy <= rr * rr){ rpgHurt(en, dmg); en.hitT = 0.3; }
        }
        if (evSat && evSat.bolt && cdReady('satBolt' + i, 1.6, dt)){
          var boltT = nearestEnemy(sx, sy, 260 * k);
          if (boltT && RPG.shots.length < 140){
            var bAng = Math.atan2(boltT.y - sy, boltT.x - sx);
            RPG.shots.push({ x: sx, y: sy, vx: Math.cos(bAng) * 260 * k, vy: Math.sin(bAng) * 260 * k, dmg: dmg * 0.8, life: 1.2, color: '#7BD3F7' });
          }
        }
      }
    }
    if (lv.aura){
      var evAura = evoOf('aura');
      var ar = (40 + lv.aura * 3) * k, adm = (4 + lv.aura * 1.8) * dt;
      for (var q = RPG.enemies.length - 1; q >= 0; q--){
        var ae = RPG.enemies[q];
        var adx = ae.x - p.x, ady = ae.y - p.y;
        if (adx * adx + ady * ady <= ar * ar){
          var applied = rpgHurt(ae, adm);
          if (evAura && evAura.lifesteal) p.hp = Math.min(p.maxHp, p.hp + applied * evAura.lifesteal);
          if (evAura && evAura.ignite){ ae.poisT = 1.5; ae.poisDmg = adm / dt * 0.5; }
        }
      }
      if (evAura && evAura.nova && cdReady('auraNova', 2, dt)){
        for (var qn = RPG.enemies.length - 1; qn >= 0; qn--){
          var aen = RPG.enemies[qn];
          var adxn = aen.x - p.x, adyn = aen.y - p.y;
          if (adxn * adxn + adyn * adyn <= ar * ar * 1.3) rpgHurt(aen, adm / dt * 0.4);
        }
        if (Cfg.CFG.games.effects > 0 && RPG.fx.length < 50) RPG.fx.push({ x: p.x, y: p.y, r: 8 * k, max: ar * 1.3, life: 1, color: '#EF6F6C' });
      }
    }
    if (lv.firebreath && cdReady('firebreath', 1.3, dt)){
      var evFB = evoOf('firebreath');
      var fr = (70 + lv.firebreath * 4.4) * k * (evFB && evFB.reach ? evFB.reach : 1);
      var fbDmg = (12 + lv.firebreath * 4.4) * (evFB && evFB.dmg ? evFB.dmg : 1);
      for (var fb = 0; fb < 3; fb++){
        var dist = fr * (0.34 + fb * 0.34);
        var fx2 = p.x + Math.cos(p.face) * dist, fy2 = p.y + Math.sin(p.face) * dist;
        RPG.zones.push({ x: fx2, y: fy2, r: fr * (0.3 + fb * 0.1), dmg: fbDmg,
                         life: 0.7, color: '#FF7A3D', lifesteal: evFB && evFB.lifesteal ? evFB.lifesteal : 0 });
        if (evFB && evFB.groundFire) RPG.zones.push({ x: fx2, y: fy2, r: fr * (0.3 + fb * 0.1) * 0.8, dmg: fbDmg * 0.22, life: 2.2, color: 'rgba(255,122,61,0.55)' });
      }
    }
    if (lv.frost){
      var evFr = evoOf('frost');
      var frostRate = (evFr && evFr.rate) ? evFr.rate * 2.4 : 2.4;
      if (cdReady('frost', frostRate, dt)){
        var slowStrength = (evFr && evFr.slowMul !== undefined) ? evFr.slowMul : 0.45;
        var frDmg = (7 + lv.frost * 2.6) * (evFr && evFr.dmg ? evFr.dmg : 1);
        RPG.zones.push({ x: p.x, y: p.y, r: (58 + lv.frost * 4.8) * k, dmg: frDmg, life: 0.9, slow: true, slowMul: slowStrength, color: '#9FE3F0' });
        if (evFr && evFr.linger) RPG.zones.push({ x: p.x, y: p.y, r: (58 + lv.frost * 4.8) * k * 0.85, dmg: 0.001, life: 3.2, slow: true, slowMul: 0.6, color: 'rgba(159,227,240,0.3)' });
      }
    }
    if (lv.nature && cdReady('nature', 2.1, dt)){
      var evNat = evoOf('nature');
      var count = (evNat && evNat.count) ? evNat.count : 4;
      var sizeMul = (evNat && evNat.size) ? evNat.size : 1;
      var lifeMul = (evNat && evNat.life) ? evNat.life : 1;
      for (var nb = 0; nb < count; nb++){
        var nt2 = nearestEnemy(p.x + (Math.random() - 0.5) * 160 * k, p.y + (Math.random() - 0.5) * 160 * k, 260 * k);
        var bx = nt2 ? nt2.x : p.x + (Math.random() - 0.5) * 150 * k;
        var by = nt2 ? nt2.y : p.y + (Math.random() - 0.5) * 150 * k;
        RPG.zones.push({ x: bx, y: by, r: (34 + lv.nature * 3) * k * sizeMul,
                         dmg: 9 + lv.nature * 3.4, life: 3.2 * lifeMul, color: '#7BD389', natureGuard: !!(evNat && evNat.guard) });
        if (evNat && evNat.spread){
          var other = nearestEnemy(bx + (Math.random() - 0.5) * 140 * k, by + (Math.random() - 0.5) * 140 * k, 200 * k);
          if (other) RPG.zones.push({ x: other.x, y: other.y, r: (34 + lv.nature * 3) * k * 0.6, dmg: (9 + lv.nature * 3.4) * 0.6, life: 2.2, color: '#7BD389' });
        }
      }
    }
    if (lv.laser){
      var evLs = evoOf('laser');
      var reach = (150 + lv.laser * 6.8) * k;
      var half = (9 + lv.laser * 0.7) * k;
      var ldmBase = (16 + lv.laser * 5.2) * dt;
      var angles = laserBeamAngles(evLs);
      var perBeamDmg = (evLs && evLs.split) ? ldmBase * evLs.dmg : ldmBase;
      var breathe = (evLs && evLs.overcharge) ? (1 + (Math.sin(A.t * 1.2) * 0.5 + 0.5) * 1.6) : 1;
      RPG.laserAng = (RPG.laserAng || 0) + dt * 1.15;
      for (var bi = 0; bi < angles.length; bi++){
        var la = RPG.laserAng + angles[bi];
        var lx = Math.cos(la), ly = Math.sin(la);
        var beamDmg = perBeamDmg * breathe;
        for (var l = RPG.enemies.length - 1; l >= 0; l--){
          var le = RPG.enemies[l];
          var vx = le.x - p.x, vy = le.y - p.y;
          var proj = vx * lx + vy * ly;
          if (Math.abs(proj) > reach) continue;      // the beam runs through the player, both ways
          if (Math.abs(vx * ly - vy * lx) < (le.kind.r + half)) rpgHurt(le, beamDmg);
        }
      }
    }
    if (lv.chain && cdReady('chain', 1.6, dt)){
      var evCh = evoOf('chain');
      var baseDmg = 10 + lv.chain * 3.8;
      if (evCh && evCh.chainAll){
        var stormR = 220 * k;
        for (var se = RPG.enemies.length - 1; se >= 0; se--){
          var see = RPG.enemies[se];
          var sdx = see.x - p.x, sdy = see.y - p.y;
          if (sdx * sdx + sdy * sdy <= stormR * stormR){
            rpgHurt(see, baseDmg);
            if (Cfg.CFG.games.effects > 0 && RPG.fx.length < 50) RPG.fx.push({ line: [p.x, p.y, see.x, see.y], life: 1, color: '#B57BFF' });
          }
        }
      } else {
        var hops = Math.min(7, 2 + Math.floor(lv.chain / 6));
        var cur = nearestEnemy(p.x, p.y, 200 * k), from = p, seen = [];
        var hopDmg = baseDmg;
        for (var c = 0; c < hops && cur; c++){
          if (Cfg.CFG.games.effects > 0 && RPG.fx.length < 50) RPG.fx.push({ line: [from.x, from.y, cur.x, cur.y], life: 1, color: '#B57BFF' });
          rpgHurt(cur, hopDmg);
          if (evCh && evCh.staticZone && RPG.zones.length < 60) RPG.zones.push({ x: cur.x, y: cur.y, r: 34 * k, dmg: hopDmg * 0.25, life: 1.5, color: 'rgba(181,123,255,0.45)' });
          if (evCh && evCh.escalate) hopDmg *= (1 + evCh.escalate);
          seen.push(cur);
          from = { x: cur.x, y: cur.y };
          var nx2 = null, nd = (90 * k) * (90 * k);
          for (var z = 0; z < RPG.enemies.length; z++){
            var ze = RPG.enemies[z];
            if (seen.indexOf(ze) >= 0) continue;
            var zx = ze.x - from.x, zy = ze.y - from.y, z2 = zx * zx + zy * zy;
            if (z2 < nd){ nd = z2; nx2 = ze; }
          }
          cur = nx2;
        }
      }
    }
    if (lv.shuriken && cdReady('shuriken', 0.85, dt)){
      var evSh = evoOf('shuriken');
      var count = Math.min(5, 1 + Math.floor(lv.shuriken / 7));
      var shDmg = 11 + lv.shuriken * 4;
      var pierce = lv.shuriken >= 20;
      if (evSh && evSh.ring){
        var ringN = Math.max(6, count * 2);
        for (var ri = 0; ri < ringN && RPG.shots.length < 140; ri++){
          var ra = (ri / ringN) * 6.283;
          RPG.shots.push({ x: p.x, y: p.y, vx: Math.cos(ra) * 300 * k, vy: Math.sin(ra) * 300 * k, dmg: shDmg * 0.7, life: 1.4, color: '#E0B252', pierce: pierce });
        }
      } else {
        var t2 = nearestEnemy(p.x, p.y, 300 * k);
        var baseA = t2 ? Math.atan2(t2.y - p.y, t2.x - p.x) : p.face;
        for (var s2 = 0; s2 < count && RPG.shots.length < 140; s2++){
          var sa = baseA + (s2 - (count - 1) / 2) * 0.22;
          RPG.shots.push({ x: p.x, y: p.y, vx: Math.cos(sa) * 300 * k, vy: Math.sin(sa) * 300 * k,
                           dmg: shDmg, life: 1.4, color: '#E0B252', pierce: pierce, homing: !!(evSh && evSh.homing) });
        }
      }
      if (evSh && evSh.shower){
        for (var sw = 0; sw < 2 && RPG.shots.length < 140; sw++){
          var fdx = p.x + (Math.random() - 0.5) * 180 * k;
          RPG.shots.push({ x: fdx, y: p.y - 220 * k, vx: 0, vy: 260 * k, dmg: shDmg * 0.8, life: 1.6, color: '#F5D06F' });
        }
      }
    }
    if (lv.meteor && cdReady('meteor', 2.8, dt)){
      var evMt = evoOf('meteor');
      var mCount = (evMt && evMt.count) ? 2 + evMt.count : 2;
      var mDmg = (30 + lv.meteor * 9) * (evMt && evMt.dmg ? evMt.dmg : 1);
      var mR = (44 + lv.meteor * 3.6) * k;
      for (var mv = 0; mv < mCount; mv++){
        var mt = nearestEnemy(p.x + (Math.random() - 0.5) * 200 * k, p.y + (Math.random() - 0.5) * 200 * k, 320 * k);
        var mx = mt ? mt.x : p.x + (Math.random() - 0.5) * 120 * k;
        var my = mt ? mt.y : p.y + (Math.random() - 0.5) * 120 * k;
        RPG.zones.push({ x: mx, y: my, r: mR, dmg: mDmg, life: 0.55, color: '#D8763A' });
        if (evMt && evMt.crater) RPG.zones.push({ x: mx, y: my, r: mR * 0.7, dmg: mDmg * 0.12, life: 2.2, color: 'rgba(216,118,54,0.5)' });
        if (evMt && evMt.echo) RPG.meteorEchoes.push({ x: mx, y: my, r: mR, dmg: mDmg * 0.8, t: 0.5 });
      }
    }
    if (lv.boomerang && cdReady('boomerang', 1.5, dt)){
      var evBm = evoOf('boomerang');
      var bt = nearestEnemy(p.x, p.y, 300 * k);
      var ba = bt ? Math.atan2(bt.y - p.y, bt.x - p.x) : p.face;
      var bmDmg = (14 + lv.boomerang * 4.8) * (evBm && evBm.dmg ? evBm.dmg : 1);
      var bmTurn = (evBm && evBm.turn) ? evBm.turn : 1.1;
      var angles2 = (evBm && evBm.twin) ? [ba - 0.3, ba + 0.3] : [ba];
      for (var bj = 0; bj < angles2.length; bj++){
        if (RPG.shots.length < 140){
          RPG.shots.push({ x: p.x, y: p.y, vx: Math.cos(angles2[bj]) * 210 * k, vy: Math.sin(angles2[bj]) * 210 * k,
                           dmg: bmDmg, life: 2.4, color: '#6FE3C4', pierce: true,
                           boomer: true, t: 0, turn: bmTurn, big: 13 + lv.boomerang * 0.7, homing: !!(evBm && evBm.homing) });
        }
      }
    }
  }
  function rpgDraw(){
    var w = canvas.width, h = canvas.height, k = Can.dpr(), p = RPG.player, lv = RPG.lv;
    G.gameBackdrop(true);

    for (var z = 0; z < RPG.zones.length; z++){
      var zo = RPG.zones[z];
      ctx.globalAlpha = Math.min(0.35, zo.life * 0.4);
      ctx.fillStyle = zo.color;
      ctx.beginPath();
      ctx.arc(zo.x, zo.y, zo.r, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (var o = 0; o < RPG.orbs.length; o++){
      var orb = RPG.orbs[o];
      ctx.fillStyle = orb.color;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r * k, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.8 * k;
      ctx.stroke();
    }
    for (var e = 0; e < RPG.enemies.length; e++) G.drawEnemy(RPG.enemies[e], k);
    for (var s = 0; s < RPG.shots.length; s++){
      var sh = RPG.shots[s];
      ctx.fillStyle = sh.color;
      ctx.beginPath();
      if (sh.big){
        ctx.save();
        ctx.translate(sh.x, sh.y);
        ctx.rotate(A.t * 9);
        ctx.fillRect(-sh.big * k, -sh.big * k * 0.32, sh.big * 2 * k, sh.big * 0.64 * k);
        ctx.fillRect(-sh.big * k * 0.32, -sh.big * k, sh.big * 0.64 * k, sh.big * 2 * k);
        ctx.restore();
      } else {
        ctx.arc(sh.x, sh.y, 3 * k, 0, 6.283);
        ctx.fill();
      }
    }
    if (lv.laser){
      var evLsD = evoOf('laser');
      var reach = (150 + lv.laser * 6.8) * k;
      var half = (9 + lv.laser * 0.7) * k;
      var breathe = (evLsD && evLsD.overcharge) ? (0.7 + (Math.sin(A.t * 1.2) * 0.5 + 0.5) * 0.8) : 1;
      var angles3 = laserBeamAngles(evLsD);
      for (var bd = 0; bd < angles3.length; bd++){
        var la2 = (RPG.laserAng || 0) + angles3[bd];
        var lcos = Math.cos(la2), lsin = Math.sin(la2);
        ctx.strokeStyle = 'rgba(255,93,143,0.75)';
        ctx.lineWidth = half * 1.8 * breathe + A.punch * 4 * k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - lcos * reach, p.y - lsin * reach);
        ctx.lineTo(p.x + lcos * reach, p.y + lsin * reach);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,240,0.9)';
        ctx.lineWidth = (2 + A.punch * 2) * k * breathe;
        ctx.beginPath();
        ctx.moveTo(p.x - lcos * reach, p.y - lsin * reach);
        ctx.lineTo(p.x + lcos * reach, p.y + lsin * reach);
        ctx.stroke();
      }
    }
    if (lv.aura){
      ctx.globalAlpha = 0.1 + A.level * 0.08;
      ctx.fillStyle = '#EF6F6C';
      ctx.beginPath();
      ctx.arc(p.x, p.y, (40 + lv.aura * 3) * k, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (lv.satellite){
      var n = satelliteCount(lv.satellite, evoOf('satellite'));
      var rad = (46 + lv.satellite * 1.4) * k;
      ctx.fillStyle = '#7BD3F7';
      for (var i = 0; i < n; i++){
        var a = (RPG.satAng || 0) + (i / n) * 6.283;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad, 5 * k, 0, 6.283);
        ctx.fill();
      }
    }
    for (var f = 0; f < RPG.fx.length; f++){
      var fx = RPG.fx[f];
      ctx.globalAlpha = Math.max(0, fx.life) * 0.7;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      if (fx.line){ ctx.moveTo(fx.line[0], fx.line[1]); ctx.lineTo(fx.line[2], fx.line[3]); }
      else ctx.arc(fx.x, fx.y, fx.r + (fx.max - fx.r) * (1 - fx.life), 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = p.hurtT > 0 ? '#FFD1D1' : '#EAF2FF';
    U.polyPath(ctx, p.x, p.y, 9 * k, 3, p.face);
    ctx.fill();

    var bw = 120 * k;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(w - bw - 10 * k, 10 * k, bw, 7 * k);
    ctx.fillStyle = '#7BD389';
    ctx.fillRect(w - bw - 10 * k, 10 * k, bw * Math.max(0, p.hp / p.maxHp), 7 * k);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(w - bw - 10 * k, 21 * k, bw, 5 * k);
    ctx.fillStyle = '#6FA8DC';
    ctx.fillRect(w - bw - 10 * k, 21 * k, bw * Math.min(1, RPG.xp / RPG.xpNeed), 5 * k);

    G.hudText([
      'Level ' + RPG.level + (RPG.breaks ? '   break x' + RPG.breaks : ''),
      'HP ' + Math.max(0, Math.round(p.hp)) + ' / ' + Math.round(p.maxHp) + '   Enemies ' + RPG.enemies.length,
      'Time ' + U.formatTime(RPG.time) + '   Best ' + U.formatTime(RPG.best) + '   ' + G.gameSpeed() + 'x',
      G.DIFFS[Cfg.CFG.games.difficulty].label + '   -   WASD to move'
    ], k);
  }

  /* ---------- shop panel: every spell/passive, its level, and its evolution ---------- */
  var shopBody = document.getElementById('shopBody');
  function renderShop(){
    if (App.modes.current !== 'rpg' || !shopBody) return;
    shopBody.innerHTML = '';
    for (var i = 0; i < RPG_ITEMS.length; i++){
      var it = RPG_ITEMS[i];
      var lv = RPG.lv[it.id] || 0;
      var ev = evoOf(it.id);
      var row = document.createElement('div');
      row.className = 'shop-row';
      var head = document.createElement('div');
      head.className = 'shop-head';
      var name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = it.emoji + ' ' + it.name + (ev ? ' → ' + ev.name : '') + '  Lv ' + lv + '/' + maxLvOf(it);
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

  App.canvas.addResizeHook(function(){
    RPG.player.x = Math.min(RPG.player.x, canvas.width - 20);
    RPG.player.y = Math.min(RPG.player.y, canvas.height - 20);
  });

  canvas.addEventListener('pointerdown', function(ev){
    if (App.modes.current !== 'rpg') return;
    if (G.GAME.state !== 'playing') return;
    var pt = App.taps.canvasPoint(ev);
    RPG.touch = { x: pt.x, y: pt.y };
  });
  canvas.addEventListener('pointermove', function(ev){
    if (App.modes.current !== 'rpg') return;
    if (RPG.touch && G.GAME.state === 'playing'){ var rp = App.taps.canvasPoint(ev); RPG.touch.x = rp.x; RPG.touch.y = rp.y; }
  });
  canvas.addEventListener('pointerup', function(){
    if (App.modes.current === 'rpg') RPG.touch = null;
  });

  App.games.register('rpg', {
    state: RPG,
    items: RPG_ITEMS,
    label: 'Survivor',
    unit: 'level',
    dmgStat: 'might',
    dmgStatCoef: 0.072,
    maxLvOf: maxLvOf,
    update: rpgUpdate,
    draw: rpgDraw,
    resetField: function(g, keepProgress){
      g.xp = 0;
      g.xpNeed = Math.round(5 + g.level * 3.2);
      rpgResetField();
    },
    afterLevelReset: function(g){ g.lv.shuriken = 1; g.evo = {}; },
    startExtra: function(g){ G.rollCards(g); },
    serializeExtra: function(g, out){ out.xp = g.xp; out.evo = g.evo; },
    applyExtra: function(g, d){
      g.xp = d.xp || 0;
      g.xpNeed = Math.round(5 + g.level * 3.2);
      g.evo = d.evo || {};
    },
    renderShop: renderShop,
    onLevelUp: function(item, newLv){
      if (item.type === 'spell' && newLv === EVO_AT && !RPG.evo[item.id] && RPG_EVOS[item.id]){
        G.rollEvolutionChoice(RPG_EVOS[item.id], function(id){ RPG.evo[item.id] = id; }, item.emoji);
      }
      renderShop();
    },
    handleKey: function(key, down){
      if (key === 'w' || key === 'a' || key === 's' || key === 'd'){ RPG.keys[key] = down; return true; }
      return false;
    }
  });
})();
