/* =========================================================================
   THEMES + SECRET CODES
   A theme is a set of page colours (CSS variables), a title, and a "look"
   that Basic mode draws with. Typing a theme's code word into Settings
   switches to it; codes found so far are remembered so they can be picked
   again with one tap.

   To add a theme: add one entry to THEMES. Nothing else needs to change -
   the Settings page, the code box and Basic mode all read this table.
     codes    words that unlock it (matched without caring about case/spaces)
     title    text of the page heading, mark = the accent character after it
     vars     CSS custom properties set on <html>
     look     how Basic mode draws:
                c1, c2      bar colours (edge, middle)
                bg1, bg2    canvas background (top, bottom)
                dark        true when the canvas background is dark
                layout      'mirror' | 'edges' | 'rise' | 'ring'
                glyphs      null for solid bars, or an array of characters /
                            emoji the bars are built from
                rainbow     true = hue runs across the bars
                inward      ring layout only: bars point into a dark disc
              and how the other modes follow the theme:
                digital     String: the strings move in square steps
                electric    String: a Jacob's ladder (arcs climbing between two rods) instead of strings
                emoji       Emoji: the set to use, quiet to loud (null = the user's own)
                clock       Clock: which of its skins to wear (the table at the top of mode-clock.js)
                liquid      Liquid: the drop, its edge colour, the water, and how it moves (top of mode-liquid.js)
                rain        Rain: what falls and its colours (fields listed at the top of mode-rain.js)
                nature      Nature: the tree, its leaves and the sky (fields at the top of mode-nature.js)
                fire        Fire: { style, warm, cool, bg1, bg2 }: style = one of the forms listed at
                            the top of mode-fire.js (candles, sun, vortex...), then flame colour, hot core colour and
                            the hearth (always dark: the flames are added light), plus
                            rainbow: true for a different hue per flame
   ========================================================================= */
