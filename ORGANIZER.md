# ORGANIZER: how this project is run

Read this first in every session, then ROADMAP.md. State lives in files, never in a chat.

## The project
Music Visualiser Omega: a music player and visualiser for phone, PC and web that plays songs already on the
device, listens to the microphone, and works offline. Plain HTML, CSS and JavaScript, no build step: opening
`index.html` runs it. Repository: https://github.com/UncertaintyNihilityOmega/Music-Visualizer-Omega

## Roles
The project is small (4 areas, under 20 units each), so one session plays one role at a time and never mixes two.

| Role | Does | Owns |
| --- | --- | --- |
| Organizer | engine, tools, design, git, the queue, answers the user | `engine/`, root docs, `js/core/`, `css/`, `index.html` |
| Specialist | plans an area, builds its gold unit, reviews every 4 packages | `docs/MODES.md`, `docs/GAME-AUDIT.md`, package briefs |
| Writer | builds one package (2 to 3 units) to the gold unit's standard | the unit files of that package |
| Reader | uses the finished app as a new user on a phone-width screen; files what confuses | notes under "Reader" in the area's doc |

A Writer never reviews its own package.

## Areas and units
| Area | Folder | A unit is | Gold unit |
| --- | --- | --- | --- |
| Core | `js/core/` | one engine feature | the analysis engine (`analysis.js`) |
| Modes | `js/modes/` | one visual mode (custom or special, see "User decisions") | **Basic** (`mode-basic.js`) |
| Games | `js/games/`, `js/tools/` | one game | Defense, after its audit |
| App | `js/pages/`, `js/player/`, `css/` | one page | Music page |

## The four gates before a unit counts
1. `node engine/test.js` passes (engine self-test).
2. `node engine/check.js` shows 0 errors.
3. `node engine/songtest.js` passes when the unit touches sound (needs `test-songs/`).
4. Seen working in a browser with a real song, at desktop and at 375 px wide, with no console errors.
A review by a fresh session every 4 packages; a Reader pass before a release.

