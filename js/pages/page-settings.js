/* =========================================================================
   PAGE: Settings
   The code box (secret theme words) and the settings panel that
   js/core/settings.js fills in from every mode's and game's own schema.
   ========================================================================= */
App.pages.define('settings', {
  label: 'Settings',
  html:
    '<div class="card">' +
      '<div class="settings-head"><span>Code</span></div>' +
      '<form class="url-row" id="codeForm" autocomplete="off">' +
        '<input type="text" id="codeInput" placeholder="Type a word…" aria-label="Theme code" spellcheck="false" autocapitalize="off">' +
        '<button type="submit">Enter</button>' +
      '</form>' +
      '<p class="url-hint" id="codeNote" aria-live="polite">Some words change how the whole app looks.</p>' +
      '<div class="source-row" id="themeChips"></div>' +
    '</div>' +
    '<div class="card settings-card" id="settingsPanel">' +
      '<div class="settings-head">' +
        '<span>Visualiser settings</span>' +
        '<span class="game-actions">' +
          '<button type="button" id="exportCfgBtn" class="set-reset-all">Export</button>' +
          '<button type="button" id="importCfgBtn" class="set-reset-all">Import</button>' +
          '<button type="button" id="resetAllBtn" class="set-reset-all">Reset everything</button>' +
          '<input type="file" id="cfgFile" accept="application/json,.json">' +
        '</span>' +
      '</div>' +
      '<div id="settingsBody"></div>' +
    '</div>',

  init: function(){
    var T = App.theme;
    var form = document.getElementById('codeForm');
    var input = document.getElementById('codeInput');
    var note = document.getElementById('codeNote');
    var chips = document.getElementById('themeChips');

    // themes found so far, as one-tap buttons (the default is always there)
    function paintChips(){
      chips.innerHTML = '';
      var ids = ['omega'].concat(T.unlocked());
      if (ids.length < 2) return;
      ids.forEach(function(id){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pill-btn' + (T.current === id ? ' active' : '');
        b.textContent = T.THEMES[id].name;
        b.addEventListener('click', function(){ T.apply(id); });
        chips.appendChild(b);
      });
    }
    T.onChange = paintChips;
    paintChips();

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var id = T.enterCode(input.value);
      if (id){
        note.textContent = id === 'omega' ? 'Back to the default look.' : '“' + T.THEMES[id].name + '” unlocked.';
        input.value = '';
      } else if (input.value.trim()){
        note.textContent = 'Nothing happens.';
      }
    });
  }
});
