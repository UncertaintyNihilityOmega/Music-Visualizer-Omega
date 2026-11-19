# ROADMAP: build queue and current state

## Now
- USER: every item left waits on you (a look, a listen, a phone check or a decision); see "For the user".
- v0.1.0 is tagged. No later snapshot can be tagged yet: v0.2.0 waits on items 22 and 23 (your checks).
- Built and waiting on you: 22, 23 (v0.2.0); 24, 25 (v0.3.0); 26 piano sound, 29 fish (v0.4.0); 30 Artificium
  balance, D16 (v0.6.0); 16 mini-game looks (v0.8.0).
- Done in the run of 2026-11-19 (afternoon): 6 song map, 7 "follows" settings, 9 mini-game audit, 20 special
  modes, 27 piano note icons, 31 Undarum (see "Done").
- v0.9.0 item 11 (phone pass), part done: touch targets of 40 px on touch screens, no sideways scroll, folder
  and microphone fallbacks checked, Fire and Nature light enough on a PC. Left: a real phone (you) and the
  Reader's findings (`docs/READER.md`, a Reader agent's pass at 375 px).
- v1.0.0 (items 12, 18) comes after every snapshot before it is finished.

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

22. **Keep the screen on while the visualiser plays.** Use the Screen Wake Lock API while a song plays and the
    picture is on screen (like a video site); let go on pause and when the page is hidden; ask for it again
    when the page is seen again. That also stops the phone dropping out of fullscreen when the screen goes off.
    A setting, on by default. Done when: on the user's phone the screen stays on through a whole song in
    fullscreen ("For the user" check), and `check.js` guards that the lock is released on pause.
    **Built 2026-11-19, waiting on the phone check.** `js/player/background.js` part 4; setting "Keep the screen
    on while music plays"; rules in `check.js`. The preview pane refuses a real wake lock (its tab has no
    focus), so the logic was checked with a stand-in: asked for on play, let go on pause and with the setting
    off, asked for again on play. No console errors.
23. **One permission is enough.** Today the browser asks again on every start before remembered songs load.
    Find what each browser allows (Chrome's "Allow on every visit" for files, an installed app, persistent
    storage) and use it; where a browser still asks, explain on the Music page and point to "Keep a copy".
    Facts in FACTS.md. Done when: on Chrome on PC and Android, after one "Allow on every visit", the songs load
    on start with no question (the user checks the phone).
    **Built 2026-11-19, waiting on the user's check.** Facts in FACTS.md "Remembering songs": Chrome's prompt
    offers "Allow on every visit" and grants every remembered item at once; an installed app keeps the
    permission by itself. Reconnect now asks once and only checks the rest (it asked for each one, and a second
    ask after the tap was used up could be refused); the Music page says to choose "Allow on every visit".
    Page loads with no console errors; the prompt itself cannot be shown in the preview pane.

**v0.3.0: custom modes**

24. **Clock under Ascensus Ad Incertum: speed and wings** (user check). It is laggy: measure ms per frame and
    find the cost. Redraw the wings in 2D after `inspiration/wing-example.webp` (feathered wings like it, but
    flat); the left and right wings are different from each other. Done when: under 2 ms a frame at 1280 px
    and 375 px, and the user says the wings look right.
    **Built 2026-11-19, waiting on the user's look.** Ascensus shows the Sky design; it was slow from about 330
    fills, 150 strokes and blurred shadows a frame; now the dial and wing parts are painted once and copied in
    (19 fills, 12 strokes): 1.84 to 1.06 ms at 1280 px, 1.54 to 0.92 ms at 375 px (loud). New flat wings: left,
    three stiff mechanical blades that snap apart on a kick; right, nine thin plumes that flutter one after
    another; a hue each under the rainbow code. On an upright phone the wings fold above the dial.
25. **Clock: Gears and Sand as two designs** (user check). Gears: flat gears like gear icons (fits the Clock's
    art style), more gears, all meshing in time. Sand: its own design in the layout bar. The sand can be
    grabbed and thrown (mouse and touch) and lands in piles that stay apart; it slowly fills the whole screen
    in 10 minutes. Done when: both designs are in the layout bar, work with every code, under 2 ms a frame
    (sand measured near full), and the user says they look right.
    **Built 2026-11-19, waiting on the user's look.** Gears: 18 flat gear icons (was 11) in four trains, square
    teeth and a hole, neighbours turning opposite ways in time; a tap shoves them. Sand: a new design in the
    layout bar (hourglass icon); pours in thin streams, faster when the music is big, stops on pause, lies in
    coloured layers; press and drag to scoop, let go while moving to throw, it lands in separate heaps; when
    full it drains out of the bottom in about 30 s and starts again. In fullscreen a tap on Sand does not
    pause. 0.55 to 0.7 ms a frame with the picture 95% full. Weak: on a phone a drag on the Sand picture does
    not scroll the page; quiet passages not measured.

