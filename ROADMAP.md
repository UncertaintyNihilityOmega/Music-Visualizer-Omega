# ROADMAP: build queue and current state

## Now
- USER: two answers unblock the queue: approve the gold unit (item 1) and pick an icon (item 2). Steps under "For the user".
- Engine v2, pages, themes, microphone, folder playback and the Piano fix are built and pass every gate. Nothing is committed to GitHub yet (local commits only).
- Next step that needs no answer: item 4 (offline install), then item 5 (picture layer).

## Rules
- After each step: `node engine/test.js`, `node engine/check.js`, `node engine/songtest.js` if sound changed,
  browser check, commit that step's files, update "Now".
- The queue holds unfinished items only. At the end of every run finished items move to "Done", finished lines
  leave "Now", and anything only the user can do goes under "For the user". Queue numbers never change.
- An item is done only when its "Done when" line is true.
- Version: the app says `0.1.0-dev` until item 12, which sets `0.1.0` and tags it.

## Queue
1. **Gold unit approval: Basic mode and engine v2.** The user plays real songs in Basic (each layout and range)
   and says what to change. Done when: the user approves, and any change asked for is made and re-tested.
   Blocks item 8.
2. **Icon.** After the user picks a number: `node engine/icons.js <n>`, then generate PNG sizes (192, 512,
   180 apple-touch, 32 favicon) with ffmpeg and list them in `manifest.webmanifest`. Done when: the tab icon and
   an installed phone icon both show the chosen design.
3. **Publish.** Add the GitHub remote, push, add `.github/workflows/pages.yml` (runs test and check, then
   deploys the folder to GitHub Pages). Done when: the public URL loads and plays a local file on a phone.
   Needs the user's OK to push.
4. **Offline install.** A service worker that caches the app's own files under a versioned name, takes over on
   the next visit after a new build, and is never registered on localhost. Done when: with the network off, a
   second visit loads, plays a local song and shows visuals; and a new build replaces the old one after one reload.
5. **Picture layer.** A shared `App.fx` for whole-scene zoom, shake and brightness driven by `kick`, `onset` and
   `energy`, still when the music is calm (docs/RESEARCH.md section 4). Setting to turn it down or off; respects
   reduced motion. Done when: Basic and two more modes use it and `engine/test.js` covers its maths.
6. **Song map (whole-song analysis).** `js/core/song-map.js`, pure like `analysis.js`: decode a local file, find
   tempo, beat grid, strongest hits, sections and an energy curve (format in docs/GAME-PLAN.md). Runs in small
   slices so the page never freezes; also `node engine/songmap.js <file>` writes the JSON. Show the energy curve
   and hits behind the seek bar. Done when: tempo is within 3% (or exactly half/double) of a hand count on the
   five test songs and the biggest drop of each song is among its top three hits.
7. **Mapping selectors.** A generic "follows: [source]" setting type, like Rain's wind, so any mode property can
   be pointed at any source (docs/MODES.md idea D). Done when: three modes use it and it is documented.
8. **Modes, in packages** (after item 1). Apply the ideas in docs/MODES.md, to the gold unit's standard:
   P1 String + Emoji; P2 Rain + Fire; P3 Ice + Aquatic; P4 Nature + Clock; P5 Piano falling notes (needs item 6).
   Done when, per package: both modes use at least two of kick / snare / hat / energy, stay calm in the quiet
   window and lively in the loud window of two test songs, pass at 375 px, and docs/MODES.md is updated.
   Review after P4.
9. **Game audit.** Play-test every row of docs/GAME-AUDIT.md and fix what fails: P6 Defense; P7 Survivor;
   P8 Cards + Sandbox. Done when: every row says "confirmed" or "fixed" with the date.
10. **More themes.** More code words, and theme looks for other modes (Clock's four skins, Emoji sets, game
    arenas). Done when: each theme changes at least Basic, the page and one other mode.
11. **Phone pass.** Every page and mode at 375 px and on a real phone: touch targets at least 40 px, no sideways
    scroll, microphone over https, folder fallback where the folder API is missing. Done when: a Reader session
    finds nothing blocking.