## Rules
- One step per session: read ROADMAP "Now", do the next queue item (or the user's request), run the gates,
  commit only that step's files, update ROADMAP.
- A rule lives in one file; other files point to it. Numbers that shape the sound live in
  `js/core/analysis.js` `DEFAULT_CFG` and nowhere else.
- Never type bulky assets by hand: the app icon comes from `engine/icons.js`. The small button icons are short
  line drawings in `js/core/icons.js`; a new mode, game, code or page needs one (`check.js` enforces it).
- A new theme code needs a look for every mode left of the line (`look.fire`, `rain`, `nature`, `clock`,
  `liquid` in `themes.js`); `check.js` enforces it. After any change to a file the app loads, run
  `node engine/sw-build.js`.
- Facts come from a source and go in FACTS.md with the date. Measured numbers go in `engine/README.md`.
- A fault found by hand becomes a check in `engine/check.js`, `engine/test.js` or `engine/songtest.js`.
- The app must work with no network: no web fonts, no CDN scripts (`check.js` enforces it).
- Classic scripts, not modules, so `index.html` opens from disk. Load order is in `index.html` and checked.
- British spelling in what the user reads ("Visualiser"). File and repository names keep their spelling.
- Writing style for docs and UI text: plain words, short sentences, numbers over adjectives.

## User decisions (date, decision)
- 2026-11-15: **No subagents for now.** Sessions do the work themselves until the user says otherwise.
  **Lifted 2026-11-16** ("continue with agents", when the session moved from Fable to Opus 5.5): agents are
  allowed within AGENT-RUN.md's limits. The scheduled task's stored prompt still says "no subagents"; it is
  left as the user wrote it. 2026-11-17: an agent sees and edits only its own files and uses the preview server.
- 2026-11-15: Title is "Music Visualiser Omega" (was "Our Playlist"). The old look is the theme code "Love".
- 2026-11-15: Music is played from where it already is on the device; nothing is copied into the app.
- 2026-11-15: The work of this plan, when the queue's release item is done, is snapshot **v0.1.0**.
- 2026-11-15: v1.x will add a large survivor game whose spells are visualisers. Engine not chosen: docs/GAME-PLAN.md.
- 2026-11-16: Visuals should stay calm in quiet passages and move a lot in active ones (seen in the test videos).
- 2026-11-16: Gold unit (Basic mode and engine v2) approved. Icon 12 "Bold Layers" chosen.
- 2026-11-16: v1.x game stays on HTML + JavaScript (no separate engine).
- 2026-11-16: Old files deleted: `Music_Visualizer-Project.html`, `serve.ps1`.
- 2026-11-16: Runs may use the preview server, and may do several steps: keep going until the 5-hour meter is
  at 75% or the weekly one at 95% (AGENT-RUN.md). No agents. The 95% weekly limit is confirmed.
- 2026-11-16: The scheduled task stays switched off; the user starts runs by hand. Its plan stays as written.
- 2026-11-16: Publishing approved (ROADMAP items 3 and 2): the repository was pushed to GitHub and the user
  switched on GitHub Pages.
- 2026-11-16: **Runs may push to GitHub on their own** (standing approval). Push after each step's commit;
  never force-push. A push to `main` publishes the site.
- 2026-11-16: No settings icon on the picture: the Settings tab is enough (the S key still opens it).
- 2026-11-16: A mode's layout is chosen in a bar at the top of the Settings page, above the codes, that looks
  like the page tabs; it is not a row in the mode's settings list.
- 2026-11-16: A theme code must change more than a mode's colours. String is the model: "Strings look really
  good with all theme codes, but fire only changes color". Fire now has a form of its own per code.

- 2026-11-16: The app must be installable ("download the app") and keep playing in the background on a phone.
- 2026-11-16: Mode row: modes that follow the codes on the left, a small vertical line, the rest on the right.
  Games row: Undarum (was Survivor) first, Artificium (was Defense) second, a line, then the mini-games
  Dungeon of Echoes (was Cards) and Solarium (was Sandbox). v1.x grows Undarum, v2.x grows Artificium; the
  other two stay mini-games. Ids in the code stay `rpg`, `td`, `cards`, `sandbox`.
- 2026-11-16: Omega is the default theme, so the default look of Fire, Nature, Clock (and Rain) fits Omega.
- 2026-11-16: The code "Tessa" is an electric theme; its button stands next to Omega's.
- 2026-11-16: Buttons carry a small icon left of the text: modes, codes, layouts, and the four page tabs.
- 2026-11-16: Unused files may be deleted (the icon options were); `node engine/unused.js` lists candidates.
- 2026-11-16: For a mode built from an example video, look hardest at the moments the music booms.
- 2026-11-16: **Four kinds of mode.** Custom modes change with the codes (Basic, String, Emoji, Fire, Rain,
  Nature, Clock, Liquid). Special modes keep an art style of their own and never follow the codes (Ice,
  Aquatic, Piano). Complex games are improved deeply in v1.x and v2.x (Undarum, Artificium). Mini-games stay
  small (Dungeon of Echoes, Solarium). So there is no "more themes" item: queue item 10 was withdrawn.
- 2026-11-16: **Versions.** v0.1.0: all custom modes improved, phone adaptations, engine updates, and Google
  Search Console as the very last step. v0.2.0: all special modes improved, remembering folders and songs,
  folders inside the app. v0.3.0: all mini-games improved.
- 2026-11-16: The README lists every code word and does not say what any of them does.
- 2026-11-16: An example video shows how a visualiser behaves; it is not a palette. Piano keeps its colours.
- 2026-11-16: Checked by the user on their phone: the app installs, works online and offline, plays in the
  background, and repeat and shuffle work. The Tessa looks are approved ("especially ... the nature section").
- 2026-11-16: The app is prepared for iPhone and Safari too; the check on a real iPhone waits under "For the
  user" until the user can do it.
- 2026-11-16 (fourth list): checked on the user's phone: "repeat one" and "repeat all" both keep playing; the
  folder comes back with "Reconnect" (the browser asks for permission again, as expected).
- 2026-11-16: **Keep a copy** of added songs inside the app is a switch the user turns on, in every browser,
  not only on iPhone (useful later for the folders inside the app). Off by default, so the decision of
  2026-11-15 ("nothing is copied") still holds until the user turns it on.
- 2026-11-16: Piano should look like the piano video in behaviour: notes fall onto the keys and land as they
  are heard. The colours stay Piano's own.
- 2026-11-16: Every mode must look right in fullscreen on a phone. The Clock design was judged ugly and is
  redrawn.
- 2026-11-16: The app may go to the Play Store later (a native Android shell); not now.

## Decisions the Organizer made (the user can reverse any of them)
- 2026-11-15: "Divide all pages into their own files" is done as one app shell (`index.html`: canvas, mode rows,
  transport) plus four pages in `js/pages/` (Music, Games, Settings, Guide) switched by tabs. Separate HTML
  documents were rejected because music would stop on every page change.
- 2026-11-15: Default theme is the dark purple "Omega" look taken from `inspiration/example-icon`.
- 2026-11-16: Volume is applied after the analyser, so turning the music down does not shrink the visuals.
- 2026-11-16: Commits were local only until the user approved publishing; they did so the same day (see above).
- 2026-11-16: GitHub Pages publishes the `main` branch as it is (the user's setting: "Deploy from a branch"),
  so the tools and project notes are public too. `.github/workflows/pages.yml` only runs the two checks; it
  does not deploy, because two deployers raced each other. `.nojekyll` keeps GitHub from rewriting the files.
- 2026-11-16: A setting of type `'layout'` in a mode's schema is that mode's layout choice: `settings.js`
  draws it in the layout bar and leaves it out of the mode's list. One per mode.
- 2026-11-16: A web address whose server blocks reading is played on a second, plain player
  (`S.plainAudio`), because the browser silences such a source once it is wired into the analysis.

- 2026-11-16: Offline: `sw.js` keeps a copy of the app's files under a name that holds a hash of their contents
  (`node engine/sw-build.js` writes it; `check.js` fails when it is stale). It is not registered on localhost
  unless the address ends in `?sw=1`. To test offline: load with `?sw=1`, stop the preview server, reload.
- 2026-11-16: On iPhone and iPad a song moves to the plain player while the page is hidden
  (`js/player/background.js`), because Safari silences analysed sound in the background. Not tested on a device.
- 2026-11-16: "Repeat one" (and "repeat all" with one song) is the player's own loop (`el.loop`), not a restart
  from script when the song ends: with the screen off a phone may refuse or delay that restart. Every start of
  sound goes through `P.safePlay`; a start refused while the page is hidden is made up for when it is seen again.
- 2026-11-16: **Remembered songs** (`js/player/library.js`): folders and single files are kept as handles in
  IndexedDB where the browser has the File System Access API; with "Keep a copy" on, a song is kept as a copy
  (a Blob) instead, which every browser supports. On start: copies and anything with permission still held
  load at once; the rest wait for one tap on "Reconnect". The last song and its second come back paused.
  `check.js` guards: the switch is off by default, copies only behind it, nothing from last time autoplays.
- 2026-11-16: **Late sound** (`audio-engine.js`): while Piano is on screen the speakers get the song 2.3 s
  after the analysis hears it, so a note can fall for 2.3 s and land as it is heard. Only Piano asks for it
  (`check.js`); every other mode, and the microphone, get the sound at once. Pause holds the delayed sound
  (the sound engine is suspended); a seek or a new song mutes what is still in the delay.
- 2026-11-16: **Fullscreen**: one set of rules for real fullscreen and the iPhone stand-in (class "is-full").
  The picture fills the screen; the buttons lie over its lower edge in one sliding line and fade out after
  3.5 s without a touch; a phone held upright turns the picture sideways (setting "Fullscreen on a phone
  turns the picture sideways", on by default; an iPhone cannot be turned by a page).
- 2026-11-16: iPhone: the sound session is set to "playback" (the silent switch no longer mutes the music); the
  fullscreen button fills the window where a page element cannot go fullscreen; text boxes use 16 px letters
  there so tapping one does not zoom the page. `check.js` guards all three. Not tested on a device.

## Environment (this machine)
- Windows 10, PowerShell. Node 24. **No Python** (the `python` command is the Store stub): tools are Node only.
- `ffmpeg` and `ffprobe` are on the PATH; `gh` (GitHub CLI) is not.
- Preview: `node engine/serve.js` (port 8123), launched from `.claude/launch.json` as "static-server".
- `test-songs/` holds real copyrighted songs and two visualiser videos: git-ignored, never published.
  `inspiration/` is git-ignored too (third-party images).
- A hidden browser pane throttles animation frames: measure frame rate only while the pane is visible.
- Shell text eats quotes and backslashes (a doubled backslash arrives as one, even in a quoted heredoc): write
  scripts with the file tool, then run them.
- The preview server answers on `localhost` and `[::1]`, not on `127.0.0.1`. A page opened on `localhost:8123`
  sees `http://[::1]:8123/...` as another site that blocks reading: a ready-made test for such addresses.
- `git push` to GitHub works with the credentials stored on this machine. Without `gh`, read a workflow's
  result from `https://api.github.com/repos/<owner>/<repo>/actions/runs` with `curl`.
- The user may be using the preview's first tab during a run: test in a tab of your own (`tabs_create`). Both
  tabs share saved settings, so do not save test values.

## Files
| File | What |
| --- | --- |
| ROADMAP.md | the only status record: Now, Rules, Queue, Done, For the user |
| AGENT-RUN.md | how scheduled and manual runs work |
| PROMPTS.md | one copy-paste prompt per kind of session |
| FACTS.md | facts with sources |
| CHANGELOG.md | what a user would notice, per release |
| docs/HOW-IT-WORKS.md | how sound becomes a picture, for a beginner |
| docs/RESEARCH.md | the science, Specterr, Vizzy, the measured videos |
| docs/MODES.md | every mode: what it listens to, ideas |
| docs/GAME-AUDIT.md | the old game requirements, each with its state |
| docs/GAME-PLAN.md | the v1.x game: engine choice, song map |
| engine/README.md | the tools and the numbers measured with them |
