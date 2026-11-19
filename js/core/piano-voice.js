/* =========================================================================
   PIANO VOICE (ROADMAP item 26)
   A small piano made in the app with Web Audio, so it works offline and
   needs no sample files. Piano mode uses it to play the notes it finds in
   the song, and the key a finger touches, while the song itself is kept
   off the speakers (audio-engine.js "Song off").

   One note is:
     - two oscillators a hair apart in pitch (a piano hammer strikes two or
       three strings per note; their slight disagreement makes the slow
       shimmer of a real piano), each playing a wave built from the note's
       overtones, weaker the higher they go, with the 7th almost missing
       (the hammer strikes the string about a seventh of the way along);
     - a low-pass filter that starts bright and darkens as the note dies,
       brighter for a harder strike;
     - a loudness that rises in 5 ms, falls fast for a moment (the first
       sound of a piano note) and then slowly (what rings on); low notes
       ring for seconds, high notes for less than one;
     - a short knock of filtered noise: the hammer itself;
     - a damper: when the key is let go the note stops in about 0.1 s.
   All of it goes through one compressor so many notes at once never clip,
   then to the volume control, after the analysers: what the piano plays
   is never analysed. At most MAX notes sound at once; the oldest goes.
   ========================================================================= */
(function(){
  'use strict';
  var Aud = App.audio;
  var V = App.pianoVoice = {};
  var MAX = 24;
  var ctxRef = null, bus = null, noiseBuf = null, waves = {};
  var voices = [];

  function hz(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  // how long note m rings (seconds for the slow part to fall to about a third)
  function ringTime(m){ return Math.max(0.45, Math.min(5, 3.2 * Math.pow(2, -(m - 48) / 24))); }
  V.ringTime = ringTime;

  function setup(){
    var ctx = Aud.audioCtx;
    if (!ctx) return null;
    if (ctxRef === ctx) return ctx;
    ctxRef = ctx;
    waves = {};
    voices = [];
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    bus = ctx.createGain();
    bus.gain.value = 0.6;
    bus.connect(comp);
    comp.connect(Aud.speakers());
    // 80 ms of noise for the hammer
    noiseBuf = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.08), ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // the overtones of note m, as a wave the oscillator repeats
  var AMPS = [0, 1, 0.55, 0.36, 0.24, 0.17, 0.11, 0.025, 0.06, 0.04, 0.026, 0.017, 0.011, 0.007];
  function waveFor(ctx, m){
    if (waves[m]) return waves[m];
    var f = hz(m), top = Math.min(ctx.sampleRate * 0.45, 14000), n = 1;
    while (n + 1 < AMPS.length && (n + 1) * f < top) n++;
    var re = new Float32Array(n + 1), im = new Float32Array(n + 1);
    // low notes keep more of their overtones; high notes are nearly pure
    var tilt = m < 48 ? 0.9 : (m > 84 ? 1.6 : 0.9 + (m - 48) / 36 * 0.7);
    for (var k = 1; k <= n; k++) im[k] = AMPS[k] * Math.pow(1 / k, tilt - 0.9);
    waves[m] = ctx.createPeriodicWave(re, im);
    return waves[m];
  }

  function damp(vc, t, speed){
    if (vc.off !== null && vc.off <= t) return;
    vc.off = t;
    try { vc.damper.gain.setTargetAtTime(0, t, speed || 0.035); } catch (e) {}
    var end = t + (speed || 0.035) * 8;
    if (end < vc.end){
      vc.end = end;
      for (var i = 0; i < vc.srcs.length; i++){ try { vc.srcs[i].stop(end); } catch (e) {} }
    }
  }

  // Plays note m (MIDI number) `delay` seconds from now; v = how hard (0..1).
  // Returns the note, for noteOff, or null when there is no sound engine yet.
  V.noteOn = function(m, v, delay){
    var ctx = setup();
    if (!ctx) return null;
    var now = ctx.currentTime, t0 = now + Math.max(0, delay || 0);
    v = Math.max(0.05, Math.min(1, v));
    // tidy up: forget notes that have ended; a key struck again stops its last note.
    // Notes still on their way (struck later than now) are kept: with late sound
    // there are seconds of them, and only notes ringing at t0 count towards MAX.
    var ringing = [];
    for (var i = voices.length - 1; i >= 0; i--){
      var o = voices[i];
      if (o.end < now){ voices.splice(i, 1); continue; }
      if (o.t0 > t0 || (o.off !== null && o.off <= t0)) continue;
      if (o.m === m) damp(o, t0, 0.02);
      else ringing.push(o);
    }
    if (ringing.length >= MAX){
      ringing.sort(function(a, b){ return a.t0 - b.t0; });
      for (var r = 0; r <= ringing.length - MAX; r++) damp(ringing[r], t0, 0.02);
    }

    var f = hz(m), ring = ringTime(m), end = t0 + ring * 5;
    var peak = (0.1 + 0.22 * Math.pow(v, 1.3)) * (m < 40 ? 0.8 : 1);
    var env = ctx.createGain(), damper = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.4;
    var bright = Math.min(ctx.sampleRate * 0.45, f * (3 + 9 * v) + 600);
    var dull = Math.min(bright, f * 1.6 + 300);
    lp.frequency.setValueAtTime(bright, t0);
    lp.frequency.setTargetAtTime(dull, t0 + 0.01, ring * 0.35);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(peak, t0 + 0.005);
    env.gain.setTargetAtTime(peak * 0.32, t0 + 0.005, 0.09);
    env.gain.setTargetAtTime(0, t0 + 0.25, ring);
    damper.gain.value = 1;
    lp.connect(env);
    env.connect(damper);
    damper.connect(bus);

    var srcs = [], wave = waveFor(ctx, m), cents = m > 30 ? 1.6 : 0.8;
    for (var s = 0; s < 2; s++){
      var osc = ctx.createOscillator();
      osc.setPeriodicWave(wave);
      osc.frequency.value = f;
      osc.detune.value = s ? cents : -cents;
      osc.connect(lp);
      osc.start(t0);
      osc.stop(end);
      srcs.push(osc);
    }
    // the hammer: a knock of noise around the note, loudest for a hard strike
    var nz = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    nz.buffer = noiseBuf;
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(6000, f * 2.5 + 400);
    bp.Q.value = 0.9;
    ng.gain.setValueAtTime(0, t0);
    ng.gain.linearRampToValueAtTime(peak * 0.5 * v, t0 + 0.002);
    ng.gain.setTargetAtTime(0, t0 + 0.002, 0.012);
    nz.connect(bp);
    bp.connect(ng);
    ng.connect(damper);
    nz.start(t0);
    nz.stop(t0 + 0.08);
    srcs.push(nz);

    var vc = { m: m, v: v, t0: t0, end: end, off: null, damper: damper, srcs: srcs };
    voices.push(vc);
    return vc;
  };

  // lets go of the key `delay` seconds from now (never before it was struck)
  V.noteOff = function(vc, delay){
    if (!vc || !ctxRef) return;
    // the damper takes about 0.3 s to silence the string, so short finds do not sound clipped
    damp(vc, Math.max(vc.t0 + 0.2, ctxRef.currentTime + Math.max(0, delay || 0)), 0.07);
  };

  // every note stops: those still to come never sound, those ringing stop quickly
  V.stopAll = function(){
    if (!ctxRef) return;
    var now = ctxRef.currentTime;
    for (var i = 0; i < voices.length; i++) damp(voices[i], now, 0.02);
    voices = [];
  };

  // for checks in the browser (engine/probe.js and the like), never the app
  V.probe = function(){
    var now = ctxRef ? ctxRef.currentTime : 0;
    return { now: now, count: voices.length,
             notes: voices.map(function(o){ return { m: o.m, v: o.v, t0: o.t0, off: o.off, end: o.end }; }),
             bus: bus };
  };

  // another mode came on, or the page was hidden: the song is back, the piano stops
  Aud.onSongBack = V.stopAll;
})();
