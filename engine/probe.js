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
})();