**v0.4.0: special modes**

26. **Piano plays piano sounds.** In Piano mode the speakers play real piano notes for the keys the analysis
    picks from the song, instead of the song itself; touching a key plays that key too. Offline, so the sound
    is made in the app (synthesised with Web Audio) or from a small free sample set kept in the repository
    (licence in FACTS.md). A setting switches back to the song. With the late sound, a note sounds as it lands
    on its key. Done when: a piano song in Piano mode is heard as piano notes that match the falling notes,
    touch plays notes, and the setting brings back the song.
    **Built 2026-11-19, waiting on your listen.** A small piano made in the app (`js/core/piano-voice.js`, no
    sample files): each found note is struck as it lands, let go when its end is heard; a touched key (black
    keys too) plays at once. The song is kept off the speakers only while Piano is on screen, and comes back
    when the page is hidden. Setting "Play piano notes instead of the song", on by default; a Guide line.
    Measured on the piano tutorial song: every falling note had its piano note, struck within 6 ms of landing,
    up to 8 at once; single notes sound at the right pitch (within 0.2 of a semitone); 2.4 ms a frame. Known
    limit: while a paused song's late sound is held, a touched key lights but makes no sound.
29. **Aquatic: better fish** after `inspiration/fish-example.jpg` (shape and style like it). Done when: seen at
    1280 px and 375 px and the user says they look right.
    **Built 2026-11-19, waiting on your look.** Each fish is now a flat icon like the example: a see-through
    body with a rim in its own colour (colours unchanged), a forked tail with two fin lines, a shine on the
    back, a dark pointed head with a ring eye, and the skeleton (spine and three pairs of ribs) showing
    through. Seen at 1280 px and 375 px; 0.6 ms a frame at 1280 px, 1.1 ms at 375 px; still calm when quiet
    (change per frame 1.4) and lively when loud (9.3).

**v0.5.0: song map** (items 6 and 7 done)

**v0.6.0: Artificium**

30. **Artificium: the old prompt, played and fixed.** Every Artificium row of docs/GAME-AUDIT.md (D1 to D17,
    and G1) is in the code but not play-tested: Shock Pylon (1 s stun, never faster than one hit per 2 s),
    grid selection by click, tap and WASD, one upgrade per tower, the info panel with Upgrade and Enter,
    Positioning mode, the trash can and "Selling Price", the four Techs to level 10, towers to level 30 with
    the 27 evolutions at 15, enemy HP per wave, +1% after everything is maxed. Known failure (user check): the
    window size still changes the road length, so enemies jump and towers reach too far; the board must keep
    its size in board units and zoom to fit. Done when: every D row says "confirmed" or "fixed" with the date,
    and resizing the window changes neither range nor road length (a check in `test.js` or `check.js`).
    **Built 2026-11-19, waiting on your call on D16 (balance).** Every row played by script (`Probe.artificium()`
    in `engine/probe.js`, saves blocked while it runs): D2 to D17 and G1 confirmed or fixed in
    docs/GAME-AUDIT.md. Fixed: D6 (a fixed 640 x 320 board drawn scaled to fit; road 1947 and range 108 at every
    width; `check.js` rule 8e), D17 (the level break never happened in Artificium), D13 (Power tech counted
    twice). D16: playing itself on Normal it reaches wave 61 with no life lost and 💰13,525 unspent, so it looks
    easy. On a wide PC screen the board now has empty space at both sides (it keeps a 2:1 shape).

**v0.7.0: Undarum** (item 31 done)

**v0.8.0: mini-games**

