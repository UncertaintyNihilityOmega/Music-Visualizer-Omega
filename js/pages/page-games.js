/* =========================================================================
   PAGE: Games
   Controls for whichever mini-game is on the canvas (the game itself is
   picked from the row under the visualiser), plus what the difficulty
   setting really changes. The difficulty table is built from the same
   numbers the games use (App.games.DIFFS), so it cannot drift.
   ========================================================================= */
App.pages.define('games', {
  label: 'Games',
  html:
    '<div class="card" id="gamesIntro">' +
      '<div class="settings-head"><span>Mini-games</span></div>' +
      '<p class="page-text">Four games run on the visualiser canvas while your music plays. Your song makes them harder and faster as it gets louder.</p>' +
      '<div class="source-row">' +
        '<button type="button" class="pill-btn" data-start="rpg">' + App.icons.label('rpg', 'Undarum') + '</button>' +
        '<button type="button" class="pill-btn" data-start="td">' + App.icons.label('td', 'Artificium') + '</button>' +
        '<span class="mode-sep" aria-hidden="true"></span>' +
        '<button type="button" class="pill-btn" data-start="cards">' + App.icons.label('cards', 'Dungeon of Echoes') + '</button>' +
        '<button type="button" class="pill-btn" data-start="sandbox">' + App.icons.label('sandbox', 'Solarium') + '</button>' +
      '</div>' +
    '</div>' +

    '<div class="card games-card" id="gamesPanel" hidden>' +
      '<div class="settings-head">' +
        '<span>Game</span>' +
        '<span class="game-actions">' +
          '<select id="diffSelect" class="set-input" aria-label="Difficulty">' +
            '<option value="normal">Normal</option>' +
            '<option value="hard">Hard</option>' +
            '<option value="insane">Insane</option>' +
          '</select>' +
          '<button type="button" id="pauseGameBtn" class="slot-btn">Play / Pause</button>' +
          '<button type="button" id="restartGameBtn" class="slot-btn">Restart</button>' +
        '</span>' +
      '</div>' +
      '<div class="settings-head" style="margin-top:2px">' +
        '<span id="moneyLabel"></span>' +
        '<span class="game-actions">' +
          '<button type="button" id="speedBtn" class="slot-btn">Speed 1x</button>' +
          '<button type="button" id="posBtn" class="slot-btn">Positioning: off</button>' +
          '<button type="button" id="skipWaveBtn" class="slot-btn">Skip wave</button>' +
        '</span>' +
      '</div>' +
      '<div id="gridInfo" class="grid-info"></div>' +
      '<div id="shopBody" class="shop-list"></div>' +
      '<p class="game-help">Click the canvas to play. <b>Artificium</b> (tower defence): buy towers below (or press <b>1</b>–<b>9</b>), then tap a free cell to place them. Waves arrive on a timer and kills pay money. <b>Undarum</b> (survivor): WASD to move, spells cast themselves; pick upgrades by tapping a card or pressing <b>1 2 3</b>. <b>Dungeon of Echoes</b> (cards): tap a path on the dungeon map, then tap a card in your hand (or press number keys) to play it each turn. <b>P</b> pauses, hold <b>Shift</b> for 3x speed. Every item has its own level cap; once everything is maxed, each further level gives +1% damage instead of a hard wall.</p>' +
      '<div class="saves-title">Save slots</div>' +
      '<div id="savesBody"></div>' +
      '<div class="saves-actions">' +
        '<button type="button" id="exportSavesBtn" class="slot-btn">Export saves</button>' +
        '<div class="saves-drop" id="dropSaves">Drop a saves file here, or click to browse</div>' +
        '<input type="file" id="savesFile" accept="application/json,.json">' +
      '</div>' +
      '<p class="url-hint" id="savesNote"></p>' +
    '</div>' +

    '<div class="card">' +
      '<details class="set-group" style="border-top:none">' +
        '<summary>What does difficulty change?</summary>' +
        '<p class="page-text">Difficulty multiplies six numbers. Nothing else is different: same enemies, same towers and spells, same map.</p>' +
        '<div class="table-wrap"><table class="info-table" id="diffTable"></table></div>' +
        '<p class="page-text" id="diffSummary"></p>' +
      '</details>' +
    '</div>',

  init: function(el){
    var G = App.games, M = App.modes;
    var rows = [
      ['hp',    'Enemy health',               function(v){ return '×' + v; }],
      ['dmg',   'Enemy damage',               function(v){ return '×' + v; }],
      ['qty',   'Enemies per wave',           function(v){ return '×' + v; }],
      ['spd',   'Enemy speed',                function(v){ return '×' + v; }],
      ['lives', 'Starting lives (Artificium)',   function(v){ return String(v); }],
      ['money', 'Money per kill (Artificium)',   function(v){ return '×' + v; }]
    ];
    var ids = ['normal', 'hard', 'insane'];
    var html = '<tr><th></th>' + ids.map(function(id){ return '<th>' + G.DIFFS[id].label + '</th>'; }).join('') + '</tr>';
    rows.forEach(function(r){
      html += '<tr><td>' + r[1] + '</td>' + ids.map(function(id){ return '<td>' + r[2](G.DIFFS[id][r[0]]) + '</td>'; }).join('') + '</tr>';
    });
    document.getElementById('diffTable').innerHTML = html;
    var n = G.DIFFS.normal, x = G.DIFFS.insane;
    function pct(a, b){ return Math.round(Math.abs(a / b - 1) * 100) + '%'; }
    document.getElementById('diffSummary').textContent =
      'Read down the ' + x.label + ' column: compared with ' + n.label + ', each enemy has ' + pct(x.hp, n.hp) +
      ' more health, hits ' + pct(x.dmg, n.dmg) + ' harder, moves ' + pct(x.spd, n.spd) + ' faster and there are ' +
      pct(x.qty, n.qty) + ' more of them. In Artificium you also start with ' + x.lives + ' lives instead of ' + n.lives +
      ' and earn ' + pct(x.money, n.money) + ' less money per kill. Because these multiply together, ' + x.label +
      ' is much more than twice as hard.';

    var starts = el.querySelectorAll('[data-start]');
    for (var i = 0; i < starts.length; i++){
      (function(b){
        b.addEventListener('click', function(){
          M.setMode(b.getAttribute('data-start'), true);
          document.getElementById('vizCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      })(starts[i]);
    }

    // the intro card is for when no game is running
    var basePanel = G.updateGamePanel;
    G.updateGamePanel = function(){
      basePanel();
      document.getElementById('gamesIntro').hidden = G.isGameMode(M.current);
    };
    G.updateGamePanel();
  }
});