12. **Debug pass and release v0.1.0.** Full routine: self-test, check, songtest, every mode for 10 s with two
    songs and no console errors, every page at 375 px, external links. Then set version `0.1.0`, write the
    CHANGELOG entry, tag `v0.1.0`. Done when: the tag exists and the published site shows v0.1.0.
13. **Small known faults.** (a) A URL track whose server blocks cross-origin reads is retried without CORS, but
    its sound then reaches neither the analyser nor, possibly, the speakers: confirm and fix. (b) Importing a
    settings file exported before v0.1.0 brings back the old audio numbers: drop its `audio` and `basic` groups.
    (c) Shuffle and repeat are colour emoji that ignore the theme: draw them as icons. (d) Theme colours flash
    for one frame on load: set the saved theme's variables in a tiny inline script. Done when: each is fixed or
    shown not to happen.
14. **v1.x game: choose the engine.** Two throwaway prototypes as described at the end of docs/GAME-PLAN.md,
    then the user decides. Not part of v0.1.0.

## Done
- 0a Project structure: ORGANIZER.md, this file, AGENT-RUN.md, PROMPTS.md, FACTS.md, CHANGELOG.md, `docs/`, `engine/` (2026-11-16).
- 0b Research: the science, Specterr, Vizzy, and both test videos measured frame by frame; written in docs/RESEARCH.md; beginner explainer in docs/HOW-IT-WORKS.md and on the Guide page (2026-11-16).
- 0c Engine v2: pure `analysis.js` shared with Node; analyser range fixed (-90..-12 dB), loudness curve, treble lift, soft ceiling, long auto-level memory; kick / snare / hat / onset / energy; `Aud.bars()` (2026-11-16).
- 0d Tools: `engine/serve.js` (Range requests, test-songs list), `test.js` (16 checks), `check.js`, `songtest.js` (5 real songs pass), `icons.js` (2026-11-16).
- 0e Pages split into files: shell + Music, Games, Settings, Guide in `js/pages/` (2026-11-16).
- 0f Title "Music Visualiser Omega"; eight theme codes that restyle the page and Basic mode (2026-11-16).
- 0g Play in place: remembered music folder (File System Access API), files, drag and drop, video files' sound; nothing copied (2026-11-16).
- 0h Microphone mode (2026-11-16).
- 0i Piano mode works: the fine spectrum is now read; note picking redone in real signal strength (2026-11-16).
- 0j Basic mode rebuilt as the gold unit: four layouts, three ranges, rounded peaks, reflection, theme looks (2026-11-16).
- 0k Volume and mute no longer shrink the visuals (2026-11-16).
- 0l README.md, LICENSE, ten icon options in `icons/gallery.html` (2026-11-16).
- 0m Old game prompt: every requirement located in the code and listed in docs/GAME-AUDIT.md; difficulty explained on the Games page from the live numbers. Play-testing is item 9 (2026-11-16).

## For the user
- **Approve the gold unit (item 1).** Run `node engine/serve.js`, open http://localhost:8123, Music > "Load the
  test-songs folder", stay on Basic. In Settings > Basic try Layout (mirror, rise, edges, ring) and Frequencies
  shown (full, bass, voice). Tell Claude what looks right and what does not. The other modes will be redone to
  whatever you approve here.
- **Pick an icon (item 2).** Open http://localhost:8123/icons/gallery.html and give a number 1 to 10, or say
  what to mix or change.
- **Say when to publish (item 3).** Nothing has been pushed. Say "push it" and the repository and GitHub Pages
  are set up. `test-songs/` and `inspiration/` stay private either way.
- **Decide about two old files.** `Music_Visualizer-Project.html` (the app before it was split, git-ignored),
  `serve.ps1` (replaced by `engine/serve.js`): keep, move to `archive/`, or delete?
- **Try the codes.** Settings > Code: New Year, Halloween, Love, Solarpunk, Cyberpunk, Decensus Ad Nihilum,
  Ascensus ad Incertum. "omega" goes back to the default.
- **Game engine for v1.x.** Read docs/GAME-PLAN.md and say which way you lean; no rush, it is item 14.
- **Scheduled runs.** AGENT-RUN.md has the plan; say how often you want them and they will be created.
