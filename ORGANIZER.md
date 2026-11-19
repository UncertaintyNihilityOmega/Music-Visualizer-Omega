# ORGANIZER: how this project is run

Read this first in every session, then ROADMAP.md. State lives in files, never in a chat. This file holds the
project's current structure and rules, without dates; dates belong only to finished roadmap items, finished
snapshots and versions (ROADMAP.md "Done", CHANGELOG.md).

## The project
Music Visualiser Omega: a fun and beautiful music player and visualiser for phone, PC and web that plays songs
already on the device, listens to the microphone, and works offline. Plain HTML, CSS and JavaScript, no build
step: opening `index.html` runs it. Repository: https://github.com/UncertaintyNihilityOmega/Music-Visualizer-Omega

## Roles
One session plays one role at a time and never mixes two.

| Role | Does | Owns |
| --- | --- | --- |
| Organizer | engine, tools, design, git, the queue, answers the user | `engine/`, root docs, `js/core/`, `css/`, `index.html` |
| Specialist | plans an area, builds its gold unit, reviews every 4 packages | `docs/MODES.md`, `docs/GAME-AUDIT.md`, package briefs |
| Writer | builds one package (2 to 3 units) to the gold unit's standard | the unit files of that package |
| Reader | uses the finished app as a new user on a phone-width screen; files what confuses | notes under "Reader" in the area's doc |

A Writer never reviews its own package. The Organizer is the chat session itself (Opus), never an agent.

## Areas and units
| Area | Folder | A unit is | Gold unit |
| --- | --- | --- | --- |
| Core | `js/core/` | one engine feature | the analysis engine (`analysis.js`) |
| Modes | `js/modes/` | one visual mode (see "Kinds of mode") | **Basic** (`mode-basic.js`) |
| Games | `js/games/`, `js/tools/` | one game | Artificium, after its audit |
| App | `js/pages/`, `js/player/`, `css/` | one page | Music page |

## The four gates before a unit counts
1. `node engine/test.js` passes (engine self-test).
2. `node engine/check.js` shows 0 errors.
3. `node engine/songtest.js` passes when the unit touches sound (needs `test-songs/`).
4. Seen working in a browser with a real song, at desktop and at 375 px wide, with no console errors.
A review by a fresh session every 4 packages; a Reader pass before a release.

## Working with the user
- **A prompt from the user goes into the queue.** Unless they say "immediately", what they ask for becomes queue
  items (placed in the version where it fits), and the run continues from where the queue stood. Questions are
  answered at once; changes to these rules take effect at once.
- **Suggestions in the chat.** At the end of a run, write in the chat any suggestion about how the project is
  going, what the user could do, and what could be better.
- **Preview first.** The project is visual: every run starts the preview server ("static-server") at its start.
- **Explain from zero.** Plain words, short sentences, numbers over adjectives; British spelling in what the
  user reads ("Visualiser"). File and repository names keep their spelling.

## Versions and snapshots
- The plan runs in snapshots v0.1.0, v0.2.0, ..., v0.9.0, then v1.0.0. ROADMAP.md "Queue" lists each
  snapshot's items. Version by version: every item of a snapshot before any item of the next.
- **When a snapshot is finished:** write a short summary of it in CHANGELOG.md under its version and date, set
  the version in `js/core/app.js` and `package.json`, run `node engine/sw-build.js`, commit, tag `v0.N.0`, push,
  then empty ROADMAP "Done" for the next snapshot (the summary in CHANGELOG.md is the record).
- Between snapshots the app says `<next version>-dev`.
- After v1.0.0: v1.x grows Undarum into a large survivor game whose spells are visualisers (HTML + JavaScript,
  no separate engine; docs/GAME-PLAN.md); v2.x grows Artificium. The other two games stay mini-games.
- Google Search Console is the last step before v1.0.0. A Play Store version (a native Android shell) may come
  later, not now.

## Standing approvals
- **Runs may push to GitHub on their own** after each step's commit; never force-push. A push to `main`
  publishes the site (GitHub Pages, "Deploy from a branch").
- Runs may use the preview server, and do several steps until the usage gate stops them (AGENT-RUN.md).
- Agents are allowed within AGENT-RUN.md's limits (default per run: at most 2 Sonnet agents and 1 Opus agent).
- Unused files may be deleted; `node engine/unused.js` lists candidates. User files never.
- The scheduled task `music-visualiser-omega-next-step` may run; the user switches it on or starts it by hand.

## The app as it stands
- **Pages:** one app shell (`index.html`: canvas, mode rows, transport) plus four pages in `js/pages/` (Music,
  Games, Settings, Guide) switched by tabs, so the music never stops on a page change.
- **Kinds of mode.** Custom modes change with the theme codes (Basic, String, Emoji, Fire, Rain, Nature, Clock,
  Liquid) and stand left of a small line in the mode row. Special modes keep an art style of their own and never
  follow the codes (Ice, Aquatic, Piano). A code must change more than a mode's colours (String is the model);
  each code-following mode has a "Follow theme" switch. A mode's layout or design is chosen in the bar at the
  top of the Settings page (a setting of type `'layout'`, one per mode), not in its settings list.
- **Clock designs are not the codes.** The Clock's own designs (Classic, Gears, Garden, Grid, Sky) are chosen in
  the layout bar; the theme code sets the palette and forms of whichever design is on. Under the rainbow code it
  is rainbow.
