# engine/: the project's tools

Node only (no Python on the build machine), no dependencies to install. `songtest.js` also needs `ffmpeg`.

| Command | Does | When |
| --- | --- | --- |
| `node engine/serve.js [port]` | local preview at http://localhost:8123: no caching, Range requests (seeking works), lists `test-songs/` for the Music page | while working |
| `node engine/unused.js` | lists files, CSS classes and element ids that nothing uses (a report, not a gate) | before a release, or after removing a feature |
| `node engine/sw-build.js` | writes the offline file list and build version into `sw.js` (the service worker) | after any change to a file the app loads; `check.js` fails until it is run |
| `node engine/test.js` | engine self-test: made-up spectra with known answers through `js/core/analysis.js` (16 checks) | after any change to `analysis.js` |
| `node engine/check.js` | structure check: every script parses and is loaded once, load order, mode buttons match registered modes, nothing loaded from the internet, themes complete, versions agree, ROADMAP sections present | before every commit |
| `node engine/songtest.js [name] [--tune]` | runs the real songs in `test-songs/` through the same engine and fails on pinned bass, missed beats, or a quiet passage that looks loud; `--tune` compares candidate settings | after any change to how sound is shaped |
| `node engine/icons.js [n]` | writes ten icon options and `icons/gallery.html`; with a number, makes that one `icons/icon.svg` | when the icon changes |

`npm run all` runs the self-test and the check.

## How songtest.js stands in for the browser
It rebuilds `AnalyserNode` as the Web Audio specification describes it (FACTS.md): 2,048 samples, Blackman
window, FFT scaled by 1/N, smoothing 0.5, decibels, then bytes over -90..-12 dB, 60 times a second. The bytes go
into the same `createAnalyzer()` the app uses. For each song it reports the loudest and the quietest 15 seconds
(found from the raw signal, skipping the first and last 8 s).

## Measured (2026-11-16, five test songs, loudest 15 s of each)
Before the engine change (range -100..-30 dB, no curve, noise floor 0.16, contrast 1.45, auto level 0.8):

| Song | Bass above 0.97 | Beats a minute |
| --- | --- | --- |
| Decensus Ad Nihilum | 89% | 0 |
| Checkmate | 56% | 0 |
| To Be Human | 93% | 0 |
| Want Some Fun | 85% | 0 |
| Horror mix (first 600 s) | 66% | 68 |

After (range -90..-12 dB, curve 0.5, treble lift 4.5 dB/octave, noise floor 0.04, contrast 1.15, auto level 0.8
with 14 s memory):

| Song | Bass above 0.97 | Bass 10% / middle / 90% | Level loud / quiet | Beats a minute |
| --- | --- | --- | --- | --- |
| Decensus Ad Nihilum | 0% | 0.54 / 0.68 / 0.79 | 0.60 / 0.17 | 140 |
| Checkmate | 0% | 0.25 / 0.42 / 0.67 | 0.43 / 0.31 | 232 |
| To Be Human | 0% | 0.48 / 0.58 / 0.71 | 0.50 / 0.19 | 116 |
| Want Some Fun | 0% | 0.43 / 0.62 / 0.77 | 0.54 / 0.14 | 300 |
| Horror mix (first 600 s) | 0% | 0.06 / 0.62 / 0.78 | 0.37 / 0.17 | 188 |

"Beats a minute" counts every detected bass hit, including off-beat bass notes, so it can be double the song's
tempo. A true tempo needs the whole-song analysis (ROADMAP item 6).

### Drive (how big this part of the song is, 0 to 1)
`drive` stretches `energy` between `DRIVE_LO` 0.14 and `DRIVE_HI` 0.46 (`js/core/analysis.js`). Measured
2026-11-16 on the loudest and quietest 15 s of each song:

| Song | Quiet part is this strong | Drive loud | Drive quiet |
| --- | --- | --- | --- |
| Decensus Ad Nihilum | 19% | 1.00 | 0.16 |
| Checkmate | 53% | 0.90 | 0.58 |
| To Be Human | 35% | 1.00 | 0.14 |
| Want Some Fun | 38% | 1.00 | 0.22 |
| Horror mix (first 600 s) | 21% | 0.79 | 0.25 |

