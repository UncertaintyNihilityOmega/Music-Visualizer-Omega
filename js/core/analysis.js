/* =========================================================================
   ANALYSIS (pure: no DOM, no Web Audio)
   Turns one frame of spectrum data into the numbers every mode and game
   reads. It only ever sees a byte spectrum (0-255 per frequency bin, the
   same thing AnalyserNode.getByteFrequencyData gives), so the browser, the
   Node test harness (engine/songtest.js) and any future port feed it the
   same way and get the same answers.

   Pipeline per frame (docs/HOW-IT-WORKS.md explains each step in plain words):
     spectrum -> bands -> auto level -> noise gate -> contrast curve
              -> envelopes (level, intensity, energy)
              -> change detectors (flux, onset, kick / snare / hat, beat)
   ========================================================================= */
(function(root){
  'use strict';

  function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function env(cur, target, atk, rel, dt){
    var k = target > cur ? atk : rel;
    return cur + (target - cur) * (1 - Math.exp(-k * dt));
  }

  var DEFAULT_CFG = {
    sensitivity: 1, autoGain: 0.8, agcTime: 14, curve: 0.5, tilt: 4.5, floor: 0.04, gamma: 1.15,
    attack: 34, release: 9, intensityRelease: 2.6,
    beatSens: 1.32, beatGate: 0.12, onsetSens: 1.5
  };
  // energy at or below DRIVE_LO counts as fully calm, at or above DRIVE_HI as fully loud
  var DRIVE_LO = 0.14, DRIVE_HI = 0.46;

  // One small "is this band jumping up right now?" detector. It keeps about
  // 0.7 s of history and fires when the newest value clears the recent
  // average by a margin, then waits a moment so one hit is one pulse.
  function makeHitDetector(cooldown){
    return { hist: [], cd: 0, cooldown: cooldown, pulse: 0 };
  }
  function runHitDetector(d, value, sens, gate, dt){
    d.cd -= dt;
    d.pulse *= Math.exp(-9 * dt);
    var mean = 0, n = d.hist.length;
    for (var i = 0; i < n; i++) mean += d.hist[i];
    mean = n ? mean / n : 0;
    d.hist.push(value);
    if (d.hist.length > 42) d.hist.shift();
    if (n > 10 && d.cd <= 0 && value > mean * sens + gate){
      var strength = clamp01((value - mean) / Math.max(0.04, mean + gate) * 0.5);
      d.cd = d.cooldown;
      if (strength > d.pulse) d.pulse = strength;
      return strength;
    }
    return 0;
  }

  function createAnalyzer(){
    var freq = new Uint8Array(1024);
    var sampleRate = 44100;
    var prevSpec = new Float32Array(1024);
    var bassHist = [], beatCooldown = 0, autoPeak = 0.3;
    var kickD = makeHitDetector(0.12), snareD = makeHitDetector(0.1), hatD = makeHitDetector(0.06),
        onsetD = makeHitDetector(0.07);

    var A = {
      t: 0, dt: 1 / 60,
      sub: 0, bass: 0, lowMid: 0, mid: 0, high: 0, air: 0,
      level: 0, flux: 0, intensity: 0, punch: 0, tilt: 0, trebleTilt: 0,
      beat: false, beatStrength: 0, gain: 1,
      // added in engine v2
      loudness: 0,        // raw overall level this frame, before auto level (0-1)
      energy: 0,          // slow average of the levelled loudness: "how big is this part of the song"
      drive: 0,           // energy stretched to 0-1: 0 = a calm passage, 1 = a loud one (modes scale by this)
      onset: false, onsetStrength: 0,   // any new sound starting (drum, note, word)
      kick: 0, snare: 0, hat: 0,        // decaying 0-1 pulses for low / middle / high hits
      // the same three hits as one-frame events: the hit's strength (0-1) on
      // the frame it lands, 0 on every other frame. Use these to START
      // something (a crack, a spark); use the pulses above to SIZE something.
      kickHit: 0, snareHit: 0, hatHit: 0
    };

    var rangeDb = 70;   // how many decibels the byte scale 0..255 covers
    function setData(f, rate, minDb, maxDb){
      freq = f;
      if (rate) sampleRate = rate;
      if (minDb !== undefined && maxDb !== undefined) rangeDb = maxDb - minDb;
      if (prevSpec.length !== f.length) prevSpec = new Float32Array(f.length);
    }
    function binOf(hz){
      var n = freq.length;
      return Math.max(0, Math.min(n - 1, Math.round(hz / (sampleRate / 2) * n)));
    }
    function bandAvg(loHz, hiHz){
      var lo = binOf(loHz), hi = Math.max(lo, binOf(hiHz)), sum = 0;
      for (var i = lo; i <= hi; i++) sum += freq[i];
      return (sum / (hi - lo + 1)) / 255;
    }
    // The spectrum arrives in decibels, a scale that squeezes loud and quiet
    // together (half as strong is only 6 dB lower, a few percent of the bar).
    // curve() undoes part of that squeeze: v is 0..1 across the dB range and
    // the result is the real signal strength raised to cfg.curve. 0 = leave
    // it in decibels; 0.5 = between the two; 1 = true strength.
    //
    // Music also carries far less energy in high notes than in bass (about
    // 4.5 dB less for every doubling of pitch), so untreated, cymbals would
    // hardly register next to a kick drum. cfg.tilt adds that many dB per
    // octave above 100 Hz to level the field - the same "slope" control a
    // studio spectrum analyser has.
    function curve(v, hz, cfg){
      if (!(cfg.curve > 0)) return v;
      if (v <= 0) return 0;
      var tilt = (cfg.tilt || 0) * Math.log(Math.max(40, Math.min(12000, hz)) / 100) / Math.LN2;
      var c = Math.pow(10, ((v - 1) * rangeDb + tilt) / 20 * cfg.curve);
      // The bottom tenth of the scale fades to nothing. Without this the
      // treble lift would turn the last trace of hiss (or pure silence) into
      // a visible glow once the auto level turns a quiet moment up.
      if (v < 0.1){ var g = v / 0.1; c *= g * g; }
      return c;
    }
    // gain -> noise gate -> soft ceiling -> contrast curve, for a value that
    // has already been through curve()
    function finish(c, cfg){
      var x = (c * A.gain - cfg.floor) / (1 - cfg.floor);
      if (x <= 0) return 0;
      // above 0.75 the scale bends instead of stopping dead, so a very loud
      // passage still moves at the top rather than sitting flat at 1
      if (x > 0.75) x = 0.75 + 0.25 * (1 - Math.exp(-(x - 0.75) / 0.25));
      return cfg.gamma === 1 ? x : Math.pow(x, cfg.gamma);
    }
    // v is a raw 0..1 reading from the byte spectrum, hz is where it came from
    function shape(v, cfg, hz){
      return finish(curve(v, hz || 300, cfg), cfg);
    }
    // f = 0..1 across a log frequency axis, 28 Hz to 17.9 kHz
    function specAt(f, cfg){
      var hz = 28 * Math.pow(640, f);
      var lo = binOf(hz), hi = Math.max(lo, binOf(hz * 1.16)), m = 0;
      for (var i = lo; i <= hi; i++) if (freq[i] > m) m = freq[i];
      return shape(m / 255, cfg, hz * 1.08);
    }
    // Raw (0-255) value at an exact frequency, interpolated between bins, so
    // a bar narrower than one bin still moves smoothly instead of in steps.
    function byteAtHz(hz){
      var pos = hz / (sampleRate / 2) * freq.length;
      if (pos <= 0) return freq[0];
      if (pos >= freq.length - 1) return freq[freq.length - 1];
      var i = Math.floor(pos), fr = pos - i;
      return freq[i] * (1 - fr) + freq[i + 1] * fr;
    }
    // Fills out[0..n-1] with bar heights 0..1.
    //   lo, hi   frequency range in Hz
    //   scale    'log' (equal musical steps) or 'lin' (equal Hz steps)
    //   blur     0..1 how much each bar leans on its neighbours (rounded peaks)
    //   state    optional Float32Array(n): per-bar memory for rise / fall speed
    //   attack / release   per-second speeds used with state
    function bars(out, o, cfg){
      var n = out.length, lo = o.lo || 28, hi = o.hi || 16000, logScale = o.scale !== 'lin';
      var ratio = hi / lo, i;
      for (i = 0; i < n; i++){
        var f0 = logScale ? lo * Math.pow(ratio, i / n) : lo + (hi - lo) * (i / n);
        var f1 = logScale ? lo * Math.pow(ratio, (i + 1) / n) : lo + (hi - lo) * ((i + 1) / n);
        var b0 = binOf(f0), b1 = binOf(f1), m = 0;
        if (b1 - b0 >= 2){
          for (var b = b0; b <= b1; b++) if (freq[b] > m) m = freq[b];
        } else {
          m = Math.max(byteAtHz(f0), byteAtHz((f0 + f1) / 2), byteAtHz(f1));
        }
        out[i] = shape(m / 255, cfg, (f0 + f1) / 2);
      }
      var blur = o.blur || 0;
      if (blur > 0 && n > 2){
        var prev = out[0];
        for (i = 0; i < n; i++){
          var cur = out[i], next = i + 1 < n ? out[i + 1] : cur;
          out[i] = cur * (1 - blur) + ((prev + cur + next) / 3) * blur;
          prev = cur;
        }
      }
      if (o.state){
        var st = o.state, dt = A.dt, atk = o.attack || 60, rel = o.release || 12;
        for (i = 0; i < n; i++){ st[i] = env(st[i], out[i], atk, rel, dt); out[i] = st[i]; }
      }
      return out;
    }

    function analyze(dt, nowSec, cfgIn){
      var cfg = cfgIn || DEFAULT_CFG;
      if (!(dt > 0) || dt > 0.1) dt = 1 / 60;
      A.dt = dt;
      A.t = nowSec;

      var sub = bandAvg(20, 60), bass = bandAvg(60, 180), lowMid = bandAvg(180, 500),
          mid = bandAvg(500, 2000), high = bandAvg(2000, 6000), air = bandAvg(6000, 14000);

      // spectral flux: how much the spectrum GREW since last frame, overall
      // and inside three ranges (low = kick, middle = snare, top = hi-hat)
      var n = freq.length, flux = 0, fLow = 0, fMid = 0, fHigh = 0;
      var bLow0 = binOf(30), bLow1 = binOf(150), bMid0 = binOf(180), bMid1 = binOf(2500),
          bHigh0 = binOf(5000), bHigh1 = binOf(14000);
      for (var i = 0; i < n; i++){
        var v = freq[i] / 255, d = v - prevSpec[i];
        if (d > 0){
          flux += d;
          if (i >= bLow0 && i <= bLow1) fLow += d;
          else if (i >= bMid0 && i <= bMid1) fMid += d;
          else if (i >= bHigh0 && i <= bHigh1) fHigh += d;
        }
        prevSpec[i] = v;
      }
      flux = clamp01(flux / (n * 0.05));
      fLow = clamp01(fLow / (Math.max(1, bLow1 - bLow0 + 1) * 0.22));
      fMid = clamp01(fMid / (Math.max(1, bMid1 - bMid0 + 1) * 0.12));
      fHigh = clamp01(fHigh / (Math.max(1, bHigh1 - bHigh0 + 1) * 0.1));

      // auto level: follow the loudest recent moment and scale toward it.
      // agcTime is how long that memory lasts - long keeps the difference
      // between a quiet verse and a loud chorus, short flattens it.
      var cSub = curve(sub, 35, cfg), cBass = curve(bass, 105, cfg), cLowMid = curve(lowMid, 300, cfg),
          cMid = curve(mid, 1000, cfg), cHigh = curve(high, 3500, cfg), cAir = curve(air, 9000, cfg);
      var raw = (cSub * 1.15 + cBass * 1.25 + cLowMid * 1.05 + cMid * 0.95 + cHigh * 0.7 + cAir * 0.45) / 5.55;
      // the reference is the strongest band, not the average, so the loudest
      // band lands just under the ceiling instead of through it
      var top = Math.max(raw, cSub * 0.85, cBass * 0.85, cLowMid * 0.85, cMid * 0.85);
      autoPeak = Math.max(top, autoPeak - dt * autoPeak / Math.max(1, cfg.agcTime || 14));
      if (autoPeak < 0.05) autoPeak = 0.05;
      var ag = lerp(1, Math.min(4, 0.82 / autoPeak), cfg.autoGain);
      A.gain = Math.max(0.4, Math.min(4, ag)) * cfg.sensitivity;

      A.loudness = raw;
      // energy: the levelled loudness averaged over a second or two, so it
      // tells a verse from a chorus instead of following every drum hit.
      // drive: the same thing stretched so a calm passage reads near 0 and a
      // loud one near 1 (DRIVE_LO / DRIVE_HI were set from the test songs:
      // engine/README.md).
      A.energy = env(A.energy, finish(raw, cfg), 1.2, 0.45, dt);
      A.drive = clamp01((A.energy - DRIVE_LO) / (DRIVE_HI - DRIVE_LO));
      A.sub = finish(cSub, cfg);
      A.bass = finish(cBass, cfg);
      A.lowMid = finish(cLowMid, cfg);
      A.mid = finish(cMid, cfg);
      A.high = finish(cHigh, cfg);
      A.air = finish(cAir, cfg);
      A.flux = flux;
      A.level = env(A.level, finish(raw, cfg), cfg.attack, cfg.release, dt);
      // two different balances, so different modes can follow different things
      A.tilt = env(A.tilt, (A.mid + A.high) / 2 - (A.sub + A.bass) / 2, 5, 5, dt);
      A.trebleTilt = env(A.trebleTilt, (A.high + A.air) / 2 - A.lowMid, 5, 5, dt);
      A.intensity = env(A.intensity, clamp01(A.level * 0.7 + flux * 0.45 + A.bass * 0.25),
                        9, cfg.intensityRelease, dt);

      // beat: bass standing clear of its own recent average. Measured before
      // the gain and the ceiling, so a loud song cannot flatten it away.
      var mean = 0;
      for (var k = 0; k < bassHist.length; k++) mean += bassHist[k];
      mean = bassHist.length ? mean / bassHist.length : 0;
      bassHist.push(cBass);
      if (bassHist.length > 43) bassHist.shift();
      var os = cfg.onsetSens || 1.5;
      var kickNow = runHitDetector(kickD, fLow, os, 0.05, dt);
      beatCooldown -= dt;
      A.beat = false;
      A.beatStrength *= Math.exp(-7 * dt);
      if (bassHist.length > 12 && beatCooldown <= 0 && A.bass > cfg.beatGate){
        var byLevel = cBass > mean * cfg.beatSens + 0.004;
        // a held bass note (an 808, a drone) never clears its own average,
        // but a kick drum on top of it still shows as a sudden rise
        var byKick = kickNow > 0.3;
        if (byLevel || byKick){
          A.beat = true;
          A.beatStrength = clamp01(Math.max((cBass / Math.max(0.004, mean) - 1) * 0.85, kickNow * 0.8) + flux * 0.3);
          beatCooldown = 0.11;
        }
      }
      A.punch = A.beat ? Math.max(A.punch, A.beatStrength) : A.punch * Math.exp(-5.5 * dt);

      // hits by range, and "anything new" (onset)
      A.kickHit = kickNow;
      A.snareHit = runHitDetector(snareD, fMid, os, 0.05, dt);
      A.hatHit = runHitDetector(hatD, fHigh, os, 0.04, dt);
      var on = runHitDetector(onsetD, flux, os, 0.03, dt);
      A.kick = kickD.pulse; A.snare = snareD.pulse; A.hat = hatD.pulse;
      A.onset = on > 0;
      A.onsetStrength = onsetD.pulse;
      return A;
    }

    function reset(){
      bassHist.length = 0; beatCooldown = 0; autoPeak = 0.3;
      A.energy = 0; A.drive = 0;
      kickD.hist.length = snareD.hist.length = hatD.hist.length = onsetD.hist.length = 0;
      for (var i = 0; i < prevSpec.length; i++) prevSpec[i] = 0;
    }

    return { A: A, setData: setData, binOf: binOf, bandAvg: bandAvg, shape: shape, specAt: specAt,
             byteAtHz: byteAtHz, bars: bars, analyze: analyze, reset: reset };
  }

  var api = { createAnalyzer: createAnalyzer, DEFAULT_CFG: DEFAULT_CFG, clamp01: clamp01, lerp: lerp, env: env };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.App.analysis = api;
})(typeof window !== 'undefined' ? window : this);
