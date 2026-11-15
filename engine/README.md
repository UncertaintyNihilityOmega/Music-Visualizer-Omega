# engine/: the project's tools

Node only (no Python on the build machine), no dependencies to install. `songtest.js` also needs `ffmpeg`.

| Command | Does | When |
| --- | --- | --- |
| `node engine/serve.js [port]` | local preview at http://localhost:8123: no caching, Range requests (seeking works), lists `test-songs/` for the Music page | while working |
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

Settings tried and rejected (`--tune`, measured with auto level 0.6 and before the kick rule was added to beat
detection): curve 0.35 (loud passages too flat: 0 to 4 beats a minute in three songs), curve 0.65 (quiet
passages nearly vanish: level about 0.1 or less in four of five songs), no treble lift (overall level roughly
halves because the top bands contribute almost nothing), auto level 1.0 and 0.3 (same shape, only the scale
changes; 0.8 puts loud passages near 0.5 and quiet ones near 0.2).

## Timing
`songtest.js` takes about 28 s for the five songs on this machine (the hour-long file is cut at 600 s).
`test.js` and `check.js` take under a second each.

## Adding a check
- A fault in the sound numbers: add a made-up spectrum to `test.js` that shows it.
- A fault that needs a real song: add a condition to the `problems` list in `songtest.js`.
- A fault in structure (a missing file, a wrong order, a stray internet link): add it to `check.js`.