Checkmate has no truly quiet part, so its 0.58 is right. The made-up "20 dB drop" in `test.js` reads 0.29,
because it is measured 7 to 12 s after the drop, when the auto level has already turned the quiet part up; its
limit is 0.35. `DRIVE_LO` was left alone: raising it would flatten real quiet passages to 0.

Settings tried and rejected (`--tune`, measured with auto level 0.6 and before the kick rule was added to beat
detection): curve 0.35 (loud passages too flat: 0 to 4 beats a minute in three songs), curve 0.65 (quiet
passages nearly vanish: level about 0.1 or less in four of five songs), no treble lift (overall level roughly
halves because the top bands contribute almost nothing), auto level 1.0 and 0.3 (same shape, only the scale
changes; 0.8 puts loud passages near 0.5 and quiet ones near 0.2).

## Browser probes (`engine/probe.js`)
The checks that need a real canvas. Not part of the app. In the preview, load it from the console or a
session's script tool, then call `Probe.*`:

```
var s = document.createElement('script'); s.src = 'engine/probe.js'; document.head.appendChild(s);
await Probe.songs()                   // load test-songs and play
await Probe.run(Probe.MODES, 52, 3)   // per mode: ms per frame, lit share, errors
await Probe.motion(['rain'], 46, 5, 3)// change per frame; compare a loud second with a quiet one
await Probe.white('fire', 52, 3)      // share of the picture burnt out to white
```

It steps frames with a timer, so it works while the browser pane is hidden (animation frames do not fire
there). Speed is milliseconds per frame, never a frame rate.

Measured 2026-11-16 (song 1, loud passage, canvas 944 x 320): every mode draws a frame in 0.6 to 3.0 ms on
average, 5.8 ms at worst (a frame at 60 a second has 16.7 ms). Fire burnt out to white over 36% of the picture
before its fix; after it 3% at worst (10% or less in every theme code, at desktop width and at 375 px). The loud and quiet motion numbers for every mode are
in docs/MODES.md.

## Song map (`engine/songmap.js`, ROADMAP item 6)
`node engine/songmap.js <file> [out.json]` writes a song's map (tempo, beats, hits, sections, energy; format in
docs/GAME-PLAN.md) with the same `js/core/song-map.js` the app runs. `node engine/songmap.js --check` checks every
test song: tempo within 3% (or half or double) of the user's counts, and the biggest drop (the section start with
the largest rise in energy) among the top three hits.

Measured 2026-11-19: tempo 77.5, 109.4 and 84.9 against the counted 77.70, 109.30 and 85 (within 0.3%); the
biggest drop is the strongest hit in all six songs; confidence 0.16 to 0.6 (the old rule read 1 for five of six).
In the browser a 5-minute song takes about 5 s (1.1 to 1.6 s to decode, then 2 to 3 s of work in slices; the
longest slice 20 ms). Node: 1 to 2.5 s a song.

## Timing
`songtest.js` takes about 28 s for the five songs on this machine (the hour-long file is cut at 600 s).
`test.js` and `check.js` take under a second each.

## Adding a check
- A fault in the sound numbers: add a made-up spectrum to `test.js` that shows it.
- A fault that needs a real song: add a condition to the `problems` list in `songtest.js`.
- A fault in structure (a missing file, a wrong order, a stray internet link): add it to `check.js`.

### Timing frames in a hidden pane (found 2026-11-16)
Stepping frames by hand in a hidden pane does not make the browser draw them: it saves the drawing up and does
it all at once, so one frame in a few hundred seems to take seconds (6.2 s was seen in Nature) and the average
is wrong. Two ways to get a number that means something:
- no read-back: good for comparing light modes (1 to 4 ms a frame), wrong for modes with many shapes;
- read one pixel after every frame (`ctx.getImageData(0, 0, 1, 1)`): the stalls go, but every frame then pays
  about 8 ms for the read-back itself (Liquid reads 9.7 ms this way and 1.1 ms without).
Measured with the read-back, idle song, full part, 583 x 216 canvas: Nature 23.5 ms before the tree was drawn
one stroke per depth; plain look 19.4; 5 branch levels 12.1; Liquid 9.7. Without the read-back Fire's hearth
style is the heaviest mode at 15 ms. Real frame rate must be measured with the pane on screen, or on a phone.
