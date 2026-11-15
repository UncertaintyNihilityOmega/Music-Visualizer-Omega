/* =========================================================================
   SETTINGS
   DEFAULTS/SCHEMA are registries: every mode/game file calls
   registerDefaults()/registerSchema() once, at its own load time, to add
   its own group. CFG itself can't be built until every file has registered
   (i.e. after the last <script> tag has run), so App.cfg.init() is exposed
   here but only ever *called* from main.js's bootstrap sequence — this file
   only defines things, per the project's load-order discipline.
   ========================================================================= */
(function(){
  'use strict';
  var C = App.cfg;

  C.DEFAULTS = {};
  C.SCHEMA = [];
  C.CFG = {};
  C.ACTIONS = {};

  var hooks = {};        // group id -> function(key) — cross-module side effects
  var nextOrder = 10;    // 'audio'/'look'/'games' claim 0/1/2 explicitly below

  C.registerDefaults = function(id, defaults){ C.DEFAULTS[id] = defaults; };
  C.registerSchema = function(entry, order){
    entry._order = order === undefined ? nextOrder++ : order;
    C.SCHEMA.push(entry);
  };
  // A group registers one hook for whatever needs to react when its own
  // settings change (re-init a particle system, resize the canvas, etc).
  // key is null when the WHOLE group should be treated as reset/replaced.
  C.onGroupChange = function(id, fn){ hooks[id] = fn; };

  C.cloneCfg = function(o){
    var out = {};
    for (var g in o){ out[g] = {}; for (var k in o[g]) out[g][k] = o[g][k]; }
    return out;
  };
  // Bump when a release changes what a group's numbers MEAN, and list the
  // groups whose saved values must be dropped. v2 (0.1.0): the audio engine
  // gained a loudness curve, so an old saved noise floor / contrast would
  // silence everything; Basic gained new options with a new default look.
  var CFG_VERSION = 2;
  var DROP_BELOW = { 2: ['audio', 'basic'] };
  C.saveCfg = function(){
    try {
      localStorage.setItem('viz.cfg', JSON.stringify(C.CFG));
      localStorage.setItem('viz.cfg.v', String(CFG_VERSION));
    } catch (e) {}
  };

  function onSettingChanged(group, key){
    C.saveCfg();
    if (App.canvas.invalidateBG) App.canvas.invalidateBG();
    if (group === 'all'){
      for (var id in hooks) hooks[id](null);
    } else if (hooks[group]){
      hooks[group](key);
    }
  }
  C.onSettingChanged = onSettingChanged;

  C.resetAll = function(){
    var fresh = C.cloneCfg(C.DEFAULTS);
    for (var g in fresh) C.CFG[g] = fresh[g];
    onSettingChanged('all', null);
  };
  C.importCfg = function(incoming){
    for (var g in C.CFG){
      if (!incoming[g]) continue;
      for (var k in C.CFG[g]) if (incoming[g][k] !== undefined) C.CFG[g][k] = incoming[g][k];
    }
    onSettingChanged('all', null);
  };

  // Builds CFG from every registered DEFAULTS group, merges in whatever the
  // user had saved, and sorts SCHEMA into display order. Mutates the CFG
  // object in place (never reassigns it) so files that cached
  // `var CFG = App.cfg.CFG` at their own load time keep working forever,
  // including across a later reset-all or settings import.
  C.buildCFG = function(){
    var built = C.cloneCfg(C.DEFAULTS);
    try {
      var stored = JSON.parse(localStorage.getItem('viz.cfg') || 'null');
      if (stored){
        var had = parseInt(localStorage.getItem('viz.cfg.v') || '1', 10) || 1;
        for (var ver in DROP_BELOW){
          if (had < Number(ver)) DROP_BELOW[ver].forEach(function(gid){ delete stored[gid]; });
        }
        for (var sg in built){
          if (!stored[sg]) continue;
          for (var sk in built[sg]) if (stored[sg][sk] !== undefined) built[sg][sk] = stored[sg][sk];
        }
      }
    } catch (e) {}
    for (var g2 in built) C.CFG[g2] = built[g2];
    C.SCHEMA.sort(function(a, b){ return a._order - b._order; });
  };

  /* ---------- Settings panel ---------- */
  var panel = null, panelBody = null;
  function labelFor(g, f){ return f[1]; }
  function buildPanel(){
    if (!panelBody) return;
    panelBody.innerHTML = '';
    C.SCHEMA.forEach(function(group){
      var det = document.createElement('details');
      det.className = 'set-group';
      det.setAttribute('data-group', group.id);
      if (group.id === 'audio') det.open = true;
      var sum = document.createElement('summary');
      sum.textContent = group.label;
      det.appendChild(sum);

      group.fields.forEach(function(f){
        var key = f[0], type = f[2];
        if (type !== 'photo' && type !== 'button' && C.CFG[group.id][key] === undefined) return;
        var row = document.createElement('div');
        row.className = 'set-row';
        var lab = document.createElement('label');
        lab.textContent = labelFor(group.id, f);
        row.appendChild(lab);

        var input, out = null;
        if (type === 'range'){
          input = document.createElement('input');
          input.type = 'range';
          input.min = f[3]; input.max = f[4]; input.step = f[5];
          input.value = C.CFG[group.id][key];
          out = document.createElement('span');
          out.className = 'set-val';
          out.textContent = C.CFG[group.id][key];
          input.addEventListener('input', function(){
            C.CFG[group.id][key] = parseFloat(input.value);
            out.textContent = input.value;
            onSettingChanged(group.id, key);
          });
        } else if (type === 'color'){
          input = document.createElement('input');
          input.type = 'color';
          input.value = C.CFG[group.id][key];
          input.addEventListener('input', function(){
            C.CFG[group.id][key] = input.value;
            onSettingChanged(group.id, key);
          });
        } else if (type === 'bool'){
          input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = !!C.CFG[group.id][key];
          input.addEventListener('change', function(){
            C.CFG[group.id][key] = input.checked;
            onSettingChanged(group.id, key);
          });
        } else if (type === 'select'){
          input = document.createElement('select');
          f[3].forEach(function(opt){
            var o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            input.appendChild(o);
          });
          input.value = C.CFG[group.id][key];
          input.addEventListener('change', function(){
            var v = input.value;
            C.CFG[group.id][key] = isNaN(parseFloat(v)) ? v : parseFloat(v);
            onSettingChanged(group.id, key);
          });
        } else if (type === 'photo'){
          input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.addEventListener('change', function(){
            if (input.files && input.files[0] && C.ACTIONS[key]) C.ACTIONS[key](input.files[0]);
            input.value = '';
          });
        } else if (type === 'button'){
          input = document.createElement('button');
          input.type = 'button';
          input.textContent = f[3] || 'Go';
          input.addEventListener('click', function(){ if (C.ACTIONS[key]) C.ACTIONS[key](); });
        } else {
          input = document.createElement('input');
          input.type = 'text';
          input.value = C.CFG[group.id][key];
          input.addEventListener('input', function(){
            C.CFG[group.id][key] = input.value;
            onSettingChanged(group.id, key);
          });
        }
        input.className = 'set-input';
        row.appendChild(input);
        if (out) row.appendChild(out);
        det.appendChild(row);
      });

      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'set-reset';
      reset.textContent = 'Reset ' + group.label.toLowerCase();
      reset.addEventListener('click', function(){
        for (var k2 in C.DEFAULTS[group.id]) C.CFG[group.id][k2] = C.DEFAULTS[group.id][k2];
        onSettingChanged(group.id, null);
        buildPanel();
        openGroup(App.modes.current);
      });
      det.appendChild(reset);
      panelBody.appendChild(det);
    });
  }
  function openGroup(id){
    if (!panelBody) return;
    var groups = panelBody.querySelectorAll('.set-group');
    for (var i = 0; i < groups.length; i++){
      var gid = groups[i].getAttribute('data-group');
      if (gid === id) groups[i].open = true;
      else if (gid !== 'audio' && gid !== 'look') groups[i].open = false;
    }
  }
  C.buildPanel = buildPanel;
  C.openGroup = openGroup;

  // Called once from main.js, after every other file has registered its
  // defaults/schema/hooks.
  C.init = function(){
    C.buildCFG();
    panel = document.getElementById('settingsPanel');
    panelBody = document.getElementById('settingsBody');
    buildPanel();

    var setBtn = document.getElementById('setBtn');
    if (setBtn && panel){
      // the gear on the canvas jumps to the Settings page, opened at the
      // current mode's own group
      setBtn.addEventListener('click', function(){
        App.pages.show('settings');
        openGroup(App.games.isGameMode(App.modes.current) ? 'games' : App.modes.current);
        var fs = document.fullscreenElement || document.webkitFullscreenElement;
        if (fs) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    var expCfg = document.getElementById('exportCfgBtn');
    if (expCfg) expCfg.addEventListener('click', function(){
      // 'kind' keeps its old value so settings files exported before the rename still import
      var blob = new Blob([JSON.stringify({ kind: 'our-playlist-settings', v: 1, cfg: C.CFG }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'music-visualiser-omega-settings.json';
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
    });
    var impCfg = document.getElementById('importCfgBtn');
    var cfgFile = document.getElementById('cfgFile');
    if (impCfg && cfgFile){
      impCfg.addEventListener('click', function(){ cfgFile.click(); });
      cfgFile.addEventListener('change', function(){
        if (!cfgFile.files || !cfgFile.files[0]) return;
        var fr = new FileReader();
        fr.onload = function(){
          try {
            var parsed = JSON.parse(fr.result);
            var incoming = parsed && parsed.cfg ? parsed.cfg : parsed;
            C.importCfg(incoming);
            buildPanel();
            openGroup(App.modes.current);
          } catch (e) {}
        };
        fr.readAsText(cfgFile.files[0]);
        cfgFile.value = '';
      });
    }
    var resetAll = document.getElementById('resetAllBtn');
    if (resetAll){
      resetAll.addEventListener('click', function(){
        C.resetAll();
        buildPanel();
        openGroup(App.modes.current);
      });
    }
  };
})();
