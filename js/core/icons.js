/* =========================================================================
   ICONS: small drawn icons for buttons (pages, modes, games, codes, layouts).
   Drawn as lines in the button's own text colour, so they follow every
   theme; emoji would not. Each entry is the inside of a 24 x 24 SVG.
     App.icons.html('fire')            the icon as an <svg> string ('' if there is none)
     App.icons.label('fire', 'Fire')   icon + the text in a <span>, for innerHTML
     App.icons.find(['opt-ring', ...]) the first of these names that has an icon
   Names: page-<id>, a mode or game id, theme-<id>, opt-<layout option>.
   engine/check.js fails when a page, mode, game or theme has no icon.
   ========================================================================= */
(function(){
  'use strict';
  var c = function(x, y, r){ return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; };
  var p = function(d){ return '<path d="' + d + '"/>'; };
  var dot = function(x, y){ return '<circle class="fill" cx="' + x + '" cy="' + y + '" r="1.3"/>'; };

  var I = {
    /* pages */
    'page-music': c(12, 12, 9) + c(12, 12, 2.5) + p('M12 3a9 9 0 0 1 6.4 2.6'),
    'page-games': p('M7 8h10a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6h-4A4 4 0 0 1 3 13v-1a4 4 0 0 1 4-4z') + p('M7.5 10.5v3M6 12h3') + dot(16, 11) + dot(17.5, 13.5),
    'page-settings': c(12, 12, 3.2) + p('M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1'),
    'page-guide': p('M12 6c-2-1.6-5-2-8-1.5v13c3-.5 6-.1 8 1.5 2-1.6 5-2 8-1.5v-13c-3-.5-6-.1-8 1.5z') + p('M12 6v13'),
    /* modes */
    basic: p('M4 20V11M9 20V5M14 20V9M19 20v-6'),
    strings: p('M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0 3.5-5 5-3'),
    emoji: c(12, 12, 9) + p('M8 14.5c1.2 1.6 2.5 2.3 4 2.3s2.8-.7 4-2.3') + dot(9, 10) + dot(15, 10),
    fire: p('M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.3 1.8 2.3C11.5 9 10.5 6 12 3z'),
    rain: p('M7 14a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.3 1.5A3.3 3.3 0 0 1 17 14z') + p('M8 17l-1 3M12 17l-1 3M16 17l-1 3'),
    nature: p('M12 21v-7') + p('M12 3c-3.5 0-6 2.5-6 5.5S8.5 14 12 14s6-2.5 6-5.5S15.5 3 12 3z') + p('M12 11l2.5-2.5'),
    clock: c(12, 12, 9) + p('M12 7v5l3.5 2'),
    liquid: p('M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z') + p('M9.5 15a2.5 2.5 0 0 0 2 2.3'),
    ice: p('M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8') + p('M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5'),
    aqua: p('M3 12c3-4.5 9-5.5 13-1.5l4.5-3v9L16 13.5C12 17.5 6 16.5 3 12z') + dot(8, 11.5),
    piano: p('M3 5h18v14H3z') + p('M8 5v14M13 5v14M18 5v14') + p('M6.5 5v8h3V5M11.5 5v8h3V5M16.5 5v8h3V5'),
    /* games */
    rpg: p('M5 19L16 8') + p('M17.5 2.5l1 3 3 1-3 1-1 3-1-3-3-1 3-1z') + p('M4 6c1.5-1 2.5-1 4 0M3 11c1.5-1 2.5-1 4 0'),
    td: p('M6 21V9l-1.5-1.5V3h3v2h3V3h3v2h3V3h3v4.5L18 9v12z') + p('M10.5 21v-4a1.5 1.5 0 0 1 3 0v4'),
    cards: p('M4 7.5l9-2.5 3.5 12.5-9 2.5z') + p('M14.5 6l5 1.5-2.5 10'),
    sandbox: c(12, 12, 4) + p('M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7'),
    /* codes */
    'theme-omega': p('M5 20h4.5v-2.5C7.5 16.5 6 14.5 6 12a6 6 0 0 1 12 0c0 2.5-1.5 4.5-3.5 5.5V20H19'),
    'theme-tessa': p('M13 2.5L5 13.5h6L10 21.5l9-11.5h-6z'),
    'theme-newyear': p('M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z') + p('M19 16.5v4M17 18.5h4'),
    'theme-halloween': p('M12 6c-5 0-8 3-8 7s3 7 8 7 8-3 8-7-3-7-8-7z') + p('M12 6c0-1.5.5-2.5 2-3') + p('M8 11.5l2 1.5H8zM16 11.5l-2 1.5h2zM8.5 16h7'),
    'theme-love': p('M12 20S4 15 4 9.5A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 20 9.5C20 15 12 20 12 20z'),
    'theme-solarpunk': p('M5 19C5 10 10 5 20 4c0 10-5 15-15 15z') + p('M5 19l8-8'),
    'theme-cyberpunk': p('M7 7h10v10H7z') + p('M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5'),
    'theme-nihilum': c(12, 12, 4) + p('M3 14.5c3 3 15 1 18-5') + '<circle class="fill" cx="12" cy="12" r="3"/>',
    'theme-incertum': p('M12 12c-2-3-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1 5.5-4zm0 0c2 3 3.5 4 5.5 4a4 4 0 0 0 0-8c-2 0-3.5 1-5.5 4z'),
    /* layout options (a fire style named after a code uses that code's icon) */
    'opt-theme': p('M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z') + p('M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z'),
    'opt-mirror': p('M4 12h16') + p('M7 9v6M10.5 6v12M14 8v8M17.5 10v4'),
    'opt-rise': p('M4 20h16') + p('M7 20v-5M10.5 20V7M14 20v-9M17.5 20v-4'),
    'opt-edges': p('M4 4h16M4 20h16') + p('M8 4v4M12 4v6M16 4v3M8 20v-3M12 20v-5M16 20v-4'),
    'opt-dots': dot(5, 14) + dot(9, 9) + dot(13, 12) + dot(17, 7) + p('M5 14l4-5 4 3 4-5'),
    'opt-ring': c(12, 12, 5) + p('M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7'),
    'opt-line': p('M3 12h18') + dot(7, 12) + dot(12, 12) + dot(17, 12),
    'opt-circle': c(12, 12, 8),
    'opt-heart': p('M12 20S4 15 4 9.5A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 20 9.5C20 15 12 20 12 20z'),
    'opt-bubbles': c(8, 15, 4) + c(16, 9, 3) + c(17, 17, 1.8),
    'opt-fade': p('M4 12h3M10 12h2M15 12h1.5M19 12h.5') + p('M4 7h6M4 17h9'),
    /* the Clock's designs */
    'opt-classic': c(12, 12, 8.5) + p('M12 7.5V12l3 2') + p('M12 2v1.5M12 20.5V22M2 12h1.5M20.5 12H22'),
    'opt-gears': p('M10.5 3h3l.5 2.2 1.6.7 2-1.2 2.1 2.1-1.2 2 .7 1.6 2.2.5v3l-2.2.5-.7 1.6 1.2 2-2.1 2.1-2-1.2-1.6.7-.5 2.2h-3l-.5-2.2-1.6-.7-2 1.2-2.1-2.1 1.2-2-.7-1.6L3 13.5v-3l2.2-.5.7-1.6-1.2-2 2.1-2.1 2 1.2 1.6-.7z') + c(12, 12, 3),
    'opt-garden': p('M7 21c0-6 2-9.5 5.5-11.5S18 5 18 2.5') + p('M9.2 14.5C6.5 14.8 4.6 13.4 4 10.8c2.6-.3 4.6 1.1 5.2 3.7z') + p('M13.5 9c.2-2.6 2-4.4 4.8-4.6-.2 2.6-2 4.4-4.8 4.6z'),
    'opt-grid': p('M2 10.5h20') + p('M12 10.5V21M9.5 10.5L4 21M14.5 10.5L20 21M7 10.5L1.5 17M17 10.5l5.5 6.5') + p('M3.5 13.5h17M2 17.5h20'),
    'opt-sky': p('M3 5.5c6 0 10.5 4 12 10.5') + p('M3 5.5c0 5 3 9 8.5 10.5H15') + p('M5.5 9.5H10M7.5 13H12.5') + p('M15 19.5a2.5 2.5 0 0 1 .4-5 3.2 3.2 0 0 1 6 1A2 2 0 0 1 21 19.5z'),
    'opt-hearth': p('M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.3 1.8 2.3C11.5 9 10.5 6 12 3z') + p('M4 21h16'),
    'opt-fireworks': p('M12 12V4M12 12l5.5-5.5M12 12h8M12 12l5.5 5.5M12 12v8M12 12l-5.5 5.5M12 12H4M12 12L6.5 6.5'),
    'opt-cauldron': p('M4 9h16') + p('M5.5 9c-1 6 1.5 11 6.5 11s7.5-5 6.5-11') + p('M9 5.5c0-1 1-1 1-2M14 5.5c0-1 1-1 1-2'),
    'opt-candles': p('M9 21V11h6v10z') + p('M12 11V9') + p('M12 3c1.5 1.5 2 2.5 2 3.5a2 2 0 0 1-4 0c0-1 .5-2 2-3.5z'),
    'opt-sun': c(12, 12, 4) + p('M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7'),
    'opt-pixels': p('M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z'),
    'opt-vortex': p('M12 12a2 2 0 1 1 2-2 4.5 4.5 0 1 1-4.5-4.5 7 7 0 1 1 7 7 9 9 0 0 1-9 9'),
    'opt-aurora': p('M3 8c3-3 6 3 9 0s6-3 9 0') + p('M3 13c3-3 6 3 9 0s6-3 9 0') + p('M6 17v3M12 16v4M18 17v3'),
    'opt-plasma': c(12, 10.5, 7.5) + p('M9 20.5h6l-1-2.5h-4z') + p('M12 10.5l-4-3M12 10.5l4.5-2M12 10.5l1 5M12 10.5l-4.5 2.5') + dot(12, 10.5)
  };

  var X = App.icons = {};
  X.has = function(name){ return !!I[name]; };
  X.find = function(names){ for (var i = 0; i < names.length; i++) if (I[names[i]]) return names[i]; return null; };
  X.html = function(name){
    return I[name] ? '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + I[name] + '</svg>' : '';
  };
  function esc(s){ return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  X.label = function(name, text){ return X.html(name) + '<span>' + esc(text) + '</span>'; };
  // the icon for one option of a layout bar: its own, or the code's or mode's of the same name
  X.forOption = function(opt){ return X.find(['opt-' + opt, 'theme-' + opt, opt]); };

  // the mode and game buttons are already in the page (index.html): give each its icon
  var btns = document.querySelectorAll('.mode-btn');
  for (var b = 0; b < btns.length; b++){
    var id = btns[b].getAttribute('data-mode');
    if (I[id]) btns[b].innerHTML = X.label(id, btns[b].textContent);
  }
})();
