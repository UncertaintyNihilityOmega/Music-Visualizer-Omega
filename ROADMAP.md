# ROADMAP: build queue and current state

## Now
- The site is live: https://uncertaintynihilityomega.github.io/Music-Visualizer-Omega/ (GitHub Pages publishes
  the `main` branch on every push). Runs may push on their own (ORGANIZER.md).
- Run of 2026-11-16/17, fourth (the user joined it): songs added one by one are remembered; a "Keep a copy"
  switch; the last song's place comes back; Piano's notes fall onto the keys; fullscreen on a phone fixed;
  Clock redrawn (by an agent: agents are allowed again, ORGANIZER.md). Details under "Done".
- Gates at the last commit: `test.js` 25 of 25, `check.js` 0 errors, `songtest.js` passed (5 songs; the
  engine's sound path changed for Piano), browser checks at 1280 px, 375 px and phone fullscreen both ways.
- Not tested on a device: Piano's late sound on a phone, fullscreen turning sideways, the remembered single
  files after the app is closed (needs Chrome on Android), everything for iPhone.
- Next steps that need no one: item 17 (custom modes pass: the review, then one mode per step; Clock is done),
  item 6 (song map), item 7 (mapping selectors), item 11 (phone pass), item 19 (c) folders inside the app.

## Rules
- After each step: `node engine/test.js`, `node engine/check.js`, `node engine/songtest.js` if sound changed,
  browser check, commit that step's files, update "Now".
- The queue holds unfinished items only. At the end of every run finished items move to "Done", finished lines
  leave "Now", and anything only the user can do goes under "For the user". Queue numbers never change.
- An item is done only when its "Done when" line is true.
- Version: the app says `0.1.0-dev` until item 12, which sets `0.1.0` and tags it.

## Queue

**v0.1.0: custom modes, phone, engine, then Google**

6. **Song map (whole-song analysis).** `js/core/song-map.js`, pure like `analysis.js`: decode a local file, find
   tempo, beat grid, strongest hits, sections and an energy curve (format in docs/GAME-PLAN.md). Runs in small
   slices so the page never freezes; also `node engine/songmap.js <file>` writes the JSON. Show the energy curve
   and hits behind the seek bar. Done when: tempo is within 3% (or exactly half/double) of a hand count on the
   five test songs and the biggest drop of each song is among its top three hits.
7. **Mapping selectors.** A generic "follows: [source]" setting type, like Rain's wind, so any mode property can
   be pointed at any source (docs/MODES.md idea D). Done when: three modes use it and it is documented.
17. **Custom modes pass** (the user's v0.1.0 line "all custom modes improved"; takes over what item 8 left).
    First the review after P4, by a session that did not write the modes (prompt in PROMPTS.md; open notes
    under "Review" in docs/MODES.md; Liquid and the theme looks belong to it). Then one step per custom mode
    (Basic, String, Emoji, Fire, Rain, Nature, Clock, Liquid): two songs, every code, calm part against loud
    part measured, the weakest thing fixed. Done when: the review's notes are closed and each of the eight has
    a dated line in docs/MODES.md.
    Clock is done (2026-11-17); notes left from its check for a later look: the time in figures is crowded
    beside VIII and IV in the Roman skins, the hands can pass over it, Golden's sand covers the bottom of the
    crown on a phone, Cyberpunk is busy, Heaven's wings are faint, Solarpunk's solar panels are left over.
11. **Phone pass.** Measure the two heaviest modes first (Nature with a full tree, Fire's hearth style: about
    15 ms a frame on the desktop, see engine/README.md) and make them lighter if a phone drops frames. Every page and mode at 375 px and on a real phone: touch targets at least 40 px, no sideways
    scroll, microphone over https, folder fallback where the folder API is missing. iPhone and Safari are part
    of it once the user can check one ("For the user"). Done when: a Reader session finds nothing blocking.
12. **Debug pass and release v0.1.0.** Full routine: self-test, check, songtest, every mode for 10 s with two
    songs and no console errors, every page at 375 px, external links. Then set version `0.1.0`, write the
    CHANGELOG entry, tag `v0.1.0`. Done when: the tag exists and the published site shows v0.1.0.
18. **Google Search Console** (asked by the user, 2026-11-16: "just at the end of the v0.1.0"). After item 12.
    A run prepares `sitemap.xml` and checks the page's title and description; the user adds the site in
    Search Console as a "URL prefix" property and passes on the verification file or tag, which a run commits;
    then the user presses Verify and submits the sitemap (FACTS.md "Phones"). Done when: Search Console shows
    the site as verified and the sitemap as read.

**v0.2.0: special modes, remembering, folders inside the app**

19. **Remember folders and songs; folders inside the app** (asked by the user, 2026-11-16; plan in
    docs/RESEARCH.md section 7). (a), (b) and (d) are built (see Done). Left: (c) folders inside the app
    (playlists): the app's own lists of remembered songs, which work best with "Keep a copy" on (the user's
    reason for the switch).
    Done when: on the user's phone the songs are back after closing and opening the app with at most one tap,
    and a song can be put into an in-app folder that is still there the next day.
20. **Special modes pass: Ice, Aquatic, Piano.** They keep their own look (no theme codes). One step per mode.
    Piano's falling notes are built (see Done); Ice and Aquatic are left. Done when: each of the three has a dated
    line in docs/MODES.md and Piano's notes land on the keys as they sound, at 375 px too.

**v0.3.0: mini-games**

9. **Game audit.** Play-test every row of docs/GAME-AUDIT.md and fix what fails. The mini-games' rows (Dungeon
   of Echoes, Solarium) are v0.3.0; the rows of Undarum and Artificium wait for v1.x and v2.x. Done when: every
   mini-game row says "confirmed" or "fixed" with the date.
