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
- `showDirectoryPicker` and stored directory handles exist in Chromium browsers on Windows, macOS, Linux,
  ChromeOS and, since Chrome 132 (14 January 2025), Android; not in Safari or Firefox. A handle can be kept in
  IndexedDB; on a later visit the page must check `queryPermission` and ask again with `requestPermission`,
  which only works from a tap. (https://developer.chrome.com/docs/capabilities/web-apis/file-system-access and
  https://developer.chrome.com/blog/new-in-chrome-132; read 2026-11-16. This replaces the earlier "desktop only".)
- Safari (iPhone, iPad, Mac) has `navigator.audioSession`; its `type` is "auto" by default, which lets the
  ring/silent switch mute Web Audio. Setting it to "playback" stops that; background play is still not
  reliable with it. No other browser has the API. (https://www.w3.org/TR/audio-session/ and WebKit bug 237322;
  read 2026-11-16. Not tested on a device.)
- An `<audio>` element with `loop = true` restarts by itself and does not fire `ended`. (HTML specification,
  media elements; seen in the app 2026-11-16: 0 `ended` events across a loop.)
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

## Phones
- A native Android app lists every song through the media store with the permission `READ_MEDIA_AUDIO`
  (Android 13 and later). A web page has no such access: it gets only the files or the folder the user picks.
  (https://developer.android.com/training/data-storage/shared/media; read 2026-11-16.)
- Google Search Console: a GitHub Pages project site is added as a "URL prefix" property with the full address
  including the repository name, and verified with an HTML file in the repository root or a
  `google-site-verification` meta tag in the page head (DNS is not ours to change). (Guides found 2026-11-16;
  check against Google's own help page when doing it.)

## The test videos (measured with ffmpeg and a script, 2026-11-16; method and table in docs/RESEARCH.md)
- "Kirara Magic - Checkmate": about 140 bars covering about 30 to 800 Hz left to right; rise and fall about 33 ms;
  height ~ strength^0.35; the picture does not react to the sound.
- "HORROR! Nightcore Creepy Mix pt. II": mirrored, bass at the outer edges, about 30 to 350 Hz per side; rise and
  fall about 133 ms; height ~ strength^0.75; picture brightness follows loudness (r = 0.74); picture motion is 0
  in a quiet passage.
- "Skarrsinger Karmelita - Piano Tutorial" (640 x 360): keyboard on the bottom 20%; notes fall 126 px a second =
  0.35 screen heights a second, on screen 2.3 s; left hand red, right hand white; glow and small flames where a
  note lands. (docs/RESEARCH.md section 6.)

## The test songs, counted by the user
- Counted with Vibes (vibesdj.io), a paid DJ library program for macOS and Windows that reads each track's
  BPM, key (shown in Camelot notation such as "5A", and in Open Key notation such as "10m"), an energy score,
  and drops and breakdowns, and sorts tracks by them. Its percentages are its own confidence. (vibesdj.io
  front page, read 2026-11-19.)
- Decensus Ad Nihilum: 77.70 BPM (half 39, double 155), C minor (5A, 10m), energy 8 of 10, BPM confidence 52%.
- Nightcore - To Be Human: 109.30 BPM (half 55, double 219; "could be felt at half or double time"), A flat
  minor (1A, 6m), energy 7 of 10, BPM confidence 62%.
- Want Some Fun: 85 BPM (half 42, double 170), B minor (10A, 3m), energy 7 of 10, BPM confidence 64%.
  (The user, 2026-11-19.)
