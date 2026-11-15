# Research notes: how good visualisers work

Sources read on 2026-11-15/16. Facts the code relies on are also in FACTS.md with their source. What is my own
reading rather than a stated fact is marked "(inference)".

## 1. The science, in the order the signal flows

1. **Windowing and FFT.** The browser multiplies the newest `fftSize` samples by a Blackman window (alpha 0.16),
   runs an FFT and scales by 1/fftSize. `frequencyBinCount = fftSize / 2`; bin width = sampleRate / fftSize
   (21.5 Hz at 2,048 and 44.1 kHz).
2. **Smoothing over time** (in the browser): `X[k] = t * Xprev[k] + (1 - t) * |X[k]|`, t = `smoothingTimeConstant`
   (default 0.8; this app uses 0.5).
3. **Decibels to bytes**: `dB = 20 * log10(X)`, then `byte = 255 / (maxDb - minDb) * (dB - minDb)` clipped to
   0..255. Defaults are -100 and -30 dB.
   - **This default was the app's main fault.** A full-scale tone reads -13.6 dB through a Blackman window, and
     the bass of a loud modern song sits around -15 to -25 dB, far above -30. Every bass bin therefore read 255
     nearly all the time. Measured on the five test songs with the old settings: bass pinned above 0.97 for
     56 to 93% of a loud passage, 0 beats found in four of five. The app now uses -90..-12 dB.
4. **Perceptual shaping.** Decibels compress: half the strength is -6 dB, only 8% of a 78 dB scale. Hearing is
   closer to a power law, and the two videos studied draw bar height as about strength^0.35 and strength^0.75
   (section 4). The engine uses strength^0.5 (`curve`).
5. **Spectral tilt.** Music's spectrum falls about 3 to 6 dB per octave (close to pink noise, -3 dB/octave, plus
   mastering). Analysers offer a "slope" control to level it; 4.5 dB/octave is a common default. The engine adds
   `tilt` dB per octave above 100 Hz, so treble bands move as much as bass bands.
6. **Frequency axis.** Pitch is heard logarithmically (an octave is a doubling), so a full-range display spaces
   bars on a log axis. A narrow bass-only display (30 to 800 Hz) can be linear, and both videos are.
7. **Envelopes.** A bar that rises with a fast time constant and falls with a slow one reads as "reacting" rather
   than flickering. MilkDrop exposes the same idea as `bass` (instant) and `bass_att` (damped); a ratio
   `bass / bass_att` above 1 means "spiking".
8. **Onsets.** Spectral flux: sum only the positive frame-to-frame changes of the magnitude spectrum, then pick
   peaks above an adaptive threshold (local mean times a factor; typical factor 1.4 to 1.5, frame 2,048, hop 512).
   Doing this per band separates kick, snare and hi-hat.
9. **Beat and tempo.** Tempo comes from the periodicity of the onset curve (autocorrelation or comb filters, with
   a weighting centred near 120 BPM to settle "half or double?"), and beat positions from dynamic programming
   over that curve (Ellis 2007). This needs several seconds of audio, so it belongs to the whole-song analysis
   (ROADMAP item 6), not the live engine.
10. **Feedback** is what makes MilkDrop-style visuals flow: each frame starts from the previous frame, slightly
    zoomed, rotated, warped and darkened (`decay` 0.98 recommended), and new shapes are drawn on top. Trails,
    tunnels and smoke come almost for free. Several modes here already do a light version (`trail` fade).