16. **Design pass on the games** (asked by the user, 2026-11-16). Look at every game as a player would and make
    it look better. The user's pictures of how things should look are in `inspiration/` (`sandbox-example.jpg`
    for Solarium; read every file there first). v0.3.0 does the two mini-games, Solarium first; Undarum and
    Artificium are improved deeply in v1.x and v2.x. One game per step, each with a before and after picture
    at desktop and 375 px. Done when: the user has seen both mini-games and says they look right.

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
- 10 More themes: withdrawn by the user (2026-11-16). Special modes (Ice, Aquatic, Piano) keep their own look and do not follow the codes.
- 8 Modes in packages: P1 to P4 done (above). What was left moved: the review after P4 to item 17, P5 Piano falling notes to item 20 (2026-11-16).
- User requests of 2026-11-16, third list: (a) a song on repeat sometimes stopped on the phone: "repeat one" is now the player's own loop, every start of sound goes through `P.safePlay`, and a start refused while the page is hidden is made up for when it is seen again; rules in `check.js`; in the browser a song looped with 0 "ended" events and the next song followed with repeat off; (b) iPhone and Safari: sound session "playback", Home Screen tags, a fill-the-window stand-in for fullscreen, 16 px text boxes, no folder button where no folder can be opened; not tested on a device; (c) Piano: glow where a note starts, flames from held keys, whole key lit, roll at 0.35 screen heights a second, taken from the piano video (measured in docs/RESEARCH.md section 6); colours unchanged at the user's word; 1.3 to 1.4 ms a frame; (d) README lists the nine codes without saying what they do; (e) research: how the InShot player finds songs (Android's media store, closed to web pages) and what the app can do instead (docs/RESEARCH.md section 7); (f) the user's version plan and the four kinds of mode recorded in ORGANIZER.md; queue regrouped.
- User requests of 2026-11-16, fourth list: (a) item 19 (a, b, d): single files are remembered as handles like folders (`js/player/library.js` rewritten: folders, files and copies in one IndexedDB store; the old single folder moves over by itself); "Reconnect" brings back everything that waits for permission with one tap; a "Keep a copy of added songs inside the app" switch on the Music page, off by default, with the space used and "delete the copies"; the last song and its second come back paused. Checked in the browser: two songs kept as copies, reload: both back, the first cued at 0:42, paused, and playing on a tap; rules in `check.js`. (b) item 20, Piano: notes fall onto the keys and land as they are heard. The engine plays the song 2.3 s late while Piano is on screen ("late sound", `audio-engine.js`); pause holds the delayed sound; a seek or a new song mutes it. Measured with made-up notes of known times: every note lands within 0.01 s of the moment it is heard; overtones no longer draw ghost notes; 1.1 to 1.5 ms a frame. (c) Fullscreen on a phone: the picture fills the screen, the buttons lie over it in one sliding line and fade out, a phone held upright turns sideways; all eleven modes checked upright and sideways. (d) Clock redrawn (see docs/MODES.md "Clock"). (e) Decisions recorded in ORGANIZER.md: agents allowed again, "Keep a copy" for every browser, Play Store later.

## For the user
- **Update the phone's copy of the app**: open it once with the network on, close it and open it again.
- **Piano on the phone.** Play a piano song in Piano mode: the notes should fall and land on the keys as you
  hear them (the song starts about 2 seconds late in this mode; that is how it sees the future). Say whether
  they land in time on your phone, and whether pause and play behave.
- **Fullscreen on the phone.** Tap the fullscreen button with the phone held upright: the picture should turn
  sideways and fill the screen, the buttons fade away and come back on a touch. Try two or three modes.
- **Clock.** Say whether the new design looks right, in Omega and in one or two other codes.
- **Remembering.** Add two songs with "Add files", close the app, open it: tap "Reconnect" (or, with "Keep a
  copy" on, they are simply there). The last song should be ready at the place it stopped.
- **iPhone / Safari check, whenever one is at hand.** Open the site in Safari. (1) Add a song with "Add files"
  and play it: is there sound with the ring/silent switch on silent? (2) Lock the phone: does the music go on,
  and does the lock screen show the song? (3) Share > "Add to Home Screen", open it from there, switch the
  network off, open it again. (4) Tap the fullscreen button: the picture should fill the window. (5) Turn on
  "Keep a copy", add a song, close and reopen: is it still there?
- **Google Search Console** comes at the end of v0.1.0 (item 18). It needs your Google account: nothing to do
  until a run asks for the verification file or tag.
- **The scheduled task** still says "no subagents" in its stored prompt. Say if it should be allowed agents
  too; until then it stays as you wrote it.