- **Games row:** Undarum and Artificium (the complex games), a line, then the mini-games Dungeon of Echoes and
  Solarium. Ids in the code stay `rpg`, `td`, `cards`, `sandbox`.
- **Theme codes:** Omega is the default (dark purple). "Love" is the old look. "Tessa" is electric; its button
  stands next to Omega's. The README lists every code word and does not say what any of them does.
- **Buttons** carry a small drawn icon left of the text (modes, codes, layouts, the four page tabs). No settings
  icon on the picture: the Settings tab is enough (the S key opens it).
- **Behaviour:** visuals stay calm in quiet passages and move a lot in active ones. An example video shows how a
  visualiser behaves, not its palette: a mode keeps its colours unless the user asks. For a mode built from a
  video, look hardest at the moments the music booms.
- **Playing in place.** Music is played from where it is on the device. "Keep a copy of added songs inside the
  app" is a switch, off by default, in every browser.
- **Remembered songs** (`js/player/library.js`): folders and single files are kept as handles in IndexedDB where
  the browser has the File System Access API; with "Keep a copy" on, a song is kept as a copy (a Blob) instead.
  On start: copies and anything with permission still held load at once; the rest wait for one tap on
  "Reconnect". The last song and its second come back paused. `check.js` guards: the switch is off by default,
  copies only behind it, nothing from last time autoplays.
- **Folders inside the app** (`js/player/folders.js`): lists of song keys in localStorage; nothing is copied.
- **Volume** is applied after the analyser, so turning the music down does not shrink the visuals.
- **Web addresses:** one whose server blocks reading is played on a second, plain player (`S.plainAudio`),
  because the browser silences such a source once it is wired into the analysis.
- **Offline and install:** `sw.js` keeps a copy of the app's files under a name that holds a hash of their
  contents (`node engine/sw-build.js` writes it; `check.js` fails when it is stale or caches an untracked file).
  It is not registered on localhost unless the address ends in `?sw=1`. To test offline: load with `?sw=1`,
  stop the preview server, reload.
- **Background play:** lock-screen and headphone controls (Media Session). On iPhone and iPad a song moves to the
  plain player while the page is hidden (`js/player/background.js`), because Safari silences analysed sound in
  the background. "Repeat one" is the player's own loop (`el.loop`); every start of sound goes through
  `P.safePlay`; a start refused while the page is hidden is made up for when it is seen again.
- **Late sound** (`audio-engine.js`): while Piano is on screen the speakers get the song 2.3 s after the analysis
  hears it, so a note can fall and land as it is heard. Only Piano asks for it (`check.js`). Pause holds the
  delayed sound; a seek or a new song mutes what is still in the delay.
- **Fullscreen:** one set of rules for real fullscreen and the iPhone stand-in (class "is-full"). The picture
  fills the screen; the buttons lie over its lower edge in one sliding line and fade out after 3.5 s without a
  touch; a phone held upright turns the picture sideways (a setting, on by default). Every mode must look right
  in fullscreen on a phone.
- **iPhone:** sound session "playback" (the silent switch does not mute), the fullscreen button fills the window,
  text boxes use 16 px letters. `check.js` guards all three. Checked by the user on a real iPhone: all working.
- **GitHub:** `.github/workflows/pages.yml` only runs the two checks; Pages publishes `main` as it is (the tools
  and notes are public too). `.nojekyll` keeps GitHub from rewriting the files.

## Rules
- One step at a time: do the next queue item, run the gates, commit only that step's files, update ROADMAP.
- A rule lives in one file; other files point to it. Numbers that shape the sound live in
  `js/core/analysis.js` `DEFAULT_CFG` and nowhere else.
- Never type bulky assets by hand: the app icon comes from `engine/icons.js` (icon 12 "Bold Layers"). The small
  button icons are short line drawings in `js/core/icons.js`; a new mode, game, code or page needs one
  (`check.js` enforces it).
- A new theme code needs a look for every custom mode (`look.fire`, `rain`, `nature`, `clock`, `liquid` in
  `themes.js`); `check.js` enforces it. After any change to a file the app loads, run `node engine/sw-build.js`.
- Facts come from a source and go in FACTS.md. Measured numbers go in `engine/README.md`.
- A fault found by hand becomes a check in `engine/check.js`, `engine/test.js` or `engine/songtest.js`.
- The app must work with no network: no web fonts, no CDN scripts (`check.js` enforces it).
- Classic scripts, not modules, so `index.html` opens from disk. Load order is in `index.html` and checked.
- Never publish `test-songs/` or `inspiration/`; never delete user files; never create accounts.

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
| ROADMAP.md | the only status record: Now, Rules, Queue (by snapshot), Done, For the user |
| AGENT-RUN.md | how scheduled and manual runs work |
| PROMPTS.md | one copy-paste prompt per kind of session |
| FACTS.md | facts with sources |
| CHANGELOG.md | what a user would notice, one summary per snapshot |
| docs/HOW-IT-WORKS.md | how sound becomes a picture, for a beginner |
| docs/RESEARCH.md | the science, Specterr, Vizzy, the measured videos |
| docs/MODES.md | every mode: what it listens to, ideas |
| docs/GAME-AUDIT.md | the old game requirements, each with its state |
| docs/GAME-PLAN.md | the v1.x game: engine choice, song map |
| engine/README.md | the tools and the numbers measured with them |