## 2. Specterr (specterr.com)
A template-first video maker: upload audio, pick a preset, adjust, render in the cloud. Its editor is behind a
sign-up, so this is from its public pages and reviews.
- **Building blocks**: a spectrum ("visualiser waves", up to 7 colours, "colours can change while reacting to
  loud audio"), "hundreds of settings for the visualiser shape", a logo in the centre, artist and song text,
  background image or video, **particles** (colour, direction, size, "for an added 3D effect"), and effects
  where "the background reacts to your audio".
- **Two families**: "aggressive and flashy **bass visualisers**" for EDM and dubstep, and "**wide spectrum**
  visualisers" for calmer music. That is the same split as Basic's *Frequencies shown: bass / full*.
- **Presets are themes**: Purgatory, Red Planet, Static Zone, Synthwave, Glacier, Inferno, Magma, Skyline,
  Power Orb, Chromatic... One layout, re-skinned: the idea behind this app's theme codes.
- **What makes them look expensive** (inference from the preset previews): one strong centre object that pulses
  with bass, a spectrum wrapped around it, particles drifting toward the viewer faster when the music is louder,
  a background that zooms and brightens on hits, and a short camera shake on the biggest hits.

## 3. Vizzy (vizzy.io, docs at vizzydocs.igerman.cc)
A layer-based editor that renders in the browser. Its documentation is public and precise.
- **Structure**: Composition > Layers > Items > Controllers > Automations, plus per-layer and global Effects, and
  **Analyzers**: objects that supply audio data to anything that wants it.
- **The central idea**: nothing is hard-wired to the music. Any numeric or colour property can be driven by an
  **Audio Impact Automation**: `Min value` (when quiet), `Max value` (when loud), `Lower limit` (ignore audio
  below this), `Sensitivity` 0..1, `Smoothing` 0..1, `Cumulative` (values build up instead of returning), and a
  "delta" mode with `Delta amount` (decay speed) and `Delta threshold` (smallest change that counts). Their
  example: scale from 1 to 1.2 on an image for a pulse. Other automation types: keyframes, and maths expressions.
- **Items**: Spectrum, Audio Wave, 3D Bars, Line Bed, Particles, Particle Lines, Confetti, Spherical Field, Noise,
  Shader item, Butterchurn (MilkDrop presets), Image, Logo, Text, Lyrics, Video, 3D Model, Ground, Plane, Light.
- **Effects** (about 55): blurs (zoom blur, tilt-shift), colour (chromatic aberration, RGB displace, tint),
  distortion (impact ripple, repeating ripple, bulge, twirl, polar coordinates, mirror, trail, liquify), lighting
  (bloom, god rays, streak glow), motion (**camera shake** with amplitude X/Y 0..30, rotation, frequency 0..10,
  octaves 1..5, motion blur, RGB split), stylise (glitch, kaleidoscope, pixelate, VHS).
- **Lesson for this project**: build the engine as *sources* (bands, hits, energy) and let each mode and each
  future spell declare *mappings* from a source to a property with min, max, threshold and smoothing. The game's
  "magic is a visualiser" idea is exactly this: a spell is a set of mappings.

## 4. The two videos in test-songs (measured, not eyeballed)
Method: `ffmpeg` decodes sound and frames; a script measures each bar position's height in every frame and
correlates it with the strength of 30 frequency bands (30 Hz to 10 kHz); it also measures how much the picture
above the bars moves and brightens. Windows chosen by loudness: the most active and the quietest stretches.

| | "Checkmate" (1080p60) | "Horror mix" (360p30) |
| --- | --- | --- |
| Picture | still artwork, slow drift only | still artwork that **zooms and brightens on hits** |
| Bars | about 140 thin black bars, dotted baseline | white dotted bars on a curved baseline, with a reflection |
| Layout | left to right, bass on the left | **mirrored, bass at both outer edges**, treble meets in the middle |
| Pitches shown | about **30 to 800 Hz**, evenly spaced | about **30 to 350 Hz** each side, evenly spaced |
| Match with the sound (r) | 0.94 to 0.96 on the bass bars | 0.85 to 0.95 on the outer bars |
| Rise / fall to half | about 33 ms each: **no smoothing** | about 133 ms each: smoothed |
| Height vs strength | height ~ strength^0.35 | height ~ strength^0.75 |
| Quiet passage | bars sit on the baseline | bars at 1 px; picture motion 0.00 |
| Loud passage | 39% of bars above a quarter of their max | edge bars to 40% of the frame; picture motion up to 3.0 |
| Picture vs sound | no relation (r < 0.1) | brightness follows loudness (r = 0.74), motion follows sub-bass and flux (r = 0.37) |

What this says:
1. **They only draw the bass and low mids.** That is why one kick is one clean spike, not a smear.
2. **They do not level the loudness.** A quiet part is nearly flat and a drop is huge; that contrast is the
   show. (The user noticed the same thing: "they move a lot in active music parts".) Hence the long auto-level
   memory and the loudness curve.
3. **The second layer is the picture itself**: zoom, shake and brightness, driven by sub-bass and by sudden
   change, and completely still when the music is calm.
4. Neighbouring bars rise together into rounded bumps (visible in the frames): Basic's *Rounded peaks*.

Both read 4 frames (133 ms) "early" against the decoded sound. The same offset in two unrelated videos means it
comes from how the tool lines up sound and frames, not from the videos: treat it as no measurable lag.

## 5. What was built from this (v0.1.0)
- Analyser range -90..-12 dB, loudness curve 0.5, treble lift 4.5 dB/octave, soft ceiling, 14 s auto-level memory.
- Kick, snare, hi-hat and onset detectors; beat detection that survives a held bass note.
- `Aud.bars()` with a bass-focus linear range, a voice range, rounded peaks and per-bar smoothing.
- Basic mode layouts: mirror, rise, edges (the Horror-mix layout), ring; reflection; theme-driven glyph bars.
- `engine/songtest.js` runs the real songs through the same code and fails on pinning, missed beats or a quiet
  part that looks loud.

Not built yet, in ROADMAP.md: the picture layer (zoom / shake / brightness), mapping tables per mode, whole-song
analysis, tempo, particles toward the viewer, feedback effects.

## Sources
- Web Audio API, AnalyserNode: https://webaudio.github.io/web-audio-api/#AnalyserNode
- MilkDrop preset authoring guide: https://www.geisswerks.com/milkdrop/milkdrop_preset_authoring.html
- Vizzy documentation: https://vizzydocs.igerman.cc/ (Concepts; Audio Impact Automation; Camera Shake; Impact Ripple; sitemap)
- Specterr: https://specterr.com/ and https://specterr.com/music-visualizer/
- Reviews: https://violetrecording.com/specterr-vs-vizzy/ , https://violetrecording.com/specterr-review/
- Onset detection overview (spectral flux, adaptive threshold): https://github.com/audiojs/beat-detection
- Ellis, "Beat Tracking by Dynamic Programming" (2007); Bello et al., "A Tutorial on Onset Detection in Music
  Signals" (2005): standard references, cited from memory, not re-read for this note.
