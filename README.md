# Music Visualiser Ω

A free music player and visualiser for phone, PC and the web. It plays the songs already on your device (nothing
is uploaded or copied), can listen to your microphone instead, and needs no internet. Ten visual modes, four
mini-games that react to the music, secret code words that restyle everything, and a page that explains how
sound becomes a picture.

**Open it:** https://uncertaintynihilityomega.github.io/Music-Visualizer-Omega/

**Offline:** download the repository and open `index.html`. There is nothing to install and nothing to build.

> **Written by Claude.** This whole project (the sound analysis, the modes, the games, the pages, the tools and
> these documents) is written by Claude, Anthropic's AI. Claude can make mistakes. If you find one (a mode that
> does not react, a wrong explanation, a broken page), I would be happy if you tell me: open an issue with the
> page or mode, the song style, and what is wrong.

## What is in it

| Part | State |
| --- | --- |
| Player: files, a remembered music folder, drag and drop, direct links, shuffle, repeat | working |
| Microphone mode | working |
| Sound engine: six bands, level, energy, beat, kick, snare, hi-hat, onset | working, tested on real songs |
| Visual modes: Basic, String, Emoji, Rain, Fire, Ice, Aquatic, Nature, Piano, Clock | working; Basic rebuilt on the new engine, the rest queued |
| Mini-games: Defense, Survivor, Cards, Sandbox | working; full play-test queued |
| Theme codes (8) | working |
| Install as an offline app | planned |
| Whole-song analysis (tempo, sections, falling piano notes, bosses on the drops) | planned |
| A full survivor game whose spells are visualisers | planned for v1.x |

The build queue and what is next: ROADMAP.md. What changed: CHANGELOG.md.

## How it works
`docs/HOW-IT-WORKS.md` explains, for a complete beginner, how a song turns into moving shapes and which setting
to touch when something looks wrong. `docs/RESEARCH.md` has the reading and measurements behind the engine.

## Run and test

Requirements: any modern browser. For the tools: Node 18 or newer. For the real-song test: `ffmpeg`.

| Command | Does |
| --- | --- |
| open `index.html` | runs the app from disk |
| `node engine/serve.js` | serves it at http://localhost:8123 (the microphone and the remembered folder work best from a server) |
| `node engine/test.js` | engine self-test: 16 checks on made-up sounds with known answers |
| `node engine/check.js` | structure check: scripts, load order, modes, themes, versions, no internet use |
| `node engine/songtest.js` | runs your own songs in `test-songs/` through the engine and reports how it behaves |
| `node engine/icons.js [n]` | regenerates the icon options; with a number, selects one |

## Repository

| Path | What |
| --- | --- |
| `index.html` | the app shell: canvas, mode buttons, player controls, page tabs |
| `js/core/` | the engine: sound analysis (`analysis.js`), Web Audio wiring, settings, themes, canvas, mode registry |
| `js/modes/` | one file per visual mode |
| `js/games/`, `js/tools/` | the mini-games and the pixel-art Sandbox |
| `js/pages/` | one file per page: Music, Games, Settings, Guide |
| `js/player/` | playlist, music folder, transport |
| `css/styles.css` | all styling; colours come from theme variables |
| `icons/` | the app icon and the options it was chosen from |
| `engine/` | preview server, self-test, checks, real-song test, icon generator (engine/README.md) |
| `docs/` | how it works, research, modes, game audit, game plan |
| `ORGANIZER.md`, `ROADMAP.md`, `AGENT-RUN.md`, `PROMPTS.md`, `FACTS.md` | how the project is run and maintained |

## How it is made
The project is written by Claude in short sessions, one step each. Every step passes four gates before it
counts: an engine self-test on sounds with known answers, a structure check, a run of real songs through the
same engine, and a look in a real browser at desktop and phone width. The first unit of each kind (the "gold
unit") is built in full and approved before the others follow it. All state is in files, so any session can
continue from where the last one stopped.

## Licence
Free to use, copy, change, share and sell, with credit: "Music Visualiser Omega by UncertaintyNihilityOmega" and
a link to this repository. Content (documents, explanations, text, icons) is under CC BY 4.0;
code is under the MIT License. Details: LICENSE. No music is included: the songs you play are your own.
