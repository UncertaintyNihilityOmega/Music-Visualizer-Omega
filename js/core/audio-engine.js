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
    S.plainAudio.volume = v * v;                     // the plain player has no gain node: set it directly
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

  /* ---------- Idle preview (no track loaded / paused) ----------
     With nothing playing, the engine is fed a small silent "ghost song" made
     of numbers, so every mode shows what it does with real music: a kick
     drum, a bass line, a snare, hi-hats, a held chord and a running
     arpeggio, at 96 beats a minute. It loops every 8 bars (20 s):
       bars 1-2  calm    chord and arpeggio only, a soft kick
       bars 3-4  build   kick on every beat, hi-hats come in
       bars 5-8  full    snare, busy hats, bass line, faster arpeggio
     so the calm-to-loud behaviour of a mode can be seen without a song.
     Nothing here makes sound. */
  var IDLE_BPM = 96;
  // four chords, one per bar: root and the notes the arpeggio walks (MIDI numbers)
  var IDLE_CHORDS = [
    { root: 45, tones: [57, 60, 64, 69] },   // A minor
    { root: 41, tones: [53, 57, 60, 65] },   // F
    { root: 48, tones: [60, 64, 67, 72] },   // C
    { root: 43, tones: [55, 59, 62, 67] }    // G
  ];
  var IDLE_ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  var IDLE_BASS = [1, 0, 0.7, 0, 0.85, 0, 0.7, 0.5];   // bass-note strength on each half beat
  function midiHz(m){ return 440 * Math.pow(2, (m - 69) / 12); }
  // where the ghost song is at time t (seconds)
  function idleSong(t){
    var beat = t * IDLE_BPM / 60, bar = Math.floor(beat / 4), inBar = beat - bar * 4;
    var loopBar = bar % 8, fb = inBar - Math.floor(inBar);
    // how full the arrangement is: 0.35 calm, rising through the build, 1 full
    var full = loopBar < 2 ? 0.35 : (loopBar < 4 ? 0.35 + ((loopBar - 2) * 4 + inBar) / 8 * 0.65 : 1);
    var section = loopBar < 2 ? 'calm' : (loopBar < 4 ? 'build' : 'full');
    var chord = IDLE_CHORDS[bar % 4];
    var half = Math.floor(inBar * 2), fHalf = inBar * 2 - half;
    var q = Math.floor(inBar * 4), fQ = inBar * 4 - q;
    var s = { section: section, full: full, chord: chord, beatInBar: Math.floor(inBar) };
    // kick: beats 1 and 3 while calm, every beat after that
    var kickOn = section !== 'calm' || Math.floor(inBar) % 2 === 0;
    s.kick = kickOn ? Math.exp(-fb * 0.625 * 14) * (section === 'calm' ? 0.6 : 1) : 0;
    // snare on beats 2 and 4 of the full part, and a fill at the end of the build
    var snareOn = (section === 'full' && Math.floor(inBar) % 2 === 1) || (loopBar === 3 && inBar >= 3);
    s.snare = snareOn ? Math.exp(-(loopBar === 3 && inBar >= 3 ? fQ * 0.156 : fb * 0.625) * 17) : 0;
    // hi-hat: off beats in the build, every quarter beat when full
    s.hat = section === 'calm' ? 0
          : (section === 'build' ? (half % 2 === 1 ? Math.exp(-fHalf * 0.3125 * 26) * 0.7 : 0)
                                 : Math.exp(-fQ * 0.156 * 30) * (q % 2 === 1 ? 1 : 0.55));
    // bass line: only once the build starts
    s.bassHz = midiHz(chord.root);
    s.bass = section === 'calm' ? 0 : IDLE_BASS[half] * Math.exp(-fHalf * 0.3125 * 4.5) * full;
    // arpeggio: half-beat steps while calm, quarter-beat steps after
    var step = section === 'calm' ? half : q, fStep = section === 'calm' ? fHalf * 0.3125 : fQ * 0.156;
    s.arpNote = chord.tones[IDLE_ARP[step % 8]] + (section === 'full' && step % 8 >= 4 ? 12 : 0);
    s.arpHz = midiHz(s.arpNote);
    s.arp = Math.exp(-fStep * (section === 'calm' ? 4 : 7)) * (0.55 + 0.45 * full);
    return s;
  }
  // t in seconds; left out = the engine's own clock (A.t), which is what the last frame used
  Aud.idleSong = function(t){ return idleSong(t === undefined ? A.t : t); };

  var idleLog2 = null, idleRate = 0;
  function bump(l2, centreL2, widthOct){ var d = (l2 - centreL2) / widthOct; return d > 3 || d < -3 ? 0 : Math.exp(-0.5 * d * d); }
  function fillSyntheticData(t){
    if (t === undefined) t = performance.now() / 1000;
    var fd = Aud.freqData, n = fd.length, nyq = Aud.sampleRate / 2, i;
    if (!idleLog2 || idleLog2.length !== n || idleRate !== nyq){
      idleLog2 = new Float32Array(n);
      for (i = 0; i < n; i++) idleLog2[i] = Math.log(Math.max(20, i / n * nyq)) / Math.LN2;
      idleRate = nyq;
    }
    var s = idleSong(t), L2 = Math.log2 || function(x){ return Math.log(x) / Math.LN2; };
    var kickL2 = L2(52 + 34 * s.kick), bassL2 = L2(s.bassHz * 2), arpL2 = L2(s.arpHz);
    var padL2 = [L2(midiHz(s.chord.tones[0])), L2(midiHz(s.chord.tones[1])), L2(midiHz(s.chord.tones[2]))];
    var snareL2 = L2(1700), hatL2 = L2(9000);
    var body = 0.1 + 0.5 * Math.pow(s.full, 1.5);
    // val is how strong this bin should LOOK (0..1); it is written back
    // through the inverse of the engine's loudness curve and treble lift so
    // the preview has the same shape whatever those two settings are.
    var c = cfg(), p = c.curve > 0 ? c.curve : 0, range = MAX_DB - MIN_DB;
    for (i = 0; i < n; i++){
      var l2 = idleLog2[i];
      // the body of the mix: real music fills the whole spectrum, not just
      // its notes. Two slow waves travel through it in opposite directions,
      // so the bars roll like water and none ever sits dead.
      var flow = 0.5 + 0.3 * Math.sin((l2 * 0.55 - t * 0.45) * 6.283) + 0.2 * Math.sin((l2 * 1.3 + t * 0.3) * 6.283);
      var val = body * (0.4 + 0.6 * flow) * bump(l2, 9.4, 2.6);
      val += 0.7 * s.kick * bump(l2, kickL2, 0.6);
      val += 0.5 * s.bass * (bump(l2, bassL2, 0.24) + 0.45 * bump(l2, bassL2 + 1, 0.2));
      var pad = (0.6 + 0.4 * Math.sin(t * 0.7)) * bump(l2, padL2[0], 0.1)
              + (0.6 + 0.4 * Math.sin(t * 0.9 + 2)) * bump(l2, padL2[1], 0.1)
              + (0.6 + 0.4 * Math.sin(t * 1.1 + 4)) * bump(l2, padL2[2], 0.1);
      val += 0.22 * pad * (0.6 + 0.4 * s.full);
      val += s.arp * (0.5 * bump(l2, arpL2, 0.09) + 0.24 * bump(l2, arpL2 + 1, 0.09) + 0.12 * bump(l2, arpL2 + 1.585, 0.09));
      val += 0.5 * s.snare * bump(l2, snareL2, 1.5);
      val += 0.42 * s.hat * bump(l2, hatL2, 0.7);
      if (val > 1) val = 1;
      if (p){
        var hz = Math.max(40, Math.min(12000, i / n * nyq));
        var lift = c.tilt * Math.log(hz / 100) / Math.LN2;
        val = 1 + (20 * Math.log(Math.max(0.002, val)) / Math.LN10 / p - lift) / range;
      }
      fd[i] = Math.max(0, Math.min(255, val * 255));
    }
    // the matching wave shape (what String mode draws): the same notes as
    // slow-drifting sine waves, so the line flows instead of jittering
    var td = Aud.timeData, m = td.length, w = 6.283 / Aud.sampleRate;
    var kHz = 50 + 40 * s.kick, bHz = s.bassHz * 2, aHz = s.arpHz;
    var p0 = midiHz(s.chord.tones[0]), p1 = midiHz(s.chord.tones[2]);
    var padA = 0.07 * (0.6 + 0.4 * s.full);
    for (var j = 0; j < m; j++){
      var y = 0.5 * s.kick * Math.sin(j * w * kHz + t * 2.1)
            + 0.34 * s.bass * Math.sin(j * w * bHz + t * 1.3)
            + padA * (Math.sin(j * w * p0 + t * 0.9) + Math.sin(j * w * p1 - t * 0.7))
            + 0.2 * s.arp * Math.sin(j * w * aHz + t * 3.1)
            + 0.09 * s.snare * (Math.sin(j * w * 1370 + t * 17) + Math.sin(j * w * 2290 + t * 29) + Math.sin(j * w * 3710 + t * 41))
            + 0.07 * s.hat * (Math.sin(j * w * 6500 + t * 53) + Math.sin(j * w * 9100 + t * 71));
      td[j] = Math.max(0, Math.min(255, 128 + y * 118));
    }
  }
  Aud.fillSyntheticData = fillSyntheticData;

  /* ---------- one frame: fetch data, analyse ---------- */
  var lastT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  Aud.frame = function(nowMs){
    var now = nowMs === undefined ? performance.now() : nowMs;
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (Aud.isLive()){
      Aud.analyser.getByteFrequencyData(Aud.freqData);
      Aud.analyser.getByteTimeDomainData(Aud.timeData);
      if (Aud.wantPitch > 0) Aud.pitchAnalyser.getByteFrequencyData(Aud.pitchData);
    } else {
      fillSyntheticData(now / 1000);
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
