# The v1.x survivor game: which engine, and can it share the visualiser?

A plan to discuss, not a decision. Nothing here is built. The decision is listed under "For the user" in
ROADMAP.md.

## What the game is (from the project plan)
A large survivor game in the style of Vampire Survivors where every spell *is* a music visualiser, and the song
shapes the run: an algorithm reads the whole song, finds its strong hits and its sections, and places bosses and
waves on them instead of on a fixed clock. Every song gives a different run.

## The question
The player and the mini-games are HTML and JavaScript. Should the big game be Python or Godot instead, and can the
two halves work together?

## Short answer
1. **Are the current languages right for the app?** Yes. HTML, CSS and JavaScript with the Canvas and Web Audio
   APIs are the only stack that gives phone, PC and web from one codebase, works offline, needs no install and
   publishes to GitHub Pages for free. Two additions are worth making when they are needed, not before:
   **WebGL shaders** for effects Canvas 2D cannot do at speed (bloom, feedback, zoom blur, thousands of
   particles), and **JSDoc type comments** checked by TypeScript's `checkJs` (no build step) once the code is
   large enough that typos cost time.
2. **Python for the game: no.** Pygame and Arcade have no real phone or web target, are slow for thousands of
   sprites, and would share nothing with the visualiser.
3. **Godot for the game: possible and reasonable.** It has an editor, scenes, physics, a particle system, a
   shader language, and exports to Windows, Android and the web.
4. **Staying in JavaScript for the game: also possible, and my recommendation.** Vampire Survivors itself was
   first built in Phaser, an HTML5 JavaScript framework, and only moved to Unity in August 2023 (v1.6), for
   console ports and performance at its scale. A browser can run this genre.

## Why I lean toward JavaScript (WebGL) for the game
The game's whole idea is that spells are visualisers. If the game is in the same language as the visualiser
engine, a mode written for the player *is* a spell, with no translation.

| | JavaScript + WebGL (PixiJS or plain) | Godot 4 |
| --- | --- | --- |
| Shares the visualiser code | all of it, directly | none: every mode rewritten in GDScript and Godot shaders |
| Shares the song analysis | the same file | reimplemented, or loaded as a file made by the JS analyser |
| Runs inside this app | yes, same page, same music player | as a separate web export in a frame, about 30 to 40 MB to download |
| Phone | any browser; installable as a web app | real Android app; iOS needs a Mac and a paid account |
| Thousands of sprites | yes with WebGL batching; Canvas 2D runs out near 1,500 | yes |
| Editor, level tools | none: everything is code | excellent |
| Offline | yes (web app cache) | yes (native app) |
| Sound analysis | Web Audio does the FFT | `AudioEffectSpectrumAnalyzer` gives band strengths; less control |
| Risk | you build more of the engine yourself | two codebases drift apart; the "magic = visualiser" link becomes copy work |

Godot wins if the game should feel like a native product with store releases, or if an editor matters more than
shared code. JavaScript wins if the game should live inside this app and reuse every mode.

## Can the two work together anyway? Yes, through one file.
Whatever the engine, the bridge is a **song map**: the result of reading a whole song once.

```json
{
  "version": 1, "duration": 217.0, "bpm": 174, "beats": [0.41, 0.75, 1.10],
  "hits":     [{ "t": 51.2, "strength": 0.93, "band": "low" }],
  "sections": [{ "start": 0, "end": 22.5, "energy": 0.21, "kind": "intro" }],
  "energy":   { "step": 0.5, "values": [0.05, 0.07, 0.31] }
}
```

- **Built by** `js/core/song-map.js` (planned, ROADMAP item 6): decode the file, run the same analysis as the
  live engine over the whole song, then find tempo, beat grid, the strongest hits and the section boundaries
  (where the slow energy curve steps up or down and stays there).
- **Used by the web app**: Piano mode can show notes before they sound; a seek bar can show the song's shape;
  mini-games can place waves on sections.
- **Used by the big game, in either engine**: bosses on the top hits that follow a build-up, a wave change on
  every section boundary, enemy speed from the tempo, a calm room during a quiet bridge. Godot reads the same
  JSON; the JS analyser can run in Node as a command-line tool to make it.
- Live reaction (a spell pulsing on the kick drum) uses whatever the engine offers: `analysis.js` in JS, or the
  spectrum analyser effect in Godot fed into a GDScript port of the same few formulas (the file is about 250
  lines with no dependencies, written to be ported).

## Boss placement, sketched
1. Smooth the energy curve over 4 to 8 seconds; mark **sections** where it changes by more than a set step and
   holds for at least 8 seconds.
2. A **drop** is a section start where energy jumps up after a section of rising energy or a short gap. Rank
   drops by jump size.
3. Bosses go on the top N drops, at least 45 seconds apart; if a song has none (ambient, classical), fall back to
   the strongest hits, then to even spacing.
4. Mini-bosses on the strongest remaining hits; elite waves on every other section start.
5. Difficulty within a section follows its energy; the last chorus is always the hardest.
The same song always gives the same map, so a run can be learned and shared.

## A way to decide without guessing
Before v1.0, spend one session on a throwaway test in each: 2,000 moving enemies, one spell drawn by a visualiser
mode, a 3-minute song with a song map, on a mid-range phone. Compare frame rate, how much of the visualiser was
reused, and how long each took. Then choose.
