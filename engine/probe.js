// Browser probes for the mode checks. Not part of the app: load it by hand in the preview,
//   var s = document.createElement('script'); s.src = 'engine/probe.js'; document.head.appendChild(s);
// then call Probe.* from the console (or a session's script tool). Every probe steps frames with a timer
// through App.modes.frame(now), so it also works while the browser pane is hidden and animation frames
// are not firing. Speed is reported as milliseconds per frame, never as a frame rate.
//
//   await Probe.songs()                      load the test-songs folder (dev server only) and start playing
//   await Probe.show('fire', 52, 3)          run one mode for 3 s from second 52 of the song, leave it on screen
//   await Probe.run(ids, 52, 3)              per mode: ms per frame, share of the picture that is lit, errors
//   await Probe.motion(ids, 46, 10, 4)       per mode: how much the picture changes from frame to frame
//   await Probe.white('fire', 52, 3)         share of the picture burnt out to pure white
//   Probe.MODES                              every visual mode id
(function(){
  'use strict';
  var P = window.Probe = {};
  P.errors = [];
  window.addEventListener('error', function(e){
    P.errors.push(e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno);
  });
  P.MODES = Object.keys(App.modes.registry).filter(function(id){ return !App.games.isGameMode(id); });

  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function pixels(){
    var cv = App.canvas.canvas;
    return App.canvas.ctx.getImageData(0, 0, cv.width, cv.height).data;
  }
  // step frames for `secs` seconds; each(now) is called after every frame
  function step(secs, each){
    var thrown = null, n = 0, msSum = 0, msMax = 0;
    var iv = setInterval(function(){
      var t = performance.now();
      try { App.modes.frame(t); }
      catch (e){ if (!thrown) thrown = e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' '); }
      var d = performance.now() - t;
      msSum += d; if (n > 5 && d > msMax) msMax = d; n++;
      if (each) each(t);
    }, 16);
    return wait(secs * 1000).then(function(){
      clearInterval(iv);
      return { frames: n, ms: +(msSum / Math.max(1, n)).toFixed(2), msMax: +msMax.toFixed(1), thrown: thrown };
    });
  }
  function seek(at){ if (at != null && App.state.audio.duration) App.state.audio.currentTime = at; }

  P.songs = async function(){
    App.pages.show('music');
    await wait(300);
    document.getElementById('devSongsBtn').click();
    await wait(1500);
    var a = App.state.audio;
    return { tracks: App.state.playlist.length, paused: a.paused };
  };

  P.show = async function(id, at, secs){
    seek(at); App.modes.setMode(id);
    var r = await step(secs || 2);
    r.drive = +App.audio.A.drive.toFixed(2);
    return r;
  };

  P.run = async function(ids, at, secs){
    var out = {};
    for (var i = 0; i < ids.length; i++){
      var e0 = P.errors.length, dsum = 0, dn = 0;
      seek(at); App.modes.setMode(ids[i]);
      var r = await step(secs || 3, function(){ dsum += App.audio.A.drive; dn++; });
      var d = pixels(), lit = 0, tot = 0;
      for (var p = 0; p < d.length; p += 4 * 97){ tot++; if (d[p] + d[p + 1] + d[p + 2] > 60) lit++; }
      r.drive = +(dsum / Math.max(1, dn)).toFixed(2);
      r.lit = Math.round(lit / tot * 100);
      r.errors = P.errors.slice(e0);
      out[ids[i]] = r;
    }
    return out;
  };

  // mean change of brightness (0-255) per sampled pixel from one frame to the next,
  // measured for `secs` seconds after letting the mode settle for `settle` seconds
  P.motion = async function(ids, at, settle, secs){
    var out = {};
    for (var i = 0; i < ids.length; i++){
      seek(at); App.modes.setMode(ids[i]);
      var prev = null, diff = 0, dn = 0, dsum = 0, t0 = performance.now();
      var r = await step(settle + secs, function(t){
        if (t - t0 < settle * 1000) return;
        dsum += App.audio.A.drive;
        var d = pixels(), s = new Uint8Array(Math.ceil(d.length / (4 * 53))), j = 0;
        for (var p = 0; p < d.length; p += 4 * 53) s[j++] = (d[p] + d[p + 1] + d[p + 2]) / 3;
        if (prev){ var x = 0; for (var q = 0; q < j; q++) x += Math.abs(s[q] - prev[q]); diff += x / j; dn++; }
        prev = s;
      });
      out[ids[i]] = { motion: +(diff / Math.max(1, dn)).toFixed(2), drive: +(dsum / Math.max(1, dn + 1)).toFixed(2), thrown: r.thrown };
    }
    return out;
  };

  // share of the picture (percent) where red, green and blue are all above 235: burnt out
  P.white = async function(id, at, secs){
    var worst = 0, sum = 0, n = 0, f = 0;
    seek(at); App.modes.setMode(id);
    await step(secs || 3, function(){
      if (++f % 6) return;
      var d = pixels(), wh = 0, tot = 0;
      for (var p = 0; p < d.length; p += 4 * 7){ tot++; if (d[p] > 235 && d[p + 1] > 235 && d[p + 2] > 235) wh++; }
      var pc = wh / tot * 100; sum += pc; n++; if (pc > worst) worst = pc;
    });
    return { mean: +(sum / Math.max(1, n)).toFixed(1), worst: +worst.toFixed(1), drive: +App.audio.A.drive.toFixed(2) };
  };

  // Artificium, every row of docs/GAME-AUDIT.md played by script (ROADMAP item 30). Runs the game's own
  // update without drawing, so it is quick. Saves are blocked while it runs (the preview's tabs share
  // storage with the user's), and the game settings are put back after. Returns { D2: {ok, ...}, ... }.
  P.artificium = async function(opts){
    opts = opts || {};
    var keep = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v){ if (/^viz\.(auto\.|saves)/.test(String(k))) return; return keep.call(this, k, v); };
    var G = App.games, C = App.cfg.CFG.games, savedCfg = JSON.parse(JSON.stringify(C)), R = {}, e0 = P.errors.length;
    try {
      C.autoUpgrade = false; C.targeting = 'forward'; C.sellPrice = 80; C.difficulty = 'normal';
      App.modes.setMode('td'); await wait(150);
      G.startGame(); await wait(50);
      if (G.GAME.state === 'paused') G.togglePause();
      var d = G.registry.td, TD = d.state, pr = d.probe(), api = pr.api;
      function run(secs, dt){ dt = dt || 1 / 60; for (var i = 0; i < secs / dt; i++){ api.update(dt); if (TD.lives <= 0) break; } }
      function hold(){ TD.waveT = 1e6; TD.queue = 3; TD.spawnT = 1e6; }       // no new wave, nothing spawns
      function clear(){ TD.turrets = []; TD.enemies = []; TD.shots = []; TD.zones = []; TD.buying = null; TD.placing = false; TD.lv = { power: 0, tempo: 0, optics: 0, repair: 0 }; TD.breaks = 0; TD.money = 1e9; TD.lives = 20; hold(); }
      // the free cell closest to the road, and the road distance nearest to it
      function nearRoad(skip){
        var best = null;
        for (var gx = 2; gx < 24; gx++) for (var gy = 0; gy < 13; gy++){
          if (!api.cellFree(gx, gy) || (skip && skip(gx, gy))) continue;
          var c = api.cellCenter(gx, gy), dd = api.distToPath(c.x, c.y);
          if (!best || dd < best.dd) best = { gx: gx, gy: gy, dd: dd, c: c };
        }
        return best;
      }
      // the distance along the road of the road point nearest to c (walking the road's corner points)
      function roadNear(c){
        var bd = 0, bm = 1e9, path = TD.path, acc = 0;
        for (var i = 1; i < path.length; i++){
          var ax = path[i - 1].x, ay = path[i - 1].y, bx = path[i].x, by = path[i].y, len = Math.hypot(bx - ax, by - ay);
          for (var t = 0; t <= len; t += 3){
            var x = ax + (bx - ax) * t / len, y = ay + (by - ay) * t / len, m = Math.hypot(x - c.x, y - c.y);
            if (m < bm){ bm = m; bd = acc + t; }
          }
          acc += len;
        }
        return bd;
      }
      function addEnemies(n, at, hp){
        for (var i = 0; i < n; i++){
          TD.queue = 1; api.spawn(); var e = TD.enemies[TD.enemies.length - 1];
          e.dist = at + (i - (n - 1) / 2) * 6; e.hp = e.maxHp = hp || 1e6;
        }
        hold();
      }
      function place(id, gx, gy){ return api.placeTower(id, gx, gy, pr.items.filter(function(x){ return x.id === id; })[0].cost); }

      // D2 targeting: Most Forward or Highest HP
      clear();
      var spot = nearRoad(), rd = roadNear(spot.c), tw = place('cannon', spot.gx, spot.gy);
      addEnemies(2, rd, 1e6);
      TD.enemies[0].dist = rd - 10; TD.enemies[0].hp = 5e6; TD.enemies[1].dist = rd + 10; TD.enemies[1].hp = 1e6;
      api.update(1 / 60);
      var fwd = tw.target === TD.enemies[1];
      C.targeting = 'hp'; api.update(1 / 60);
      var byHp = tw.target === TD.enemies[0];
      C.targeting = 'forward';
      R.D2 = { ok: fwd && byHp, forward: fwd, highestHp: byHp };

      // D5 Shock Pylon: 1 s stun, never faster than once every 2 s, even with every speed buff
      clear();
      var sp = place('shock', spot.gx, spot.gy);
      TD.lv.tempo = 10; sp.aRate = 3;
      var rate = api.towerStats(sp).rate;
      addEnemies(1, rd, 1e6); sp.cd = 0;
      var hits = 0, lastHp = TD.enemies[0].hp, stun = 0;
      for (var f = 0; f < 60 * 6.1; f++){ api.update(1 / 60); var en = TD.enemies[0]; if (en && en.hp < lastHp - 1){ hits++; stun = Math.max(stun, en.stunT); } if (en) lastHp = en.hp; }
      R.D5 = { ok: rate >= 2 && hits <= 4 && hits >= 2 && Math.abs(stun - 1) < 0.05, rateWithAllBuffs: rate, hitsIn6s: hits, stun: +stun.toFixed(2) };

      // D7 / D11: buying only enters positioning; the tower appears on Enter or a tap on a cell
      clear();
      var n0 = TD.turrets.length, m0 = TD.money;
      api.buyItem('cannon');
      var afterBuy = { towers: TD.turrets.length - n0, buying: TD.buying, placing: TD.placing, spent: m0 - TD.money };
      TD.sel = { gx: spot.gx, gy: spot.gy };
      d.handleKey('enter', true);
      R.D7 = { ok: afterBuy.towers === 0 && afterBuy.spent === 0 && TD.turrets.length === n0 + 1, afterBuy: afterBuy, placedWithEnter: TD.turrets.length - n0 };
      var pb = document.getElementById('posBtn'), wasPl = TD.placing; if (pb) pb.click(); var tog = TD.placing !== wasPl; if (pb) pb.click();
      R.D11 = { ok: afterBuy.placing === true && tog && TD.turrets.length === n0 + 1, buyingEntersPositioning: afterBuy.placing, buttonToggles: tog };

      // D8 WASD moves the selection; D10 the panel and Enter upgrade the selected tower; D9 towers level on their own
      TD.sel = { gx: 5, gy: 5 }; d.handleKey('d', true); d.handleKey('s', true); d.handleKey('a', true); d.handleKey('w', true); d.handleKey('w', true);
      R.D8 = { ok: TD.sel.gx === 5 && TD.sel.gy === 4, sel: TD.sel };
      clear();
      var a1 = place('cannon', spot.gx, spot.gy), b1 = place('cannon', spot.gx + (spot.gx < 20 ? 3 : -3), spot.gy);
      TD.sel = { gx: a1.gx, gy: a1.gy };
      if (d.renderGridInfo) d.renderGridInfo();
      var panel = document.getElementById('gridInfo'), btn = panel && panel.querySelector('button');
      d.handleKey('enter', true);
      R.D10 = { ok: !!btn && /Upgrade/.test(btn.textContent) && a1.lv === 2, button: btn && btn.textContent, lvAfterEnter: a1.lv };
      R.D9 = { ok: a1.lv === 2 && (!b1 || b1.lv === 1), upgraded: a1.lv, other: b1 && b1.lv };

      // D12 selling: value minus 20% by default
      var spent = a1.spent, m1 = TD.money; api.sellTower(a1);
      R.D12 = { ok: TD.money - m1 === Math.round(spent * 0.8), spent: spent, got: TD.money - m1 };

      // D13 techs: cap at 10, +10% a level (Power, Speed, Range), Base Healing 100 s down to 10 s
      clear();
      var c1 = place('cannon', spot.gx, spot.gy), s0 = api.towerStats(c1);
      for (var bq = 0; bq < 12; bq++){ api.buyItem('power'); api.buyItem('tempo'); api.buyItem('optics'); api.buyItem('repair'); }
      var s1 = api.towerStats(c1);
      TD.lives = 10; TD.repairAcc = 0; TD.enemies = []; hold(); run(10.2);
      R.D13 = { ok: TD.lv.power === 10 && TD.lv.tempo === 10 && TD.lv.optics === 10 && TD.lv.repair === 10 &&
                    Math.abs(s1.dmg / s0.dmg * G.dmgMul(TD) - 2) < 0.01 && Math.abs(s0.rate / s1.rate - 2) < 0.01 && Math.abs(s1.range / s0.range - 2) < 0.01 && TD.lives === 11,
                levels: [TD.lv.power, TD.lv.tempo, TD.lv.optics, TD.lv.repair], dmgX: +(s1.dmg / s0.dmg * G.dmgMul(TD)).toFixed(3),
                rateX: +(s0.rate / s1.rate).toFixed(3), rangeX: +(s1.range / s0.range).toFixed(3), lifeBackIn10s: TD.lives - 10 };

      // D14 level 30 at most, a choice of three evolutions at 15
      clear();
      var c2 = place('cannon', spot.gx, spot.gy), cards = 0;
      for (var up = 0; up < 40; up++){
        api.upgradeTower(c2);
        if (G.GAME.state === 'choosing'){ cards = G.GAME.cards.length; G.pickCard(0); }
      }
      R.D14 = { ok: c2.lv === 30 && cards === 3 && !!c2.evo, lv: c2.lv, choices: cards, evo: c2.evo };

      // D15 every evolution: placed at level 15 beside the road with six tough enemies for 3 s
      var evoRes = {}, bad = [];
      Object.keys(pr.evos).forEach(function(tid){
        pr.evos[tid].forEach(function(ev){
          clear();
          var t = place(tid, spot.gx, spot.gy); t.lv = 15; t.evo = ev.id; t.cd = 0;
          addEnemies(6, rd, 1e6);
          var hp0 = TD.enemies.reduce(function(s, e){ return s + e.hp; }, 0), ee = P.errors.length;
          var stunned = 0;
          for (var q = 0; q < 180; q++){ api.update(1 / 60); TD.enemies.forEach(function(e){ if (e.stunT > 0 || e.frozen) stunned++; }); }
          var hp1 = TD.enemies.reduce(function(s, e){ return s + e.hp; }, 0), hurt = TD.enemies.filter(function(e){ return e.hp < e.maxHp - 0.5; }).length;
          var r = { lost: Math.round(hp0 - hp1), hurt: hurt, stunned: stunned > 0 };
          if (!(hp1 < hp0) || P.errors.length > ee) bad.push(tid + '.' + ev.id);
          evoRes[tid + '.' + ev.id] = r;
        });
      });
      R.D15 = { ok: bad.length === 0, failed: bad, each: evoRes };

      // D17 everything maxed: +1% damage a wave, no choice screen
      clear();
      var c3 = place('cannon', spot.gx, spot.gy); c3.lv = 30;
      TD.lv = { power: 10, tempo: 10, optics: 10, repair: 10 };
      TD.waveT = 0; TD.queue = 0; TD.enemies = []; api.update(1 / 60);
      R.D17 = { ok: TD.breaks === 1 && Math.abs(G.dmgMul(TD) - 1.01) < 1e-9 && G.GAME.state !== 'choosing', breaks: TD.breaks, dmgMul: G.dmgMul(TD), banner: G.GAME.banner };

      // G1 "Enemy HP per wave/level" sets how fast enemy HP grows with the wave
      var k0 = G.kindFor(10), hpA = G.enemyHP(10, k0); C.hpGrowth = savedCfg.hpGrowth * 2; var hpB = G.enemyHP(10, k0); C.hpGrowth = savedCfg.hpGrowth;
      R.G1 = { ok: hpB > hpA, hpAt10: Math.round(hpA), withDoubleGrowth: Math.round(hpB) };

      // D4 losing Artificium does not touch another game's run
      var rpg = G.registry.rpg && G.registry.rpg.state, before = rpg ? JSON.stringify({ s: rpg.state, l: rpg.level, b: rpg.best }) : '';
      TD.lives = 0; api.update(1 / 60);
      var after = rpg ? JSON.stringify({ s: rpg.state, l: rpg.level, b: rpg.best }) : '';
      R.D4 = { ok: before === after && (TD.state === 'dead' || G.GAME.state === 'dead'), tdState: TD.state, otherGameUnchanged: before === after };
      // D16 balance: the game plays itself on Normal (auto-pick on), how far does it get?
      if (!opts.skipBalance){
        // a fresh game, exactly as the Start button makes it
        G.startGame(); if (G.GAME.state === 'paused') G.togglePause();
        C.autoUpgrade = true;
        var t0 = performance.now(), lost = 0, lastLives = TD.lives;
        for (var it = 0; it < 30 * 60 * 30 && TD.lives > 0 && TD.level <= 60; it++){
          api.update(1 / 30);
          if (TD.lives < lastLives) lost += lastLives - TD.lives;
          lastLives = TD.lives;
          if (G.GAME.state === 'choosing' && G.GAME.cards.length) G.pickCard(0);
        }
        C.autoUpgrade = false;
        R.D16 = { ok: true, reachedWave: TD.level, livesLost: lost, lives: TD.lives, towers: TD.turrets.length, unspent: Math.round(TD.money),
                  simMs: Math.round(performance.now() - t0), note: 'balance is judged by the user; these are the self-playing numbers on Normal' };
      }

    } catch (err){
      R.thrown = err.message + ' | ' + String(err.stack || '').split('\n').slice(1, 3).join(' ');
    } finally {
      Object.keys(savedCfg).forEach(function(k){ C[k] = savedCfg[k]; });
      Storage.prototype.setItem = keep;
    }
    R.errors = P.errors.slice(e0);
    return R;
  };
})();
