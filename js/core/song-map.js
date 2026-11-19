/* =========================================================================
   SONG MAP (pure maths; the small browser entry at the end decodes a file)
   Reads a whole song once and finds its tempo, its beats, its strongest
   hits, its sections and an energy curve. The format is in docs/GAME-PLAN.md
   ("song map"). The browser (js/player/seek-map.js) and Node
   (engine/songmap.js) feed it the same way and get the same answers.

   Steps (each one runs in small slices, so a page never freezes):
     samples -> frames: a spectrum 86 times a second -> "novelty" (how much
                new sound starts in this frame) and loudness
             -> tempo: the delay at which the novelty best repeats itself
             -> beats: the chain of novelty peaks one beat apart that scores
                best (dynamic programming, Ellis 2007, FACTS.md)
             -> energy curve (2 points a second) -> sections (where the
                energy steps up or down and stays there)
             -> hits: novelty peaks, ranked by how sharp they are and how
                much louder the song is after them than before
   The numbers below are the song map's own. They shape nothing the modes
   hear; the sound-shaping numbers stay in analysis.js DEFAULT_CFG.
   ========================================================================= */
(function(root){
  'use strict';

  var C = {
    rate: 22050,            // decode rate (browser and Node): enough for drums, half the work of 44.1 kHz
    frameRate: 86,          // novelty frames a second (256 samples at 22,050 Hz)
    minBpm: 50, maxBpm: 220,// tempos considered at all
    likeLo: 70, likeHi: 180,// tempos preferred: outside this range a tempo is pushed toward half or double
    tightness: 680,         // how strongly beats keep one tempo (Ellis 2007 uses 680)
    energyStep: 0.5,        // seconds between points of the energy curve
    energyRangeDb: 30,      // the curve covers this many decibels below the song's loud parts
    sectionHold: 8,         // seconds a change of energy must hold to start a new section
    sectionStep: 0.1,       // how big that change must be (0-1 energy, about 3 dB)
    hitGap: 2,              // seconds between two listed hits at least
    sliceMs: 12             // longest piece of work between two pauses in the browser
  };

  function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function r3(v){ return Math.round(v * 1000) / 1000; }
  var now = (typeof performance !== 'undefined' && performance.now) ? function(){ return performance.now(); } : function(){ return Date.now(); };

  /* ---------- FFT (radix 2, in place) ---------- */
  var fftTables = {};
  function tablesFor(N){
    if (fftTables[N]) return fftTables[N];
    var bits = Math.round(Math.log(N) / Math.LN2), rev = new Uint32Array(N), i, b;
    for (i = 0; i < N; i++){ var r = 0; for (b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
    var cos = new Float64Array(N / 2), sin = new Float64Array(N / 2);
    for (i = 0; i < N / 2; i++){ cos[i] = Math.cos(-2 * Math.PI * i / N); sin[i] = Math.sin(-2 * Math.PI * i / N); }
    return (fftTables[N] = { rev: rev, cos: cos, sin: sin });
  }
  function fft(re, im){
    var N = re.length, T = tablesFor(N), rev = T.rev, i, j, t;
    for (i = 0; i < N; i++){
      j = rev[i];
      if (j > i){ t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (var size = 2; size <= N; size <<= 1){
      var half = size >> 1, step = N / size;
      for (i = 0; i < N; i += size){
        for (j = 0; j < half; j++){
          var wr = T.cos[j * step], wi = T.sin[j * step], a = i + j, bb = a + half;
          var tr = re[bb] * wr - im[bb] * wi, ti = re[bb] * wi + im[bb] * wr;
          re[bb] = re[a] - tr; im[bb] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
  }

  // value below which `share` of the (copied) values lie
  function quantile(arr, share){
    if (!arr.length) return 0;
    var s = Array.prototype.slice.call(arr).sort(function(a, b){ return a - b; });
    return s[Math.min(s.length - 1, Math.max(0, Math.floor(share * (s.length - 1))))];
  }
  function prefix(arr){
    var p = new Float64Array(arr.length + 1);
    for (var i = 0; i < arr.length; i++) p[i + 1] = p[i] + arr[i];
    return p;
  }
  // mean of arr[a..b) through its prefix sums, with the ends clipped
  function meanOf(p, a, b){
    var n = p.length - 1;
    a = Math.max(0, Math.min(n, a)); b = Math.max(0, Math.min(n, b));
    return b > a ? (p[b] - p[a]) / (b - a) : 0;
  }

  /* ---------- the builder: one song, worked through in slices ----------
     channels: one Float32Array per channel (mixed to mono here), or one
     Float32Array. sr: its sample rate. step(ms) works for about that long
     and returns true when the map is ready (in .map). */
  function createBuilder(channels, sr){
    if (!channels || channels.length === undefined || typeof channels[0] === 'number') channels = [channels];
    var nch = channels.length, len = channels[0] ? channels[0].length : 0;
    var hop = Math.pow(2, Math.round(Math.log(sr / C.frameRate) / Math.LN2)), N = hop * 4;
    var fps = sr / hop, binHz = sr / N;
    var nFrames = len >= N ? Math.floor((len - N) / hop) + 1 : 0;
    var duration = len / sr;

    var win = new Float64Array(N), re = new Float64Array(N), im = new Float64Array(N), prevL = new Float64Array(N / 2 + 1);
    for (var i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    var norm = N / 4;   // a full-scale sine reads about 1 after the window
    var kLow = Math.ceil(150 / binHz), kMid0 = kLow, kMid1 = Math.floor(2500 / binHz), kHigh0 = Math.ceil(5000 / binHz);

    var nov = new Float32Array(nFrames), fLow = new Float32Array(nFrames), fMid = new Float32Array(nFrames),
        fHigh = new Float32Array(nFrames), db = new Float32Array(nFrames);
    var B = { phase: 'frames', f: 0, progress: 0, map: null, fps: fps };
    var o, acf, maxLag, lag = 0, bpm = 0, conf = 0, tau = 0, cum, back, t = 0, beats = [], energy = [], sections = [], hits = [];
    var topDb = 0, firstSound = 0, lastSound = duration;

    function sample(j){
      if (nch === 1) return channels[0][j];
      var s = 0;
      for (var c = 0; c < nch; c++) s += channels[c][j];
      return s / nch;
    }
    // time of frame f: the middle of its window, where a new sound shows up most
    function timeOf(f){ return (f * hop + N / 2) / sr; }

    function doFrame(f){
      var base = f * hop, i, p = 0, h0 = N / 2 - hop / 2;
      for (i = 0; i < N; i++){
        var s = sample(base + i);
        re[i] = s * win[i]; im[i] = 0;
        if (i >= h0 && i < h0 + hop) p += s * s;
      }
      fft(re, im);
      var sum = 0, lo = 0, mi = 0, hi = 0;
      for (var k = 1; k <= N / 2; k++){
        var m = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / norm;
        var L = Math.log(1 + 1000 * m), d = L - prevL[k];
        prevL[k] = L;
        if (f > 0 && d > 0){
          sum += d;
          if (k < kLow) lo += d; else if (k <= kMid1 && k >= kMid0) mi += d; else if (k >= kHigh0) hi += d;
        }
      }
      nov[f] = sum; fLow[f] = lo; fMid[f] = mi; fHigh[f] = hi;
      db[f] = 10 * Math.log(p / hop + 1e-12) / Math.LN10;
    }

    // after the frames: the onset curve o (novelty above its own local average, in standard deviations)
    function prepare(){
      var pn = prefix(nov), w = Math.round(0.4 * fps), mean = pn[nFrames] / Math.max(1, nFrames), v = 0, f;
      for (f = 0; f < nFrames; f++) v += (nov[f] - mean) * (nov[f] - mean);
      var sd = Math.sqrt(v / Math.max(1, nFrames)) || 1;
      o = new Float32Array(nFrames);
      for (f = 0; f < nFrames; f++) o[f] = Math.max(0, nov[f] - meanOf(pn, f - w, f + w + 1)) / sd;
      maxLag = Math.min(nFrames - 1, Math.ceil(4 * 60 / C.minBpm * fps) + 2);
      acf = new Float64Array(Math.max(1, maxLag + 1));
      // loudness: where the song really starts and ends, and how loud its loud parts are
      topDb = quantile(db, 0.98);
      for (f = 0; f < nFrames; f++) if (db[f] < topDb - 60) db[f] = topDb - 60;
      var f0 = 0, f1 = nFrames - 1;
      while (f0 < nFrames && db[f0] < topDb - 40) f0++;
      while (f1 > 0 && db[f1] < topDb - 40) f1--;
      firstSound = f0 < nFrames ? timeOf(f0) - 0.1 : 0;
      lastSound = f1 > 0 ? timeOf(f1) + 0.1 : duration;
    }
    var oMean = 0, oVar = 0;
    function acfLag(l){
      var s = 0, n = nFrames - l;
      for (var f = 0; f < n; f++) s += (o[f] - oMean) * (o[f + l] - oMean);
      acf[l] = n > 0 ? s / n : 0;
    }
    function acfAt(x){
      var i = Math.floor(x), fr = x - i;
      if (i + 1 > maxLag) return 0;
      return (acf[i] * (1 - fr) + acf[i + 1] * fr) / (oVar || 1);
    }
    // how well a tempo explains the repeats: the novelty's self-likeness one, two, three and four beats on
    function comb(b){
      var T = 60 * fps / b, s = 0, n = 0;
      for (var k = 1; k <= 4; k++){ if (k * T + 1 > maxLag) break; s += acfAt(k * T); n++; }
      return n ? s / n : 0;
    }
    function liking(b){
      var e = b < C.likeLo ? Math.log(C.likeLo / b) / Math.LN2 : (b > C.likeHi ? Math.log(b / C.likeHi) / Math.LN2 : 0);
      return Math.exp(-0.5 * (e / 0.2) * (e / 0.2));
    }
    function findTempo(){
      var best = -1, bestB = 0, all = [];
      for (var b = C.minBpm; b <= C.maxBpm + 1e-9; b += 0.1){
        var raw = comb(b), sc = raw * liking(b);
        all.push(raw);
        if (sc > best){ best = sc; bestB = b; }
      }
      if (!(best > 0)){ bpm = 0; conf = 0; return; }
      // a parabola through the best point and its neighbours finds the peak between grid steps
      var y0 = comb(bestB - 0.1) * liking(bestB - 0.1), y1 = best, y2 = comb(bestB + 0.1) * liking(bestB + 0.1);
      var den = y0 - 2 * y1 + y2, off = den < 0 ? 0.5 * (y0 - y2) / den : 0;
      bpm = bestB + Math.max(-0.5, Math.min(0.5, off)) * 0.1;
      // Confidence: how far the tempo stands above its strongest rival, a tempo that is not the same beat
      // felt at half, double, two or three thirds (those would be fine answers too). Measured against the
      // old rule (above the median of all tempos), which read 1 for five songs of six (2026-11-19).
      var RATIOS = [0.5, 2 / 3, 0.75, 1, 4 / 3, 1.5, 2], rival = 0;
      for (var i = 0; i < all.length; i++){
        var bb = C.minBpm + i * 0.1, related = false;
        for (var q = 0; q < RATIOS.length; q++) if (Math.abs(bb / bpm - RATIOS[q]) < 0.04 * RATIOS[q]){ related = true; break; }
        if (!related && all[i] * liking(bb) > rival) rival = all[i] * liking(bb);
      }
      conf = clamp01(1 - Math.max(0, rival) / best);
    }

    // beats by dynamic programming: each frame's best score is its own onset plus the best earlier beat
    // about one beat back, minus a cost for straying from the tempo
    var costs, dMin, dMax, local;
    function startBeats(){
      tau = 60 * fps / bpm;
      dMin = Math.max(1, Math.round(tau / 2)); dMax = Math.round(2 * tau);
      costs = new Float64Array(dMax + 1);
      for (var d = dMin; d <= dMax; d++){ var lr = Math.log(d / tau); costs[d] = -C.tightness * lr * lr; }
      // a little smoothing so a beat may land a frame either side of a sharp peak
      local = new Float64Array(nFrames);
      for (var f = 0; f < nFrames; f++) local[f] = 0.25 * (o[f - 1] || 0) + 0.5 * o[f] + 0.25 * (o[f + 1] || 0);
      cum = new Float64Array(nFrames); back = new Int32Array(nFrames); t = 0;
    }
    function beatStep(t){
      var best = -Infinity, bp = -1;
      for (var d = dMin; d <= dMax && t - d >= 0; d++){
        var v = cum[t - d] + costs[d];
        if (v > best){ best = v; bp = t - d; }
      }
      cum[t] = local[t] + (bp >= 0 ? best : 0);
      back[t] = bp;
    }
    function finishBeats(){
      var end = nFrames - 1, best = -Infinity, f;
      for (f = Math.max(0, nFrames - Math.round(tau)); f < nFrames; f++) if (cum[f] > best){ best = cum[f]; end = f; }
      var chain = [];
      for (f = end; f >= 0; f = back[f]) chain.push(f);
      chain.reverse();
      beats = [];
      for (var i = 0; i < chain.length; i++){ var ts = timeOf(chain[i]); if (ts >= firstSound && ts <= lastSound) beats.push(ts); }
      // the exact tempo: the average gap over every run of steady beats (finer than one frame)
      var sum = 0, n = 0;
      for (i = 1; i < beats.length; i++){
        var g = beats[i] - beats[i - 1];
        if (Math.abs(g * fps - tau) < 0.12 * tau){ sum += g; n++; }
      }
      if (n >= 8) bpm = 60 / (sum / n);
    }

    function buildEnergy(){
      var per = Math.max(1, Math.round(C.energyStep * fps)), n = Math.ceil(nFrames / per);
      energy = new Array(n);
      for (var j = 0; j < n; j++){
        var p = 0, c = 0;
        for (var f = j * per; f < Math.min(nFrames, (j + 1) * per); f++){ p += Math.pow(10, db[f] / 10); c++; }
        var d = 10 * Math.log(p / Math.max(1, c) + 1e-12) / Math.LN10;
        energy[j] = clamp01((d - (topDb - C.energyRangeDb)) / C.energyRangeDb);
      }
    }
    // the frame with the strongest onset within `win` seconds of t
    function peakNear(t, winS){
      var f0 = Math.max(0, Math.round((t - winS) * fps - N / 2 / hop)), f1 = Math.min(nFrames - 1, Math.round((t + winS) * fps - N / 2 / hop));
      var best = -1, bf = -1;
      for (var f = f0; f <= f1; f++) if (o[f] > best){ best = o[f]; bf = f; }
      return bf;
    }
    function buildSections(){
      var E = energy, n = E.length, pe = prefix(E), st = C.energyStep;
      var W = Math.round(C.sectionHold / st), edge = Math.round(4 / st), cand = [], i, j;
      for (i = edge; i <= n - edge; i++){
        var D = meanOf(pe, i, i + W) - meanOf(pe, i - W, i);
        if (Math.abs(D) >= C.sectionStep) cand.push({ i: i, D: D });
      }
      cand.sort(function(a, b){ return Math.abs(b.D) - Math.abs(a.D); });
      var cuts = [];
      cand.forEach(function(c){
        for (var k = 0; k < cuts.length; k++) if (Math.abs(cuts[k].i - c.i) < W) return;
        cuts.push(c);
      });
      // sharpen each cut: the biggest one-second step nearby, then the strongest onset within 0.4 s of it
      var times = cuts.map(function(c){
        var sgn = c.D > 0 ? 1 : -1, best = -Infinity, bi = c.i, s = Math.round(1 / st);
        for (j = Math.max(1, c.i - 3 * s); j <= Math.min(n - 1, c.i + 3 * s); j++){
          var v = sgn * (meanOf(pe, j, j + s) - meanOf(pe, j - s, j));
          if (v > best){ best = v; bi = j; }
        }
        var tc = bi * st, pf = peakNear(tc, 0.4);
        return pf >= 0 ? timeOf(pf) : tc;
      }).sort(function(a, b){ return a - b; });
      var bounds = [0].concat(times.filter(function(x){ return x > 2 && x < duration - 2; })).concat([duration]);
      var lo = quantile(E, 0.1), hi = quantile(E, 0.9), span = Math.max(0.2, hi - lo);
      sections = [];
      for (i = 0; i + 1 < bounds.length; i++){
        var a = Math.floor(bounds[i] / st), b = Math.max(a + 1, Math.floor(bounds[i + 1] / st)), q = Math.max(1, Math.floor((b - a) / 4));
        var e = meanOf(pe, a, b), rise = meanOf(pe, b - q, b) - meanOf(pe, a, a + q);
        var jump = i ? meanOf(pe, a, a + Math.round(4 / st)) - meanOf(pe, a - Math.round(4 / st), a) : 0;
        sections.push({ start: r3(bounds[i]), end: r3(bounds[i + 1]), energy: r3(e), kind: '', jump: r3(jump), rise: rise });
      }
      for (i = 0; i < sections.length; i++){
        var S = sections[i], r = (S.energy - lo) / span, next = sections[i + 1];
        S.kind = (S.rise >= 0.12 && S.end - S.start >= 6 && next && next.energy > S.energy + 0.05) ? 'build'
               : r >= 0.6 ? 'full' : (r < 0.3 ? 'calm' : 'mid');
        delete S.rise;
      }
    }

    function buildHits(){
      var w = Math.round(0.15 * fps), cands = [], f, k;
      for (f = 1; f < nFrames - 1; f++){
        var v = o[f];
        if (v < 1) continue;
        var isPeak = true;
        for (k = Math.max(0, f - w); k <= Math.min(nFrames - 1, f + w); k++) if (o[k] > v || (o[k] === v && k < f)){ isPeak = false; break; }
        if (isPeak) cands.push(f);
      }
      if (!cands.length){ hits = []; return; }
      var ref = quantile(cands.map(function(c){ return o[c]; }), 0.98) || 1;
      var pd = prefix(db), refs = [fLow, fMid, fHigh].map(function(a){ return quantile(cands.map(function(c){ return a[c]; }), 0.9) || 1; });
      var lo2 = Math.round(2 * fps), gap = Math.round(0.15 * fps);
      // A hit that starts a section counts for more the louder that section is than the one before (a
      // drop). Without it the biggest drop of three test songs of six was not among their top three
      // hits: a sharp hit in a loud part outscored it (2026-11-19). Section starts sit on an onset peak.
      var starts = sections.filter(function(s){ return s.jump > 0; });
      // A drop can also swell in over a second or more with no sharp hit at its start ("Decensus Ad
      // Nihilum" at 175 s): its start is then made a candidate itself, so the drop is always listed.
      starts.forEach(function(s){
        var fs = Math.max(0, Math.min(nFrames - 1, Math.round(s.start * fps - N / 2 / hop)));
        for (var i = 0; i < cands.length; i++) if (Math.abs(cands[i] - fs) <= Math.round(0.5 * fps)) return;
        cands.push(fs);
      });
      // Measured against the song's own biggest drop, steeply: in "Out Of My Head" four drops rise 0.19 to
      // 0.27, and a bonus by size alone let sharper hits at the smaller drops outrank the biggest one.
      var maxJump = 0;
      starts.forEach(function(s){ if (s.jump > maxJump) maxJump = s.jump; });
      function dropBonus(c){
        var tc = timeOf(c), b = 0;
        for (var i = 0; i < starts.length; i++){
          if (Math.abs(starts[i].start - tc) > 0.5) continue;
          var r = starts[i].jump / maxJump;
          b = Math.max(b, clamp01(starts[i].jump / 0.25) * r * r * r * r);
        }
        return b;
      }
      var scored = cands.map(function(c){
        var before = meanOf(pd, c - lo2, c - gap), after = meanOf(pd, c + 2, c + lo2);
        var sharp = clamp01(o[c] / ref), jump = clamp01((after - before) / 12), loud = clamp01((after - (topDb - 24)) / 24);
        var bands = [fLow[c] / refs[0], fMid[c] / refs[1], fHigh[c] / refs[2]], bi = 0;
        for (var q = 1; q < 3; q++) if (bands[q] > bands[bi]) bi = q;
        return { f: c, s: 0.4 * sharp + 0.4 * jump + 0.2 * loud + 0.9 * dropBonus(c), band: ['low', 'mid', 'high'][bi] };
      }).sort(function(a, b){ return b.s - a.s; });
      var want = Math.max(6, Math.min(40, Math.round(duration / 8))), picked = [], minGap = C.hitGap * fps;
      for (var i = 0; i < scored.length && picked.length < want; i++){
        var ok = true;
        for (k = 0; k < picked.length; k++) if (Math.abs(picked[k].f - scored[i].f) < minGap){ ok = false; break; }
        if (ok) picked.push(scored[i]);
      }
      var top = picked.length ? picked[0].s : 1;
      hits = picked.map(function(p){ return { t: r3(timeOf(p.f)), strength: r3(p.s / top), band: p.band }; });
    }

    function finish(){
      B.map = {
        version: 1,
        duration: r3(duration),
        bpm: Math.round(bpm * 10) / 10,
        confidence: Math.round(conf * 100) / 100,
        beats: beats.map(r3),
        hits: hits,
        sections: sections,
        energy: { step: C.energyStep, values: energy.map(r3) }
      };
    }

    // one small piece of work; returns false when there is nothing left
    function unit(){
      switch (B.phase){
        case 'frames':
          // 16 frames a piece: about 2 ms in a desktop browser (48 took 6 ms, 2026-11-19)
          for (var e = Math.min(nFrames, B.f + 16); B.f < e; B.f++) doFrame(B.f);
          B.progress = 0.85 * (nFrames ? B.f / nFrames : 1);
          if (B.f >= nFrames){
            if (nFrames < 8){ energy = []; finish(); B.phase = 'done'; break; }
            B.phase = 'prepare';
          }
          break;
        case 'prepare':
          prepare(); B.phase = 'tempo-a';
          break;
        case 'tempo-a': {
          var s = 0, s2 = 0, f;
          for (f = 0; f < nFrames; f++) s += o[f];
          oMean = s / nFrames;
          for (f = 0; f < nFrames; f++) s2 += (o[f] - oMean) * (o[f] - oMean);
          oVar = s2 / nFrames;
          lag = 0; B.phase = 'tempo-b';
          break;
        }
        case 'tempo-b':
          for (var le = Math.min(maxLag + 1, lag + 24); lag < le; lag++) acfLag(lag);
          B.progress = 0.85 + 0.05 * lag / (maxLag + 1);
          if (lag > maxLag){
            findTempo();
            if (bpm > 0){ startBeats(); B.phase = 'beats'; } else B.phase = 'rest';
          }
          break;
        case 'beats':
          for (var te = Math.min(nFrames, t + 1024); t < te; t++) beatStep(t);
          B.progress = 0.9 + 0.07 * t / nFrames;
          if (t >= nFrames){ finishBeats(); B.phase = 'rest'; }
          break;
        case 'rest':
          buildEnergy(); B.phase = 'sections';
          break;
        case 'sections':
          buildSections(); B.phase = 'hits';
          break;
        case 'hits':
          buildHits(); finish();
          B.progress = 1; B.phase = 'done';
          break;
        default: return false;
      }
      return B.phase !== 'done';
    }

    B.step = function(budgetMs){
      var t0 = now();
      while (unit()){ if (now() - t0 >= budgetMs) return false; }
      return true;
    };
    return B;
  }

  // Node, tests: the whole map at once
  function build(channels, sr){
    var b = createBuilder(channels, sr);
    b.step(Infinity);
    return b.map;
  }

  /* ---------- browser entry: decode a file, then work in slices ----------
     opts: onProgress(0..1), cancelled() -> true to give up, sliceMs.
     Resolves with the map; rejects when the file cannot be decoded or the
     work was cancelled. stats has the number of slices and the longest. */
  var stats = { slices: 0, longestMs: 0, totalMs: 0, decodeMs: 0 };
  function decode(buf){
    var Ctx = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    if (!Ctx) return Promise.reject(new Error('no Web Audio'));
    var ctx = new Ctx(1, 1, C.rate);
    return new Promise(function(ok, fail){
      // the callback form also works in older Safari, which has no promise here
      var p = ctx.decodeAudioData(buf, ok, fail);
      if (p && p.catch) p.catch(fail);
    });
  }
  function fromArrayBuffer(buf, opts){
    opts = opts || {};
    var t0 = now();
    return decode(buf).then(function(audio){
      stats = { slices: 0, longestMs: 0, totalMs: 0, decodeMs: Math.round(now() - t0) };
      var chans = [];
      for (var c = 0; c < Math.min(2, audio.numberOfChannels); c++) chans.push(audio.getChannelData(c));
      var B = createBuilder(chans, audio.sampleRate), sliceMs = opts.sliceMs || C.sliceMs;
      return new Promise(function(ok, fail){
        (function slice(){
          if (opts.cancelled && opts.cancelled()){ fail(new Error('cancelled')); return; }
          var s0 = now(), done = B.step(sliceMs), took = now() - s0;
          stats.slices++; stats.totalMs += took;
          if (took > stats.longestMs) stats.longestMs = took;
          if (opts.onProgress) opts.onProgress(B.progress);
          if (done){ stats.totalMs = Math.round(stats.totalMs); stats.longestMs = Math.round(stats.longestMs * 10) / 10; ok(B.map); }
          else setTimeout(slice, 0);
        })();
      });
    });
  }
  function fromBlob(blob, opts){
    var read = blob.arrayBuffer ? blob.arrayBuffer() : new Promise(function(ok, fail){
      var r = new FileReader();
      r.onload = function(){ ok(r.result); }; r.onerror = fail;
      r.readAsArrayBuffer(blob);
    });
    return read.then(function(buf){ return fromArrayBuffer(buf, opts); });
  }

  var api = { C: C, createBuilder: createBuilder, build: build, fft: fft,
              fromArrayBuffer: fromArrayBuffer, fromBlob: fromBlob, stats: function(){ return stats; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.App.songMap = api;
})(typeof window !== 'undefined' ? window : this);
