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
| Modes | `js/modes/` | one visual mode | **Basic** (`mode-basic.js`) |
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
- Never type bulky assets by hand: icons come from `engine/icons.js`.
- Facts come from a source and go in FACTS.md with the date. Measured numbers go in `engine/README.md`.
- A fault found by hand becomes a check in `engine/check.js`, `engine/test.js` or `engine/songtest.js`.
- The app must work with no network: no web fonts, no CDN scripts (`check.js` enforces it).
- Classic scripts, not modules, so `index.html` opens from disk. Load order is in `index.html` and checked.
- British spelling in what the user reads ("Visualiser"). File and repository names keep their spelling.
- Writing style for docs and UI text: plain words, short sentences, numbers over adjectives.

## User decisions (date, decision)
- 2026-11-15: **No subagents for now.** Sessions do the work themselves until the user says otherwise.
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
- 2026-11-16: Publishing approved for that day's run (ROADMAP items 3 and 2): the repository was pushed to
  GitHub. Whether later runs may push on their own is still to be asked (ROADMAP "For the user").

## Decisions the Organizer made (the user can reverse any of them)
- 2026-11-15: "Divide all pages into their own files" is done as one app shell (`index.html`: canvas, mode rows,
  transport) plus four pages in `js/pages/` (Music, Games, Settings, Guide) switched by tabs. Separate HTML
  documents were rejected because music would stop on every page change.
- 2026-11-15: Default theme is the dark purple "Omega" look taken from `inspiration/example-icon`.
- 2026-11-16: Volume is applied after the analyser, so turning the music down does not shrink the visuals.
- 2026-11-16: Commits were local only until the user approved publishing; they did so the same day (see above).
- 2026-11-16: GitHub Pages gets only the app's own files (index.html, css, js, icons, manifest, LICENSE,
  README), not the tools or the project notes. The repository itself holds everything except the git-ignored
  folders.
- 2026-11-16: A web address whose server blocks reading is played on a second, plain player
  (`S.plainAudio`), because the browser silences such a source once it is wired into the analysis.

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