16. **Design pass on the mini-games.** Look at each as a player would and make it look better; the user's
    pictures are in `inspiration/` (`sandbox-example.jpg` for Solarium; read every file there first). Solarium
    first. One game per step, each with a before and after picture at desktop and 375 px. Done when: the user
    has seen both and says they look right.
    **Built 2026-11-19, waiting on your look** (pictures in `docs/design/`, `*-before-*` and `*-after-*`).
    Solarium: chunky blocks with light and dark edges on a dusk sky, slow blocky clouds (quicker when the music
    is big), a dark palette strip that picks the biggest swatches (21 x 2 on a PC, 14 x 3 on a phone; the
    drawing area on a phone grew from 150 to 193 px of 300). Dungeon of Echoes: a stone-brick chamber with a
    flagstone floor, two torches whose flames grow with the music, a warm sound ring round the enemy, cards
    washed in their colour with a numbered badge; on a phone the message and your HP bar no longer overlap.
    Both in a style of their own (your picture shows a well-known block game: its look was the example, not
    its textures). Weak: on a phone Solarium's view cannot be dragged (only the keyboard pans it).

**v0.9.0: phone pass**

11. **Phone pass.** Measure the two heaviest modes first (Nature with a full tree, Fire's hearth style: about
    15 ms a frame on the desktop, see engine/README.md) and make them lighter if a phone drops frames. Every
    page and mode at 375 px and on a real phone: touch targets at least 40 px, no sideways scroll, microphone
    over https, folder fallback where the folder API is missing. Done when: a Reader session finds nothing
    blocking.
    **Part done 2026-11-19.** Fire and Nature on the PC in a loud passage: 1.65 and 1.37 ms a frame (reading a
    pixel back every frame made Fire read 207 ms: that forces the canvas off the graphics card, so it is not a
    real number; a phone must be measured on the phone). Touch targets: at 375 px with every Settings group
    open, many were under 40 px; on a touch screen every control is now 40 px or more and a Settings row's
    words work its control (`check.js` rule 8g); no page scrolls sideways. "Open a music folder" falls back
    to the browser's folder chooser and hides where there is none; the microphone says it needs https. Left:
    the Reader's findings (`docs/READER.md`) and a real phone.

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
- 9 Mini-games played row by row (`Probe.dungeon()`, `Probe.solarium()`; saves, the pixel art in storage and
  downloads kept out of the tests): every C and B row confirmed or fixed in docs/GAME-AUDIT.md, except C7 (how
  good it looks), which is item 16. Fixed: Dungeon of Echoes' hand is 4 random cards from those owned, dealt
  each turn (it showed all of them); Solarium gives a swatch every 30 to 60 s (the setting allowed 10 to 180).
  Seen at 375 px, no console errors (2026-11-19).
- 31 Undarum played row by row (`Probe.undarum()`): S1 to S8 confirmed or fixed in docs/GAME-AUDIT.md, all 30
  evolutions deal damage. Fixed: 3x speed is now the X key, a switch, not a held Shift (Windows opens Filter
  Keys / Sticky Keys on Shift and that ended fullscreen), and it goes off when the window loses focus; the
  player is held inside the map after every move, resize and before drawing (0 frames outside at 3x speed
  against each edge; `check.js` rule 8f); the boomerang flies as its 🥏 emoji; Satellite's text says it starts
  with 2 orbs. Seen at 1280 px and 375 px, no console errors (2026-11-19).
- 7 "Follows" settings: a setting of type `'source'` lists every sound by a plain name (kick drum, hi-hat, ...);
  Rain ("Wind follows"), Fire ("Sway follows") and Nature (new: "Leaves swell with") use it, each default what
  the mode did before; documented in docs/MODES.md idea D; rules in `check.js`. Seen at 1280 px and 375 px, no
  console errors (2026-11-19).
- 6 Song map: `js/core/song-map.js` reads a whole song once in small slices (tempo, beats, hits, sections,
  energy); `node engine/songmap.js <file>` writes the JSON and `--check` checks the test songs; the energy hill
  and the hits are drawn behind the seek bar for songs on the device (up to 15 minutes). Tempo 77.5, 109.4 and
  84.9 against your counts 77.70, 109.30 and 85 (within 0.3%); the biggest drop is the strongest hit in all six
  songs; confidence 0.16 to 0.6 (it read 1). About 5 s for a 5-minute song in the browser, longest slice 20 ms;
  seen at 1280 px and 375 px, no console errors (2026-11-19).
- 20 Special modes pass: Ice measured (change per frame 0.46 quiet, 1.83 loud; 0.6 to 0.9 ms a frame at 1280 px
  and 375 px), looked at quiet and loud, right as it is; Aquatic (item 28) and Piano (items 26, 27) checked; each
  of the three has a dated line in docs/MODES.md. Better fish (29) and Piano's sound (26) go on as their own
  items (2026-11-19).