(function(){
  'use strict';
  var T = App.theme;

  T.THEMES = {
    omega: {
      codes: ['omega', 'default', 'reset'],
      name: 'Omega', title: 'Music Visualiser', mark: 'Ω', docTitle: 'Music Visualiser Omega',
      vars: { bg1: '#0C0918', bg2: '#1B1033', glow1: '176,107,255', glow2: '255,95,210',
              card: 'rgba(28,20,52,.88)', field: 'rgba(255,255,255,.07)', ink: '#EFE9FF', muted: 'rgba(239,233,255,.62)',
              accent: '#B06BFF', accent2: '#FF5FD2', accentRgb: '176,107,255', line: 'rgba(176,107,255,.28)',
              onAccent: '#FFFFFF', shadow: '0 16px 34px rgba(0,0,0,.42)' },
      look: { c1: '#6A5CFF', c2: '#FF5FD2', bg1: '#171033', bg2: '#06040E', dark: true, layout: 'mirror', glyphs: null,
              emoji: null, clock: 'omega',
              liquid: { kind: 'ink', fill: '#0A0618', rim: '#C77DFF', bg1: '#1B1140', bg2: '#06040E' },
              rain: { shape: 'streak', color: '#B79CFF', bolt: '#FF8FE6', bg1: '#1A1238', bg2: '#07050F' },
              nature: { trunk: '#7D62C9', leaf: '#C77DFF', bloom: '#FF5FD2', bloomChance: 0.35, glow: true, dark: true, branch: 'curve', leafShape: 'leaf',
                        hill: '#3A2A78', fly: '255,150,235', flowerHues: [270, 300, 320, 250], bg1: '#171033', bg2: '#06040E' },
              fire: { style: 'hearth', warm: '#B24BFF', cool: '#FF5FD2', bg1: '#171033', bg2: '#06040E' } }
    },
    tessa: {
      codes: ['tessa'],
      name: 'Tessa', title: 'Music Visualiser', mark: 'ϟ', docTitle: 'Music Visualiser ϟ Tessa',
      vars: { bg1: '#04070F', bg2: '#0A1530', glow1: '80,170,255', glow2: '150,110,255',
              card: 'rgba(10,18,40,.9)', field: 'rgba(120,200,255,.08)', ink: '#E6F6FF', muted: 'rgba(230,246,255,.62)',
              accent: '#4FC3FF', accent2: '#8A7BFF', accentRgb: '79,195,255', line: 'rgba(79,195,255,.32)',
              onAccent: '#02101C', shadow: '0 0 0 1px rgba(79,195,255,.14), 0 16px 34px rgba(0,0,0,.6)' },
      look: { c1: '#3D6BFF', c2: '#B8F4FF', bg1: '#081226', bg2: '#01030A', dark: true, layout: 'edges', glyphs: ['ϟ'],
              electric: true, emoji: ['✨', '🔋', '💡', '⚡', '🌩️'], clock: 'tessa',
              liquid: { kind: 'plasma', fill: '#030A1A', rim: '#7FDBFF', bg1: '#0A1838', bg2: '#01030A' },
              rain: { shape: 'streak', color: '#9FE4FF', bolt: '#E8FBFF', storm: true, bg1: '#0A1430', bg2: '#01030A' },
              nature: { trunk: '#BFEFFF', leaf: '#4FC3FF', bloom: '#C9B8FF', bloomChance: 0.25, glow: true, dark: true, branch: 'bolt', leafShape: 'spark',
                        hill: '#12305E', fly: '170,230,255', flowerHues: [200, 225, 260], bg1: '#081226', bg2: '#01030A' },
              fire: { style: 'plasma', warm: '#8A5CFF', cool: '#5FD0FF', bg1: '#081226', bg2: '#01030A' } }
    },
    newyear: {
      codes: ['new year', 'newyear', 'happy new year'],
      name: 'New Year', title: 'Happy New Year', mark: '✦', docTitle: 'Happy New Year ✦ Music Visualiser Omega',
      vars: { bg1: '#070B1E', bg2: '#122047', glow1: '255,214,120', glow2: '120,170,255',
              card: 'rgba(16,24,56,.9)', field: 'rgba(255,255,255,.08)', ink: '#F4F1E4', muted: 'rgba(244,241,228,.62)',
              accent: '#F2C55C', accent2: '#8FB8FF', accentRgb: '242,197,92', line: 'rgba(242,197,92,.3)',
              onAccent: '#1A1403', shadow: '0 16px 34px rgba(0,0,0,.45)' },
      look: { c1: '#8FB8FF', c2: '#F2C55C', bg1: '#0D1638', bg2: '#03050F', dark: true, layout: 'rise', glyphs: ['✦', '❄', '✧'],
              emoji: ['✨', '❄️', '🥂', '🎉', '🎆'], clock: 'newyear',
              liquid: { kind: 'ink', fill: '#0A1026', rim: '#F2C55C', bg1: '#122047', bg2: '#03050F' },
              rain: { shape: 'snow', fall: 0.3, color: '#F4F1E4', bolt: '#F2C55C', bg1: '#0D1638', bg2: '#03050F' },
              nature: { trunk: '#DDE6F7', leaf: '#F2C55C', bloom: '#8FB8FF', bloomChance: 0.3, glow: true, dark: true, branch: 'curve', leafShape: 'spark',
                        shed: 7, hill: '#C9D6F2', fly: '255,230,150', flowerHues: [45, 215], bg1: '#0D1638', bg2: '#03050F' },
              fire: { style: 'fireworks', warm: '#E08A14', cool: '#8FB8FF', bg1: '#0D1638', bg2: '#03050F' } }
    },
    halloween: {
      codes: ['halloween', 'spooky'],
      name: 'Halloween', title: 'Spooky Visualiser', mark: '🎃', docTitle: 'Spooky Visualiser 🎃',
      vars: { bg1: '#0E0812', bg2: '#24102B', glow1: '255,122,26', glow2: '138,70,200',
              card: 'rgba(30,16,36,.9)', field: 'rgba(255,255,255,.07)', ink: '#F6E9D8', muted: 'rgba(246,233,216,.62)',
              accent: '#FF7A1A', accent2: '#9B5DE5', accentRgb: '255,122,26', line: 'rgba(255,122,26,.3)',
              onAccent: '#1B0D02', shadow: '0 16px 34px rgba(0,0,0,.5)' },
      look: { c1: '#9B5DE5', c2: '#FF7A1A', bg1: '#1C0F24', bg2: '#050308', dark: true, layout: 'mirror', glyphs: ['🎃', '👻', '🦇'],
              emoji: ['🕸️', '🦇', '👻', '🎃', '💀'], clock: 'halloween',
              liquid: { kind: 'slime', fill: '#0B1A06', rim: '#7CE04A', bg1: '#1C0F24', bg2: '#050308' },
              rain: { shape: 'glyph', glyphs: ['🦇', '🍂', '🕷️'], spin: true, fall: 0.5, color: '#FF7A1A', bolt: '#7CE04A', bg1: '#1C0F24', bg2: '#050308' },
              nature: { trunk: '#0A0608', leaf: '#FF7A1A', bloom: '#9B5DE5', bloomChance: 0.12, dark: true, branch: 'straight', leafShape: 'leaf',
                        shed: 2, hill: '#120A16', fly: '255,150,60', flowerHues: [25, 275], bg1: '#3A1E4A', bg2: '#0B0610' },
              fire: { style: 'cauldron', warm: '#58D82C', cool: '#9B5DE5', bg1: '#1C0F24', bg2: '#050308' } }
    },
    love: {
      codes: ['love', 'our playlist'],
      name: 'Love', title: 'Our Playlist', mark: '♥', docTitle: 'Our Playlist ❤️‍🔥',
      vars: { bg1: '#F3DCD9', bg2: '#FDF6F0', glow1: '194,98,111', glow2: '189,146,87',
              card: '#FDF6F0', field: '#FFFFFF', ink: '#3B1A22', muted: 'rgba(59,26,34,.62)',
              accent: '#6E1E2E', accent2: '#C2626F', accentRgb: '194,98,111', line: 'rgba(189,146,87,.35)',
              onAccent: '#FDF6F0', shadow: '0 16px 34px rgba(110,30,46,.16)' },
      look: { c1: '#BD9257', c2: '#C2626F', bg1: '#FFF8F3', bg2: '#F1D8D5', dark: false, layout: 'mirror', glyphs: ['♥'],
              emoji: ['✨', '💕', '❤️', '💖', '🌟'], clock: 'love',
              liquid: { kind: 'ink', fill: '#6E1E2E', rim: '#E58A9A', bg1: '#FFF1EC', bg2: '#F1D0CF' },
              rain: { shape: 'glyph', glyphs: ['♥'], spin: true, fall: 0.4, color: '#C2626F', bolt: '#BD9257', bg1: '#FFF8F3', bg2: '#F1D8D5' },
              nature: { trunk: '#4A2A2A', leaf: '#F7B6C8', bloom: '#F58FB0', bloomChance: 1, branch: 'curve', leafShape: 'leaf',
                        shed: 9, hill: '#E7A6B4', fly: '255,190,210', flowerHues: [335, 350, 20], bg1: '#FCE7EC', bg2: '#FFF6EF' },
              fire: { style: 'candles', warm: '#FF3D6E', cool: '#FFB36B', bg1: '#2A0E16', bg2: '#0C0407' } }
    },
    solarpunk: {
      codes: ['solarpunk'],
      name: 'Solarpunk', title: 'Solarpunk Visualiser', mark: '☀', docTitle: 'Solarpunk Visualiser ☀',
      vars: { bg1: '#EAF4D8', bg2: '#FFF7DC', glow1: '120,180,90', glow2: '240,190,70',
              card: '#FBFAEC', field: '#FFFFFF', ink: '#1F3A24', muted: 'rgba(31,58,36,.64)',
              accent: '#2F7D4A', accent2: '#E0A82E', accentRgb: '47,125,74', line: 'rgba(47,125,74,.28)',
              onAccent: '#FBFAEC', shadow: '0 16px 34px rgba(47,90,50,.16)' },
      look: { c1: '#2F7D4A', c2: '#E0A82E', bg1: '#FFFBE6', bg2: '#DDEFC6', dark: false, layout: 'rise', glyphs: ['🌱', '🌿', '🌻'],
              emoji: ['🌱', '🍃', '🌿', '🌻', '☀️'], clock: 'solarpunk',
              liquid: { kind: 'ink', fill: '#1F5C3D', rim: '#6FBF5E', bg1: '#E9F7D6', bg2: '#CDE8C0' },
              rain: { shape: 'streak', color: '#2F7D4A', bolt: '#E0A82E', bg1: '#FFF4C4', bg2: '#DDEFC6' },
              nature: { trunk: '#6B4A2A', leaf: '#3FA34D', bloom: '#F2C230', bloomChance: 0.45, branch: 'curve', leafShape: 'leaf',
                        hill: '#6FAE5A', fly: '236,255,150', flowerHues: [48, 30, 330, 190], bg1: '#DFF3FF', bg2: '#F5F3C8' },
              fire: { style: 'sun', warm: '#E8B01E', cool: '#4FCB62', bg1: '#12260F', bg2: '#040A04' } }
    },
    cyberpunk: {
      codes: ['cyberpunk'],
      name: 'Cyberpunk', title: 'CYBER//VISUALISER', mark: '_', docTitle: 'CYBER//VISUALISER',
      vars: { bg1: '#050608', bg2: '#0B1220', glow1: '0,240,255', glow2: '255,0,170',
              card: 'rgba(10,16,26,.92)', field: 'rgba(0,240,255,.07)', ink: '#D8FBFF', muted: 'rgba(216,251,255,.6)',
              accent: '#00F0FF', accent2: '#FF00AA', accentRgb: '0,240,255', line: 'rgba(0,240,255,.32)',
              onAccent: '#001417', shadow: '0 0 0 1px rgba(0,240,255,.12), 0 16px 34px rgba(0,0,0,.6)',
              font: '"Cascadia Mono","Consolas","SF Mono","Menlo",monospace' },
      look: { c1: '#00F0FF', c2: '#F6FF4D', bg1: '#070C14', bg2: '#010203', dark: true, layout: 'rise', glyphs: ['1', '0'],
              digital: true, emoji: ['💾', '🔌', '👾', '🤖', '⚡'], clock: 'cyberpunk',
              liquid: { kind: 'mercury', fill: '#02080C', rim: '#00F0FF', bg1: '#070C14', bg2: '#010203' },
              rain: { shape: 'glyph', glyphs: ['1', '0'], fall: 0.85, color: '#00F0FF', bolt: '#FF00AA', bg1: '#070C14', bg2: '#010203' },
              nature: { trunk: '#00F0FF', leaf: '#FF00AA', bloom: '#F6FF4D', bloomChance: 0.2, glow: true, dark: true, branch: 'straight', leafShape: 'square',
                        hill: '#0B3A46', fly: '246,255,77', flowerHues: [185, 320, 62], bg1: '#070C14', bg2: '#010203' },
              fire: { style: 'pixels', warm: '#00C8F0', cool: '#FF00AA', bg1: '#070C14', bg2: '#010203' } }
    },
    nihilum: {
      codes: ['decensus ad nihilum', 'descensus ad nihilum'],
      name: 'Decensus Ad Nihilum', title: 'Decensus Ad Nihilum', mark: '●', docTitle: 'Decensus Ad Nihilum',
      vars: { bg1: '#000000', bg2: '#0A0710', glow1: '120,90,160', glow2: '255,150,70',
              card: 'rgba(12,10,16,.94)', field: 'rgba(255,255,255,.06)', ink: '#D9D4E2', muted: 'rgba(217,212,226,.55)',
              accent: '#8E7CA8', accent2: '#FF9A4A', accentRgb: '142,124,168', line: 'rgba(142,124,168,.26)',
              onAccent: '#08060B', shadow: '0 16px 40px rgba(0,0,0,.8)' },
      look: { c1: '#FF9A4A', c2: '#FFF1D6', bg1: '#06040A', bg2: '#000000', dark: true, layout: 'ring', inward: true, glyphs: null,
              emoji: ['🌑', '🕳️', '☄️', '💫', '⭐'], clock: 'nihilum',
              liquid: { kind: 'ink', fill: '#000000', rim: '#FF9A4A', bg1: '#0B0810', bg2: '#000000' },
              rain: { shape: 'streak', up: true, color: '#FF9A4A', bolt: '#FFF1D6', bg1: '#06040A', bg2: '#000000' },
              nature: { trunk: '#B9B2C6', leaf: '#FF9A4A', bloom: '#FFF1D6', bloomChance: 0.15, glow: true, dark: true, branch: 'curve', leafShape: 'leaf',
                        shed: 3, hill: '#2A2233', fly: '255,170,90', flowerHues: [28, 275], bg1: '#06040A', bg2: '#000000' },
              fire: { style: 'vortex', warm: '#6A3CC4', cool: '#FF9A4A', bg1: '#06040A', bg2: '#000000' } }
    },
    incertum: {
      codes: ['ascensus ad incertum'],
      name: 'Ascensus Ad Incertum', title: 'Ascensus Ad Incertum', mark: '∞', docTitle: 'Ascensus Ad Incertum',
      vars: { bg1: '#FFFFFF', bg2: '#F3F6FF', glow1: '120,200,255', glow2: '255,140,220',
              card: '#FFFFFF', field: '#F4F6FB', ink: '#1C1F2E', muted: 'rgba(28,31,46,.6)',
              accent: '#5B6CFF', accent2: '#FF6FB5', accentRgb: '91,108,255', line: 'rgba(91,108,255,.22)',
              onAccent: '#FFFFFF', shadow: '0 16px 34px rgba(80,100,200,.14)' },
      look: { c1: '#5B6CFF', c2: '#FF6FB5', bg1: '#FFFFFF', bg2: '#EEF2FF', dark: false, layout: 'rise', rainbow: true, glyphs: null,
              emoji: ['☁️', '🕊️', '💫', '✨', '🌈'], clock: 'heaven',
              liquid: { kind: 'ink', rainbow: true, fill: '#FFFFFF', rim: '#5B6CFF', bg1: '#FFFFFF', bg2: '#E6ECFF' },
              rain: { shape: 'streak', rainbow: true, color: '#5B6CFF', bolt: '#FF6FB5', bg1: '#FFFFFF', bg2: '#EEF2FF' },
              nature: { trunk: '#C9B27A', leaf: '#5B6CFF', bloom: '#FF6FB5', bloomChance: 0.3, rainbow: true, branch: 'curve', leafShape: 'leaf',
                        hill: '#BFD0FF', fly: '255,220,150', bg1: '#FFFFFF', bg2: '#EEF2FF' },
              fire: { style: 'aurora', warm: '#FF8AD0', cool: '#9FD0FF', bg1: '#151A2E', bg2: '#05060C', rainbow: true } }
    }
  };

  var VAR_NAMES = { bg1: '--bg1', bg2: '--bg2', glow1: '--glow1-rgb', glow2: '--glow2-rgb', card: '--card',
                    field: '--field', ink: '--ink', muted: '--muted', accent: '--accent', accent2: '--accent2',
                    accentRgb: '--accent-rgb', line: '--line', onAccent: '--on-accent', shadow: '--shadow',
                    font: '--font' };

  T.current = 'omega';
  T.look = T.THEMES.omega.look;

  function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  T.findByCode = function(text){
    var want = norm(text);
    if (!want) return null;
    for (var id in T.THEMES){
      var codes = T.THEMES[id].codes;
      for (var i = 0; i < codes.length; i++) if (norm(codes[i]) === want) return id;
    }
    return null;
  };

  T.unlocked = function(){
    try {
      var a = JSON.parse(localStorage.getItem('viz.themes') || '[]');
      return Array.isArray(a) ? a.filter(function(id){ return !!T.THEMES[id]; }) : [];
    } catch (e) { return []; }
  };
  function remember(id){
    var a = T.unlocked();
    if (id !== 'omega' && a.indexOf(id) === -1){
      a.push(id);
      try { localStorage.setItem('viz.themes', JSON.stringify(a)); } catch (e) {}
    }
  }

  T.apply = function(id, save){
    var th = T.THEMES[id] || T.THEMES.omega;
    if (!T.THEMES[id]) id = 'omega';
    var root = document.documentElement;
    for (var key in VAR_NAMES){
      if (th.vars[key] !== undefined) root.style.setProperty(VAR_NAMES[key], th.vars[key]);
      else root.style.removeProperty(VAR_NAMES[key]);
    }
    root.setAttribute('data-theme', id);
    T.current = id;
    T.look = th.look;
    document.title = th.docTitle;
    var h = document.getElementById('appTitle');
    if (h){
      h.textContent = th.title + ' ';
      var sp = document.createElement('span');
      sp.textContent = th.mark;
      h.appendChild(sp);
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th.vars.bg1);
    if (save !== false){
      try { localStorage.setItem('viz.theme', id); } catch (e) {}
      remember(id);
    }
    // a copy of this theme's colours for the small script at the top of
    // index.html, which sets them before the first paint on the next visit
    if (save !== false || id === saved()){
      try {
        var copy = {};
        for (var vk in VAR_NAMES) if (th.vars[vk] !== undefined) copy[VAR_NAMES[vk]] = th.vars[vk];
        localStorage.setItem('viz.themeVars', JSON.stringify(copy));
      } catch (e) {}
    }
    if (App.canvas && App.canvas.invalidateBG) App.canvas.invalidateBG();
    if (T.onChange) T.onChange(id);
  };

  function saved(){ try { return localStorage.getItem('viz.theme') || 'omega'; } catch (e) { return 'omega'; } }

  // returns the theme id the code unlocked, or null
  T.enterCode = function(text){
    var id = T.findByCode(text);
    if (id) T.apply(id);
    return id;
  };

  T.init = function(){
    var saved = null;
    try { saved = localStorage.getItem('viz.theme'); } catch (e) {}
    T.apply(saved && T.THEMES[saved] ? saved : 'omega', false);
  };
})();
