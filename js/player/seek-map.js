/* =========================================================================
   SEEK MAP (ROADMAP item 6)
   Behind the seek bar: the song's shape, read once from the whole file by
   js/core/song-map.js. The energy curve is a soft hill (brighter for the
   part already played) and the strongest hits are small ticks, so the
   loud parts and the drops can be seen and jumped to.
     - only for songs on this device (and the app's own address): a song
       from another web address would have to be downloaded a second time
     - not for files over 15 minutes (decoding one holds the whole song in
       memory) and not on the plain player, which cannot be read
     - the work runs in small slices (song-map.js), so the page never
       freezes; a new song cancels the old one's map
   Maps are kept for the session by song address (App.player.seekMaps).
   ========================================================================= */
(function(){
  'use strict';
  var S = App.state, SM = App.songMap;
  var cv = document.getElementById('seekMap');
  if (!cv || !SM) return;
  var c2 = cv.getContext('2d');
  var MAX_SECONDS = 900;
  var maps = {}, want = '', current = null, accent = '';
  if (App.player) App.player.seekMaps = maps;

  function readable(url){
    if (!url) return false;
    if (url.indexOf('blob:') === 0) return true;
    try { return new URL(url, location.href).origin === location.origin; } catch (e) { return false; }
  }
  function accentRGB(){
    var v = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    return v || '200,140,255';
  }

  function draw(){
    var w = Math.max(1, Math.round(cv.clientWidth * (window.devicePixelRatio || 1)));
    var h = Math.max(1, Math.round(cv.clientHeight * (window.devicePixelRatio || 1)));
    if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
    c2.clearRect(0, 0, w, h);
    var map = current;
    if (!map || !map.duration || !map.energy || !map.energy.values.length) return;
    accent = accentRGB();
    var el = S.audio, dur = el.duration || map.duration, played = dur ? el.currentTime / dur : 0;
    var vals = map.energy.values, step = map.energy.step, mid = h / 2;
    // the hill: drawn mirrored round the bar, so the bar runs through its middle
    var path = new Path2D();
    path.moveTo(0, mid);
    for (var i = 0; i < vals.length; i++){
      var x = (i + 0.5) * step / dur * w;
      path.lineTo(x, mid - (0.12 + 0.88 * vals[i]) * mid);
    }
    path.lineTo(w, mid);
    for (var j = vals.length - 1; j >= 0; j--){
      var xb = (j + 0.5) * step / dur * w;
      path.lineTo(xb, mid + (0.12 + 0.88 * vals[j]) * mid);
    }
    path.closePath();
    c2.fillStyle = 'rgba(' + accent + ',0.24)';
    c2.fill(path);
    c2.save();
    c2.beginPath();
    c2.rect(0, 0, played * w, h);
    c2.clip();
    c2.fillStyle = 'rgba(' + accent + ',0.5)';
    c2.fill(path);
    c2.restore();
    // the hits: a tick each, taller and brighter the stronger it is
    var k = window.devicePixelRatio || 1;
    for (var n = 0; n < map.hits.length; n++){
      var hit = map.hits[n], hx = Math.round(hit.t / dur * w), th = mid * (0.35 + 0.65 * hit.strength);
      c2.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.55 * hit.strength).toFixed(2) + ')';
      c2.fillRect(hx - k * 0.5, mid - th, Math.max(1, k), th * 2);
    }
  }

  function build(track, url){
    want = url;
    current = maps[url] || null;
    draw();
    if (current || maps[url] === false) return;
    maps[url] = false;              // being made (or cannot be): asked once per song
    fetch(url).then(function(r){ return r.arrayBuffer(); }).then(function(buf){
      return SM.fromArrayBuffer(buf, { cancelled: function(){ return want !== url; } });
    }).then(function(map){
      maps[url] = map;
      if (want === url){ current = map; draw(); }
    }, function(){
      if (want !== url) delete maps[url];   // cancelled: may be made next time the song comes round
    });
  }

  S.audio.addEventListener('loadedmetadata', function(){
    var el = S.audio, url = el.currentSrc || el.src;
    if (S.usingPlain || !readable(url) || !(el.duration > 0) || el.duration > MAX_SECONDS){ want = ''; current = null; draw(); return; }
    build(S.playlist[S.currentIndex], url);
  });
  S.audio.addEventListener('emptied', function(){ want = ''; current = null; draw(); });
  var lastDraw = 0;
  S.audio.addEventListener('timeupdate', function(){
    var t = performance.now();
    if (current && t - lastDraw > 400){ lastDraw = t; draw(); }
  });
  S.audio.addEventListener('seeked', draw);
  window.addEventListener('resize', draw);
  // a new theme code changes the accent colour
  setInterval(function(){ if (current && accentRGB() !== accent) draw(); }, 1500);
  App.seekMap = { draw: draw, current: function(){ return current; } };
})();