- 27 Piano note icons on touch: three drawn notes (a quaver, two joined quavers, a crotchet) in the colour of the
  key under the touch, black keys too; seen at 1280 px and at a true 375 px (picture 515 x 300) (2026-11-19).
- 28 Aquatic edges: a fish past the left or right edge comes back from the other side (drawn on both sides while
  it crosses); one that swims up out of the water leaps in an arc and splashes back in (at most one leap every
  1.2 s for the whole school); the seabed is a wall. Checked by forcing fish to each edge and stepping frames:
  0 fish out of bounds in 500 loud frames; 0.5 to 0.8 ms a frame; no console errors (2026-11-19).
- 17 Custom modes pass: review finished (docs/MODES.md "Review"); Liquid, Emoji, String, Fire, Basic and Nature
  fixed so quiet passages are calm (ratios: Liquid 12 to 28, Emoji 7 to 35, String 8 or more, Fire 5.5 or more,
  Basic 2.6 to 5.3, Nature 3.5 to 4.2 under the pale codes); Liquid and Emoji got forms for more codes; Basic's
  glyph codes halved in cost; Rain fine as it was; Clock by items 24 and 25. Every review note closed and each of
  the eight has a dated line in docs/MODES.md. All by agents, measured on numbers; few pictures looked at (2026-11-19).
- 21 Tap the picture to pause and play: in fullscreen a short tap (under 14 px of movement and 0.5 s) pauses or
  plays and shows a sign in the middle; the mode's own tap effect is skipped then, except where the mode keeps
  the tap (`keepsTap`: Piano's keys); games keep the canvas. Outside fullscreen a tap is the mode's, as before
  (the play button is there). Setting "In fullscreen, a tap on the picture pauses and plays", on by default;
  Guide page line; rules in `check.js`. Checked in the browser with a real song at 1280 px and 375 px: tap
  pauses, second tap plays, a drag does not, Piano's keys keep the tap, a game ignores it, no console errors
  (2026-11-19).

## For the user
- **Screen stays on (item 22).** Update the app on your phone (see below), play a song in fullscreen and leave
  the phone alone: the screen should stay on to the end of the song and fullscreen should stay. Pause: the
  screen may then go off as usual.
- **One question (item 23).** On the PC (Chrome or Edge), open the app with remembered songs and tap
  Reconnect: in the browser's question choose "Allow on every visit". Close the app, open it again: the songs
  should be there with no question. Installing the app (Music > Install the app) should do the same by itself.
- **Clock (items 24 and 25).** Settings > the bar at the top: Sky under the code Ascensus Ad Incertum (new
  wings, should no longer lag), Gears (flat gear icons), and the new Sand (press and drag to scoop sand, let go
  while moving to throw). Say whether they look right.
- **Piano plays piano (item 26).** Play a piano song in Piano mode (for example the Silksong piano tutorial in
  test-songs) and listen: do you hear piano notes that match the falling notes? Touch a few keys, black ones
  too. Settings > Piano > switch off "Play piano notes instead of the song": the song should come back. Say
  whether the piano sound is good enough.
- **New fish (item 29).** Aquatic mode: do the fish look right next to `inspiration/fish-example.jpg`?
- **Artificium balance (item 30, D16).** Playing itself on Normal it reaches wave 61 with no life lost and
  💰13,525 unspent, so it looks easy. Should enemies get tougher per wave ("Enemy HP per wave/level" is 0.085)?
  Also: the board now keeps one shape (2:1) and zooms to fit, so a wide PC picture has empty space at its
  sides; say if you would rather it filled the width.
- **Undarum speed key (item 31).** 3x speed is now the X key (press once on, once off) instead of holding
  Shift. On the PC in fullscreen, check it no longer throws you out of fullscreen.
- **Mini-game looks (item 16).** Pictures in `docs/design/` (before and after, PC and phone width): Solarium
  and Dungeon of Echoes. Say whether they look right, and whether Solarium should get finger-dragging to move
  around a big drawing on a phone (today only the keyboard pans it).
- **Phone pass (item 11).** On your phone: open every page and a few modes and games; tell a run anything
  that is hard to tap, cut off or slow.
- **Update the phone's copy of the app**: open it once with the network on, close it and open it again.
- **Google Search Console** comes at the very end, before v1.0.0 (item 18). It needs your Google account:
  nothing to do until a run asks for the verification file or tag.
