# FACTS: what the project relies on, with sources

One home per fact. Measured numbers about our own tools are in engine/README.md.

## Web Audio (the browser's sound analysis)
- `AnalyserNode` applies a Blackman window (alpha 0.16), an FFT scaled by 1/fftSize, smoothing over time
  `X = t * Xprev + (1 - t) * |X|`, then `20 * log10`, then maps `minDecibels..maxDecibels` to bytes 0..255.
  Defaults: fftSize 2048, minDecibels -100, maxDecibels -30, smoothingTimeConstant 0.8.
  (Web Audio API specification, "FFT Windowing and Smoothing over Time", https://webaudio.github.io/web-audio-api/#AnalyserNode;
  written from memory of the specification on 2026-11-16, and checked by rebuilding it in engine/songtest.js: with
  the default range, the rebuild and the browser both show the bass band pinned near 1 on the same loud song.)
- A full-scale tone through that window reads 20 * log10(0.42 / 2) = -13.6 dB. (Computed; 2026-11-16.)
- An `<audio>` element's own `volume` and `muted` are applied before `createMediaElementSource`, so they change
  what an analyser sees. (Observed in the app, 2026-11-16: with volume 0.02 the level read 0.012.)
- `showDirectoryPicker` and stored directory handles exist in Chromium browsers on desktop only; a stored handle
  needs `requestPermission` from a tap on a later visit. (MDN, File System Access API; from memory, 2026-11-16.)
- `getUserMedia` needs https or localhost. (MDN; from memory, 2026-11-16.)

## Music and hearing
- Music's long-term spectrum falls about 3 to 6 dB per octave; analysers offer a slope control to level it, and
  4.5 dB/octave is a common default. (General audio-engineering knowledge, e.g. Voxengo SPAN's default slope;
  from memory, not re-checked, 2026-11-16.)

## Other visualisers
- Vizzy's Audio Impact Automation has Min value, Max value, Lower limit (0 to 5000), Sensitivity (0 to 1),
  Smoothing (0 to 1), Cumulative, and delta smoothing (amount, threshold).
  (https://vizzydocs.igerman.cc/Automations/Types/Audio-Impact-Automation; read 2026-11-15.)
- Vizzy's Camera Shake: amplitude X/Y 0 to 30, rotation 0 to 30, frequency 0 to 10, octaves 1 to 5.
  (https://vizzydocs.igerman.cc/Effects/Motion/Camera-Shake; read 2026-11-15.)
- Specterr: "Pick up to 7 colors for your visualizer waves. Colors can change while reacting to loud audio";
  particles have colour, direction and size; videos up to 1 hour at 60 FPS.
  (https://specterr.com/music-visualizer/; read 2026-11-15.)
- MilkDrop: `bass`, `mid`, `treb` read 1 as normal, below about 0.7 quiet, above about 1.3 loud; `*_att` are the
  same, damped in time; `decay` 0.98 is the recommended fade.
  (https://www.geisswerks.com/milkdrop/milkdrop_preset_authoring.html; read 2026-11-15.)
- Vampire Survivors was first built with Phaser (HTML5, JavaScript) and moved to Unity with its 1.6 update, set
  for 17 August 2023. (https://phaser.io/news/2024/02/vampire-survivors-space-54 and
  https://www.gamingonlinux.com/2023/07/vampire-survivors-switching-to-new-game-engine-on-august-17; read 2026-11-15.)

## The test videos (measured with ffmpeg and a script, 2026-11-16; method and table in docs/RESEARCH.md)
- "Kirara Magic - Checkmate": about 140 bars covering about 30 to 800 Hz left to right; rise and fall about 33 ms;
  height ~ strength^0.35; the picture does not react to the sound.
- "HORROR! Nightcore Creepy Mix pt. II": mirrored, bass at the outer edges, about 30 to 350 Hz per side; rise and
  fall about 133 ms; height ~ strength^0.75; picture brightness follows loudness (r = 0.74); picture motion is 0
  in a quiet passage.
