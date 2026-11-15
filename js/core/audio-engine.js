/* =========================================================================
   AUDIO ENGINE (browser side)
   Owns the Web Audio graph and the two sound sources (a music file or the
   microphone), pulls one frame of spectrum data per animation frame, and
   hands it to the pure analyser in analysis.js. Modes and games read the
   results from App.audio.A and never touch Web Audio themselves.

   Graph:
     <audio> --> speakers
     <audio> --> analyser (2048)        } unless the microphone is on,
     <audio> --> pitchAnalyser (16384)  } then the mic feeds both instead
   The analysers are taps only: nothing the microphone hears is ever sent
   to the speakers, so mic mode cannot feed back.

   freqData/timeData/analyser/audioCtx/pitchData/sampleRate are REASSIGNED
   once ensureAudioGraph() runs, so readers must use App.audio.xxx at the
   point of use rather than caching a local alias at load time.
   ========================================================================= */
(function(){
  'use strict';
  var Aud = App.audio;
  var S = App.state;
  var An = App.analysis.createAnalyzer();

  var FFT_BINS = 1024;
  Aud.freqData = new Uint8Array(FFT_BINS);
  Aud.timeData = new Uint8Array(FFT_BINS);
  Aud.sampleRate = 44100;
  Aud.analyser = null;
  Aud.audioCtx = null;
  Aud.pitchAnalyser = null;
  Aud.pitchData = null;
  Aud.source = 'file';          // 'file' | 'mic'
  Aud.micStream = null;
  Aud.wantPitch = 0;            // a mode sets this to 2 each frame it needs the fine spectrum

  Aud.SOURCES = ['sub', 'bass', 'lowmid', 'mid', 'treble', 'air', 'level', 'flux', 'intensity', 'kick', 'snare', 'hat', 'energy'];
  Aud.A = An.A;
  var A = An.A;
  var MIN_DB = -90, MAX_DB = -12;   // engine/songtest.js feeds the analyser the same range
  An.setData(Aud.freqData, Aud.sampleRate, MIN_DB, MAX_DB);

  function cfg(){ return App.cfg.CFG.audio; }
  Aud.binOf = An.binOf;
  Aud.bandAvg = An.bandAvg;
  Aud.shape = function(v, hz){ return An.shape(v, cfg(), hz); };
  Aud.specAt = function(f){ return An.specAt(f, cfg()); };
  Aud.bars = function(out, o){ return An.bars(out, o, cfg()); };
  Aud.sourceValue = function(name){
    switch (name){
      case 'sub': return A.sub;
      case 'bass': return A.bass;
      case 'lowmid': return A.lowMid;
      case 'mid': return A.mid;
      case 'treble': return A.high;
      case 'air': return A.air;
      case 'flux': return A.flux;
      case 'intensity': return A.intensity;
      case 'kick': return A.kick;
      case 'snare': return A.snare;
      case 'hat': return A.hat;
      case 'energy': return A.energy;
      default: return A.level;
    }
  };

  var mediaNode = null, micNode = null, volumeNode = null;
  Aud.volume = 0.8;
  Aud.muted = false;
  function applyVolume(){
    var v = Aud.muted ? 0 : Aud.volume;
    if (volumeNode) volumeNode.gain.value = v * v;   // squared: equal slider steps sound like equal steps
    else S.audio.volume = v;                         // before the first play there is no graph yet
  }
  Aud.setVolume = function(v){ Aud.volume = Math.max(0, Math.min(1, v)); applyVolume(); };
  Aud.setMuted = function(m){ Aud.muted = !!m; applyVolume(); };

  function ensureAudioGraph(){
    if (Aud.audioCtx) return;
    Aud.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    Aud.analyser = Aud.audioCtx.createAnalyser();
    Aud.analyser.fftSize = FFT_BINS * 2;
    Aud.analyser.smoothingTimeConstant = cfg().smoothing;
    // The browser's default range tops out at -30 dB, and a loud modern song
    // puts its bass well above that, so every bass bin read "maximum" all
    // the time (measured on the test songs: pinned for 56-93% of a loud
    // passage). -12 dB is just above what a full-scale tone reads here.
    Aud.analyser.minDecibels = MIN_DB;
    Aud.analyser.maxDecibels = MAX_DB;
    Aud.pitchAnalyser = Aud.audioCtx.createAnalyser();
    Aud.pitchAnalyser.fftSize = 16384;          // 2.7 Hz per bin instead of 21.5
    Aud.pitchAnalyser.smoothingTimeConstant = 0.35;
    Aud.pitchAnalyser.minDecibels = MIN_DB;
    Aud.pitchAnalyser.maxDecibels = MAX_DB;
    mediaNode = Aud.audioCtx.createMediaElementSource(S.audio);
    // Volume is a gain AFTER the analyser tap, and the <audio> element itself
    // stays at full volume: turning the music down (or muting it) must not
    // shrink the visuals.
    volumeNode = Aud.audioCtx.createGain();
    S.audio.volume = 1;
    S.audio.muted = false;
    applyVolume();
    mediaNode.connect(volumeNode);
    volumeNode.connect(Aud.audioCtx.destination);
    mediaNode.connect(Aud.analyser);
    mediaNode.connect(Aud.pitchAnalyser);
    Aud.pitchData = new Uint8Array(Aud.pitchAnalyser.frequencyBinCount);
    Aud.sampleRate = Aud.audioCtx.sampleRate || 44100;
    Aud.freqData = new Uint8Array(Aud.analyser.frequencyBinCount);
    Aud.timeData = new Uint8Array(Aud.analyser.frequencyBinCount);
    An.setData(Aud.freqData, Aud.sampleRate, MIN_DB, MAX_DB);
  }
  Aud.ensureAudioGraph = ensureAudioGraph;

  /* ---------- Microphone ---------- */
  Aud.micSupported = function(){
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };
  // Resolves once the mic is feeding the analysers. Rejects with an Error
  // whose message is safe to show the user.
  Aud.startMic = function(){
    if (Aud.source === 'mic') return Promise.resolve();
    if (!Aud.micSupported()) return Promise.reject(new Error('This browser cannot use the microphone here (it needs https or localhost).'));
    ensureAudioGraph();
    if (Aud.audioCtx.state === 'suspended') Aud.audioCtx.resume();
    // the three "clean-up" options are for phone calls; for music they pump
    // and gate the level, which makes the visuals lurch
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
      .then(function(stream){
        Aud.micStream = stream;
        micNode = Aud.audioCtx.createMediaStreamSource(stream);
        try { mediaNode.disconnect(Aud.analyser); mediaNode.disconnect(Aud.pitchAnalyser); } catch (e) {}
        micNode.connect(Aud.analyser);
        micNode.connect(Aud.pitchAnalyser);
        Aud.source = 'mic';
        An.reset();
        stream.getAudioTracks().forEach(function(tr){ tr.addEventListener('ended', function(){ Aud.stopMic(); }); });
        if (Aud.onSourceChange) Aud.onSourceChange('mic');
      }, function(err){
        var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
        throw new Error(denied ? 'Microphone permission was not given.' : 'No microphone could be opened.');
      });
  };
  Aud.stopMic = function(){
    if (Aud.source !== 'mic') return;
    try { micNode.disconnect(); } catch (e) {}
    if (Aud.micStream) Aud.micStream.getTracks().forEach(function(tr){ tr.stop(); });
    Aud.micStream = null;
    micNode = null;
    try { mediaNode.connect(Aud.analyser); mediaNode.connect(Aud.pitchAnalyser); } catch (e) {}
    Aud.source = 'file';
    An.reset();
    if (Aud.onSourceChange) Aud.onSourceChange('file');
  };
  // true while real sound is reaching the analysers
  Aud.isLive = function(){
    if (!Aud.analyser) return false;
    return Aud.source === 'mic' || !S.audio.paused;
  };

  /* ---------- Idle preview (no track loaded / paused) ---------- */
  function fillSyntheticData(){
    var t = performance.now() / 1000;
    var fd = Aud.freqData, n = fd.length;
    var phase = (t % 1.15) / 1.15;
    var pulse = Math.exp(-phase * 7);
    // val is how strong this bin should LOOK (0..1); it is written back
    // through the inverse of the engine's loudness curve and treble lift so
    // the preview has the same shape whatever those two settings are.
    var c = cfg(), p = c.curve > 0 ? c.curve : 0, range = MAX_DB - MIN_DB, nyq = Aud.sampleRate / 2;
    for (var i = 0; i < n; i++){
      var f = i / n;
      var envp = 0.5 + 0.5 * Math.sin(t * 0.6 - f * 6);
      var wob = 0.5 + 0.5 * Math.sin(t * 1.7 + f * 23 + Math.sin(t * 0.31 + f * 4) * 3);
      var kick = Math.exp(-f * 90) * pulse;
      var val = ((envp * 0.4 + wob * 0.3) * Math.exp(-f * 1.7) + kick * 0.85) * 0.75;
      if (p){
        var hz = Math.max(40, Math.min(12000, f * nyq));
        var lift = c.tilt * Math.log(hz / 100) / Math.LN2;
        val = 1 + (20 * Math.log(Math.max(0.002, val)) / Math.LN10 / p - lift) / range;
      }
      fd[i] = Math.max(0, Math.min(255, val * 255));
    }
    var td = Aud.timeData, m = td.length;
    for (var j = 0; j < m; j++){
      var f2 = j / m;
      td[j] = 128 + Math.sin(t * 1.4 + f2 * Math.PI * 3) * 14 * (0.6 + 0.4 * Math.sin(t * 0.4));
    }
  }
  Aud.fillSyntheticData = fillSyntheticData;

  /* ---------- one frame: fetch data, analyse ---------- */
  var lastT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  Aud.frame = function(){
    var now = performance.now();
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (Aud.isLive()){
      Aud.analyser.getByteFrequencyData(Aud.freqData);
      Aud.analyser.getByteTimeDomainData(Aud.timeData);
      if (Aud.wantPitch > 0) Aud.pitchAnalyser.getByteFrequencyData(Aud.pitchData);
    } else {
      fillSyntheticData();
    }
    if (Aud.wantPitch > 0) Aud.wantPitch--;
    An.analyze(dt, now / 1000, cfg());
  };
  // kept for anything that still calls the old name
  Aud.analyze = Aud.frame;

  // The numbers that shape the response come from analysis.js (one home for
  // them: engine/songtest.js tunes and checks exactly these defaults).
  var D = App.analysis.DEFAULT_CFG;
  App.cfg.registerDefaults('audio', {
    sensitivity: D.sensitivity, autoGain: D.autoGain, agcTime: D.agcTime, curve: D.curve, tilt: D.tilt,
    floor: D.floor, gamma: D.gamma, attack: D.attack, release: D.release, intensityRelease: D.intensityRelease,
    smoothing: 0.5, beatSens: D.beatSens, beatGate: D.beatGate, onsetSens: D.onsetSens
  });
  App.cfg.registerSchema({ id: 'audio', label: 'Audio response', fields: [
    ['sensitivity', 'Sensitivity', 'range', 0.3, 3, 0.05],
    ['autoGain', 'Auto level matching', 'range', 0, 1, 0.05],
    ['agcTime', 'Auto level memory (seconds)', 'range', 2, 40, 1],
    ['curve', 'Loud / quiet difference', 'range', 0.2, 1, 0.05],
    ['tilt', 'Treble lift (dB per octave)', 'range', 0, 6, 0.5],
    ['floor', 'Noise floor', 'range', 0, 0.5, 0.01],
    ['gamma', 'Contrast curve', 'range', 0.6, 2.5, 0.05],
    ['attack', 'Rise speed', 'range', 4, 60, 1],
    ['release', 'Fall speed', 'range', 1, 25, 0.5],
    ['intensityRelease', 'Intensity fall speed', 'range', 0.3, 10, 0.1],
    ['smoothing', 'FFT smoothing', 'range', 0, 0.9, 0.05],
    ['beatSens', 'Beat threshold', 'range', 1.05, 2, 0.01],
    ['beatGate', 'Beat minimum level', 'range', 0, 0.4, 0.01],
    ['onsetSens', 'Hit threshold (kick / snare / hat)', 'range', 1.1, 3, 0.05]
  ]}, 0);
  App.cfg.onGroupChange('audio', function(key){
    if ((key === 'smoothing' || key === null) && Aud.analyser) Aud.analyser.smoothingTimeConstant = cfg().smoothing;
  });
})();
