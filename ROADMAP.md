# ROADMAP: build queue and current state

## Now
- The site is live: https://uncertaintynihilityomega.github.io/Music-Visualizer-Omega/ (GitHub Pages publishes
  the `main` branch on every push). Runs may push on their own (ORGANIZER.md).
- All work is committed and pushed. No lock is left.
- Gates at the last commit: `test.js` 25 of 25, `check.js` 0 errors, `songtest.js` not run (the analysis did
  not change), browser check at desktop and 375 px with a real song: no errors.
- Run of 2026-11-16 (the user joined it): install and offline (item 4), background play, mode and game
  buttons regrouped, games renamed, Rain / Nature / Clock follow the codes, the Tessa code, the Liquid mode,
  icons on buttons, unused files removed. Details under "Done".
- Next steps that need no one: item 16 (design pass on the games), item 6 (song map), item 7 (mapping
  selectors), item 9 (game audit), item 10 (more themes).
- Item 8: P1 to P4 are built and checked. Left: the review after P4 (a session that did not write the modes;
  two notes wait under "Review" in docs/MODES.md) and P5 (needs item 6). Liquid and the new theme looks are
  for that review too.

## Rules
- After each step: `node engine/test.js`, `node engine/check.js`, `node engine/songtest.js` if sound changed,
  browser check, commit that step's files, update "Now".
- The queue holds unfinished items only. At the end of every run finished items move to "Done", finished lines
  leave "Now", and anything only the user can do goes under "For the user". Queue numbers never change.
- An item is done only when its "Done when" line is true.
- Version: the app says `0.1.0-dev` until item 12, which sets `0.1.0` and tags it.

## Queue
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
10. **More themes.** More code words, and theme looks for the modes that have none yet: Ice, Aquatic, Piano
    (they sit right of the line in the mode row until they do), and the game arenas. Emoji's background does
    not follow dark themes yet. Done when: every visual mode follows every code.
11. **Phone pass.** Every page and mode at 375 px and on a real phone: touch targets at least 40 px, no sideways
    scroll, microphone over https, folder fallback where the folder API is missing. Done when: a Reader session
    finds nothing blocking.
12. **Debug pass and release v0.1.0.** Full routine: self-test, check, songtest, every mode for 10 s with two
    songs and no console errors, every page at 375 px, external links. Then set version `0.1.0`, write the
    CHANGELOG entry, tag `v0.1.0`. Done when: the tag exists and the published site shows v0.1.0.

16. **Design pass on the games** (asked by the user, 2026-11-16). Look at every game as a player would and make
    it look better: Undarum, Artificium, Dungeon of Echoes, Solarium. The user's pictures of how things should
    look are in `inspiration/` (`sandbox-example.jpg` for Solarium; read every file there first). Undarum
    grows large in v1.x and Artificium in v2.x, so their pass sets the style; the other two stay mini-games.
    One game per step, each with a before and after picture at desktop and 375 px. Done when: the user has
    seen all four and says they look right.

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
- 15 Fire follows the theme codes (asked by the user): `look.fire` in `themes.js` gives each code a flame colour, a hot core and a dark hearth; the rainbow theme gives each flame its own hue; the default theme keeps the user's own colours; "Follow theme" switch; `check.js` checks every theme's fire and that its hearth is dark. White share in a loud passage 10% or less in every theme, at desktop and 375 px (2026-11-16).
- 3 (first part) Published to GitHub with the user's approval: remote added, the repository's first commit joined (no force-push), `main` pushed; `.github/workflows/pages.yml` runs `test.js` and `check.js`, then deploys only the app's files. Both checks pass on GitHub (2026-11-16).
- 13 Small known faults, all four fixed and each guarded by a rule in `check.js`: (a) a web address that blocks reading was confirmed to "play" in silence over a black picture; it now plays on a second, plain player and the picture shows the idle preview, with a note; (b) an imported settings file says which settings version it holds, and outdated groups are skipped; (c) shuffle and repeat are drawn icons in the theme's colours; (d) the saved theme's colours are set by a small script in the page head before the first paint (2026-11-16).
- 3 (second part) The user switched on GitHub Pages; the public URL loads the app, its scripts and icons. Pages publishes the `main` branch itself, so the workflow was cut down to the two checks; `.nojekyll` added (2026-11-16).
- User requests of 2026-11-16: the settings icon on the picture removed (the S key still opens Settings); a layout bar at the top of the Settings page for the current mode's layouts (Basic, Emoji, Clock, Fire), drawn from a new `'layout'` setting type; Fire given eight styles, one per theme code (fireworks, cauldron, candles, sun, pixels, vortex, aurora, and the hearth), each also selectable by hand.
- 2 and 3 Phone check, by the user (2026-11-16): the site loads and works on the phone, the installed icon and the microphone too.
- 4 Offline install: `sw.js` keeps the app's 48 files under a name that holds a hash of their contents (`node engine/sw-build.js`; `check.js` fails when it is stale); not registered on localhost unless the address ends in `?sw=1`. Checked in the browser: loaded once, preview server stopped, reloaded: the app opened and drew. A new build takes over after one reload (skipWaiting, old caches deleted). "Install the app" button on the Music page (2026-11-16).
- User requests of 2026-11-16, second list: (a) background play: lock-screen and headphone controls (Media Session), the sound engine is woken after an interruption, and on iPhone and iPad the song moves to the plain player while the page is hidden; (b) mode row: modes that follow the codes left of a line, the others right; games row: Undarum (was Survivor), Artificium (was Defense), a line, Dungeon of Echoes (was Cards), Solarium (was Sandbox); (c) Rain, Nature and Clock have a form of their own for every code (table in docs/MODES.md), with a "Follow theme" switch; Fire, Nature, Clock and Rain start in the Omega look; (d) the code "Tessa": an electric theme (Jacob's ladder for String, plasma globe for Fire, lightning tree, storm, sparks), its button next to Omega's; (e) Liquid mode after `inspiration/liquid-example.mp4`, with the boom measured on the video (drop swells about 1.4 times, two sharp horns, a bright copy behind, zoom and specks); (f) drawn icons on every mode, game, code, layout and page button (`js/core/icons.js`); (g) `engine/unused.js` reports unused files, CSS classes and ids; it found only the 20 icon options and their gallery, which were deleted (`node engine/icons.js` makes them again).

## For the user
- **Update the phone.** Open the site on the phone once with the network on, then close and reopen it: the new
  build with the install button arrives. Then Music > "Install the app". After that, switch the network off
  and open the installed app: it should start and play a song from the phone.
- **Background play.** Play a song, lock the phone or open another app, and say whether the music keeps
  going and whether the lock screen shows the song with working buttons. Say which phone (Android or iPhone):
  the iPhone path could not be tested here.
- **Look at the new things.** Settings > Code > "Tessa". Then try String, Fire, Rain, Nature, Clock and Liquid
  with each code. Say what looks wrong, above all Liquid in a loud part against the example video.
