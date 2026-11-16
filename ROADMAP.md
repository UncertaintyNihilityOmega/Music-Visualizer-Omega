# ROADMAP: build queue and current state

## Now
- A run is in progress (2026-11-16). All work is committed; nothing is pushed.
- Gates at the last commit: `test.js` 25 of 25, `check.js` 0 errors, `songtest.js` 5 songs pass, browser check
  of every mode (real song and idle, desktop and 375 px, all eight theme codes): no errors.
- Next steps that need no one: item 15 (Fire follows the theme codes), item 13 (small faults), item 4 (offline
  install), item 6 (song map), item 7 (mapping selectors). Item 3 waits for the user's word on pushing.
- Item 8: P1 to P4 are built and checked. Left: the review after P4 (a session that did not write the modes;
  two notes wait under "Review" in docs/MODES.md) and P5 (needs item 6).

## Rules
- After each step: `node engine/test.js`, `node engine/check.js`, `node engine/songtest.js` if sound changed,
  browser check, commit that step's files, update "Now".
- The queue holds unfinished items only. At the end of every run finished items move to "Done", finished lines
  leave "Now", and anything only the user can do goes under "For the user". Queue numbers never change.
- An item is done only when its "Done when" line is true.
- Version: the app says `0.1.0-dev` until item 12, which sets `0.1.0` and tags it.

## Queue
2. **Icon: phone check.** Icon 12 is set and the PNG sizes (32, 180, 192, 512) are made and listed. Left: see it
   as an installed phone icon, which needs the published site (item 3). Done when: the tab icon and an installed
   phone icon both show the chosen design.
3. **Publish.** Add the GitHub remote, push, add `.github/workflows/pages.yml` (runs test and check, then
   deploys the folder to GitHub Pages). Done when: the public URL loads and plays a local file on a phone.
   Needs the user's OK to push.
4. **Offline install.** A service worker that caches the app's own files under a versioned name, takes over on
   the next visit after a new build, and is never registered on localhost. Done when: with the network off, a
   second visit loads, plays a local song and shows visuals; and a new build replaces the old one after one reload.
6. **Song map (whole-song analysis).** `js/core/song-map.js`, pure like `analysis.js`: decode a local file, find
   tempo, beat grid, strongest hits, sections and an energy curve (format in docs/GAME-PLAN.md). Runs in small
   slices so the page never freezes; also `node engine/songmap.js <file>` writes the JSON. Show the energy curve
   and hits behind the seek bar. Done when: tempo is within 3% (or exactly half/double) of a hand count on the
   five test songs and the biggest drop of each song is among its top three hits.
7. **Mapping selectors.** A generic "follows: [source]" setting type, like Rain's wind, so any mode property can
   be pointed at any source (docs/MODES.md idea D). Done when: three modes use it and it is documented.
8. **Modes, in packages.** P1 to P4 are built (see Done). Left: the review after P4, by a session that did not
   write the modes (prompt in PROMPTS.md; open notes under "Review" in docs/MODES.md); then P5 Piano falling
   notes (needs item 6). Done when: the review's notes are closed, and P5 uses the song map, passes at 375 px
   and is in docs/MODES.md.
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
15. **Fire follows the theme codes** (user, 2026-11-16). Like String, Emoji and Clock: each code gives Fire its
    own flame colours and hearth, with a "Follow theme" switch (on by default; the user's own colours when it is
    off). Done when: all eight codes change Fire, it is in docs/MODES.md, and the white share in a loud passage
    stays under 15% in every theme (`Probe.white`).

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
- 1 Gold unit approved by the user: Basic mode and engine v2 (2026-11-16).
- 2 (first part) Icon 12 "Bold Layers" chosen by the user and set; ten more options (11 to 20) in the gallery; PNG sizes made in the browser with `engine/icon-png.html` (ffmpeg cannot read SVG here) and listed in the manifest (2026-11-16).
- 5 Picture layer: `js/core/fx.js` zooms on a kick, shakes on a strong beat, brightens on a snare, scaled by drive squared so calm passages hold still; every mode is wrapped in it and sets its own share; "Picture punch" setting; gentler with reduced motion; five checks in `test.js` (2026-11-16).
- 8 P1 to P4: String, Emoji, Rain, Fire, Ice, Aquatic, Nature and Clock rebuilt on the ideas in docs/MODES.md, plus the Basic and Piano ideas that need no song map. Each uses at least two of kick / snare / hat / drive. Calm against lively measured on two songs (table in docs/MODES.md); checked at 375 px. Fire's white burn-out was found in the browser check and fixed (2026-11-16).
- 0n `A.drive` and the one-frame events `kickHit` / `snareHit` / `hatHit` in `analysis.js`; idle "ghost song" with a calm part, a build and a full part; String, Emoji and Clock follow the theme codes; settings version 3 (2026-11-16).
- 0o `engine/probe.js`: browser probes that work while the pane is hidden (2026-11-16).
- 0p Runs: several steps per run, usage gate 75% / 95%, lock with session id; the scheduled task's prompt rewritten to match AGENT-RUN.md (2026-11-16).
- 14 v1.x game engine decided by the user: stay on HTML + JavaScript; no prototypes needed (2026-11-16).

## For the user
- **Say whether runs may push (item 3).** The last session noted that you said to commit to GitHub, but
  ORGANIZER.md records no standing approval, so automatic runs have not pushed. Say "push it" for one push, or
  "runs may push" to make it a standing rule. `test-songs/` and `inspiration/` stay private either way.
- **Look at the modes.** Run `node engine/serve.js`, open http://localhost:8123, Music > "Load the test-songs
  folder", and try each mode in a quiet and a loud part of a song. Say what looks wrong. Fire was changed most
  (it burnt out to white when loud).
- **Phone icon (item 2).** After publishing: add the site to a phone's home screen and check the icon.
- **Scheduled runs.** The task `music-visualiser-omega-next-step` is switched off (every 4 hours when on). Its
  prompt now does several steps per run. Switch it on, or keep starting it by hand.
- **Weekly usage limit for runs.** Runs stop at 95% of the weekly meter. Say if you want a lower number.
