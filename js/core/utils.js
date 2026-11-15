/* =========================================================================
   Generic helpers — no CFG, no DOM globals. Canvas-drawing helpers take the
   2D context as their first argument so any file can use them with any
   context, rather than closing over one shared global.
   ========================================================================= */
(function(){
  'use strict';
  var U = App.util;

  U.clamp01 = function(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); };
  U.lerp = function(a, b, t){ return a + (b - a) * t; };
  U.env = function(cur, target, atk, rel, dt){
    var k = target > cur ? atk : rel;
    return cur + (target - cur) * (1 - Math.exp(-k * dt));
  };

  U.hexRGB = function(hex){
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgba = function(rgb, a){ return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; };

  U.roundRect = function(c, x, y, w, h, r){
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  };
  U.polyPath = function(c, x, y, r, sides, rot){
    c.beginPath();
    for (var i = 0; i < sides; i++){
      var a = rot + (i / sides) * 6.283;
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
  };
  U.wrapText = function(c, text, cx, y, maxW, lineH, fontPx){
    c.font = fontPx + 'px Karla, sans-serif';
    c.fillStyle = 'rgba(234,242,255,0.62)';
    var words = String(text).split(' '), line = '', yy = y;
    for (var i = 0; i < words.length; i++){
      var test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line){
        c.fillText(line, cx, yy);
        yy += lineH;
        line = words[i];
      } else line = test;
    }
    if (line) c.fillText(line, cx, yy);
  };

  U.formatTime = function(sec){
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  U.escapeHtml = function(str){
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  };
  U.isAudioFile = function(file){
    // mp4 / webm / mov are videos, but the player can play their sound track
    return (file.type && file.type.indexOf('audio/') === 0) || /\.(mp3|wav|ogg|oga|opus|m4a|flac|aac|weba|mp4|webm|mov)$/i.test(file.name);
  };
  U.stripExt = function(name){ return name.replace(/\.[^/.]+$/, ''); };
})();
