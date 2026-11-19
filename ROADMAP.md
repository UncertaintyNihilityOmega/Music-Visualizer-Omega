# ROADMAP: build queue and current state

## Now
- v0.1.0 is everything built up to 2026-11-19 (the user's plan change): summary in CHANGELOG.md, tag `v0.1.0`.
- Next snapshot: **v0.2.0**, first item 21.
- Item 17 (v0.3.0) is half done: the "## Review" section of docs/MODES.md has motion and speed numbers for Omega
  and Love and the three worst faults (Liquid moves the same quiet and loud; Emoji and String move a lot when
  quiet). Not yet looked at: the other seven codes, looks, 375 px, phone fullscreen.
- Item 6 (v0.5.0) is started, not committed: the pure maths is in `.run/wip/song-map.js` (git-ignored). The
  user's beat counts agree with it (see item 6). To resume: move the file back to `js/core/` and add it to
  `index.html` in the same commit.

## Rules
- After each step: `node engine/test.js`, `node engine/check.js`, `node engine/songtest.js` if sound changed,
  browser check, commit that step's files, update "Now".
- The queue holds unfinished items only. At the end of every run finished items move to "Done", finished lines
  leave "Now", and anything only the user can do goes under "For the user". Queue numbers never change; a new
  item takes the next free number.
- An item is done only when its "Done when" line is true.
- Version by version: take the next item of the lowest snapshot that still has items.
- A finished snapshot: summary in CHANGELOG.md, version set and tagged, "Done" emptied (ORGANIZER.md
  "Versions and snapshots"). Between snapshots the app says `<next version>-dev`.
- A prompt from the user becomes queue items unless they say "immediately" (ORGANIZER.md).

## Queue

**v0.2.0: everyday playing** (things the user meets every time they listen)

21. **Tap the picture to pause and play.** In fullscreen (and on the picture outside it) one tap or click pauses
    or plays the song, so fullscreen need not be closed to stop the music. Modes that use touch (Fire's plasma
    globe, Liquid's splash, Piano's keys, Solarium) keep their touch: decide per mode (for example a short tap
    toggles only where the mode does nothing with a tap, or a double tap elsewhere) and say it on the Guide
    page. Done when: in fullscreen on desktop and at 375 px, a tap pauses and a second tap plays, in every mode.
22. **Keep the screen on while the visualiser plays.** Use the Screen Wake Lock API while a song plays and the
    picture is on screen (like a video site); let go on pause and when the page is hidden; ask for it again
    when the page is seen again. That also stops the phone dropping out of fullscreen when the screen goes off.
    A setting, on by default. Done when: on the user's phone the screen stays on through a whole song in
    fullscreen ("For the user" check), and `check.js` guards that the lock is released on pause.
23. **One permission is enough.** Today the browser asks again on every start before remembered songs load.
    Find what each browser allows (Chrome's "Allow on every visit" for files, an installed app, persistent
    storage) and use it; where a browser still asks, explain on the Music page and point to "Keep a copy".
    Facts in FACTS.md. Done when: on Chrome on PC and Android, after one "Allow on every visit", the songs load
    on start with no question (the user checks the phone).

**v0.3.0: custom modes**

17. **Custom modes pass.** First finish the review (open notes under "Review" in docs/MODES.md, by a session that
    did not write the modes; prompt in PROMPTS.md). Then one step per custom mode (Basic, String, Emoji, Fire,
    Rain, Nature, Clock, Liquid): two songs, every code, calm part against loud part measured, the weakest thing
    fixed. Worst first: Liquid, Emoji, String. Done when: the review's notes are closed and each of the eight
    has a dated line in docs/MODES.md.
    Clock notes left for a later look: the time in figures is crowded beside VIII and IV in the Roman skins,
    the hands can pass over it, Golden's sand covers the bottom of the crown on a phone, Cyberpunk is busy,
    Solarpunk's solar panels are left over.
24. **Clock under Ascensus Ad Incertum: speed and wings** (user check). It is laggy: measure ms per frame and
    find the cost. Redraw the wings in 2D after `inspiration/wing-example.webp` (feathered wings like it, but
    flat); the left and right wings are different from each other. Done when: under 2 ms a frame at 1280 px
    and 375 px, and the user says the wings look right.
25. **Clock: Gears and Sand as two designs** (user check). Gears: flat gears like gear icons (fits the Clock's
    art style), more gears, all meshing in time. Sand: its own design in the layout bar. The sand can be
    grabbed and thrown (mouse and touch) and lands in piles that stay apart; it slowly fills the whole screen
    in 10 minutes. Done when: both designs are in the layout bar, work with every code, under 2 ms a frame
    (sand measured near full), and the user says they look right.

**v0.4.0: special modes**

20. **Special modes pass: Ice, Aquatic, Piano.** They keep their own look (no theme codes). Piano's falling
    notes are built and checked by the user on phone, web and PC. Ice is left, plus items 26 to 29. Done when:
    each of the three has a dated line in docs/MODES.md.
26. **Piano plays piano sounds.** In Piano mode the speakers play real piano notes for the keys the analysis
    picks from the song, instead of the song itself; touching a key plays that key too. Offline, so the sound
    is made in the app (synthesised with Web Audio) or from a small free sample set kept in the repository
    (licence in FACTS.md). A setting switches back to the song. With the late sound, a note sounds as it lands
    on its key. Done when: a piano song in Piano mode is heard as piano notes that match the falling notes,
    touch plays notes, and the setting brings back the song.
27. **Piano: note icons on touch.** The touch effect draws music-note icons (line drawings, not emoji such as
    "🎶") in the colour of the key that was pressed. Done when: seen at 1280 px and 375 px.
28. **Aquatic: the edges.** A fish that swims past the left or right edge comes back from the other side; one
    that swims up out of the water jumps and falls back in (it does not come from the bottom); the bottom is a
    wall. Done when: checked by stepping frames with fish forced to each edge.
29. **Aquatic: better fish** after `inspiration/fish-example.jpg` (shape and style like it). Done when: seen at
    1280 px and 375 px and the user says they look right.

**v0.5.0: song map**

6. **Song map (whole-song analysis).** `js/core/song-map.js`, pure like `analysis.js`: decode a local file, find
   tempo, beat grid, strongest hits, sections and an energy curve (format in docs/GAME-PLAN.md). Runs in small
   slices so the page never freezes; also `node engine/songmap.js <file>` writes the JSON. Show the energy curve
   and hits behind the seek bar. Done when: tempo is within 3% (or exactly half/double) of the user's counts
   and the biggest drop of each song is among its top three hits.
   The user's counts (vibesdj.io, 2026-11-19): Decensus Ad Nihilum 77.70 BPM (C minor), To Be Human 109.30
   (A flat minor), Want Some Fun 85 (B minor). The song map read 77.5, 109.4 and 84.9: all within 0.3%. Left:
   the drop check (fix idea: weight a hit at a section start by how much louder the section is) and confidence,
   which reads too high.
7. **Mapping selectors.** A generic "follows: [source]" setting type, like Rain's wind, so any mode property can
   be pointed at any source (docs/MODES.md idea D). Done when: three modes use it and it is documented.

**v0.6.0: Artificium**

30. **Artificium: the old prompt, played and fixed.** Every Artificium row of docs/GAME-AUDIT.md (D1 to D17,
    and G1) is in the code but not play-tested: Shock Pylon (1 s stun, never faster than one hit per 2 s),
    grid selection by click, tap and WASD, one upgrade per tower, the info panel with Upgrade and Enter,
    Positioning mode, the trash can and "Selling Price", the four Techs to level 10, towers to level 30 with
    the 27 evolutions at 15, enemy HP per wave, +1% after everything is maxed. Known failure (user check): the
    window size still changes the road length, so enemies jump and towers reach too far; the board must keep
    its size in board units and zoom to fit. Done when: every D row says "confirmed" or "fixed" with the date,
    and resizing the window changes neither range nor road length (a check in `test.js` or `check.js`).

**v0.7.0: Undarum**

31. **Undarum: the old prompt, played and fixed.** Every Undarum row of docs/GAME-AUDIT.md (S1 to S8): magic to
    level 30 with an evolution at 15, passives to 10, Satellite from 2 orbs, Fire Breath 3 circles, Nature
    Bloom 4, one big Sweeping Laser through the player, Meteor 2, a bigger Boomerang with an emoji that shows,
    +1% after everything is maxed and no more choice screen. Known failures (user check): holding Shift in
    fullscreen throws the player out of fullscreen (likely Windows: Shift held 8 s opens the Filter Keys box,
    Shift pressed 5 times opens Sticky Keys; both take the focus), so the dash needs another key or a way
    round; spamming Shift while running down puts the player outside the map. Losing one game must not count
    as losing another (D4). Done when: every S row says "confirmed" or "fixed" with the date, and the player
    cannot leave the map (a check).

**v0.8.0: mini-games**

9. **Game audit, mini-games.** Play-test every Dungeon of Echoes and Solarium row of docs/GAME-AUDIT.md and fix
   what fails. Done when: every C and B row says "confirmed" or "fixed" with the date.
16. **Design pass on the mini-games.** Look at each as a player would and make it look better; the user's
    pictures are in `inspiration/` (`sandbox-example.jpg` for Solarium; read every file there first). Solarium
    first. One game per step, each with a before and after picture at desktop and 375 px. Done when: the user
    has seen both and says they look right.

**v0.9.0: phone pass**

11. **Phone pass.** Measure the two heaviest modes first (Nature with a full tree, Fire's hearth style: about
    15 ms a frame on the desktop, see engine/README.md) and make them lighter if a phone drops frames. Every
    page and mode at 375 px and on a real phone: touch targets at least 40 px, no sideways scroll, microphone
    over https, folder fallback where the folder API is missing. Done when: a Reader session finds nothing
    blocking.

**v1.0.0: release**

12. **Debug pass and release v1.0.0.** Full routine: self-test, check, songtest, every mode for 10 s with two
    songs and no console errors, every page at 375 px, external links. Then the snapshot steps (CHANGELOG,
    version `1.0.0`, tag). Done when: the tag exists and the published site shows v1.0.0.
18. **Google Search Console**, the very last step. A run prepares `sitemap.xml` and checks the page's title and
    description; the user adds the site in Search Console as a "URL prefix" property and passes on the
    verification file or tag, which a run commits; then the user presses Verify and submits the sitemap
    (FACTS.md "Phones"). Done when: Search Console shows the site as verified and the sitemap as read.

## Done
(Emptied when v0.1.0 was finished on 2026-11-19; its summary is in CHANGELOG.md.)

## For the user
- **Update the phone's copy of the app**: open it once with the network on, close it and open it again.
- **Google Search Console** comes at the very end, before v1.0.0 (item 18). It needs your Google account:
  nothing to do until a run asks for the verification file or tag.
