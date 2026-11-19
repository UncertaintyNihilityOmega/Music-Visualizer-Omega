# Modes: what each one listens to, and what would make it better

One section per mode. "Listens to" is read from the code. "Ideas" come from docs/RESEARCH.md; each is small
enough for one session and belongs to a ROADMAP.md item until it is built. Sources available since engine v2:
`kick`, `snare`, `hat`, `onset`, `energy`, `drive`, the one-frame events `kickHit` / `snareHit` / `hatHit`, and
`Aud.bars()`.

The four kinds (user, 2026-11-16):
- **Custom modes** change with the theme codes: Basic, String, Emoji, Fire, Rain, Nature, Clock, Liquid.
- **Special modes** keep an art style of their own and ignore the codes: Ice, Aquatic, Piano.
- **Complex games** grow large later (v1.x, v2.x): Undarum, Artificium.
- **Mini-games** stay small: Dungeon of Echoes, Solarium.

The research gave four ideas that apply to every mode:
- **A. Quiet must look quiet.** Tie the mode's overall scale to `drive` (`energy` stretched to 0 to 1), so a
  verse is small and a drop is huge.
- **B. One job per sound.** Kick moves the big thing, snare flashes or cracks, hi-hat makes sparkle, level sets size.
- **C. A picture layer.** Zoom, shake and brightness of the whole scene on strong hits, still when calm. Built
  as `js/core/fx.js`; each mode says how much of it it wants (`fx:` where the mode is registered).
- **D. Mappings, not hard wiring.** Each mode gets "X follows: [source]" selectors like Rain's wind already has.
  Not built yet (ROADMAP item 7).

## Measured: calm in the quiet part, lively in the loud part
Measured 2026-11-16 in the browser with `engine/probe.js` (`Probe.motion`): how much the picture changes from
one frame to the next (0 = still, 255 = every pixel flips), in the loud and the quiet 15 s of two test songs.

| Mode | Song 1 loud | Song 1 quiet | Song 2 loud | Song 2 quiet |
| --- | --- | --- | --- | --- |
| Basic | 6.28 | 1.46 | 8.95 | 5.13 |
| String | 12.24 | 5.04 | 15.58 | 7.16 |
| Emoji | 37.72 | 13.39 | 28.24 | 19.02 |
| Rain | 3.00 | 0.48 | 3.28 | 0.55 |
| Fire | 7.32 | 0.56 | 6.05 | 1.20 |
| Ice | 1.93 | 0.41 | 2.45 | 0.44 |
| Aquatic | 4.06 | 0.65 | 4.90 | 0.75 |
| Nature | 0.89 | 0.92 | 0.58 | 0.43 |
| Piano | 0.17 | 0.19 | 0.49 | 0.20 |
| Clock | 1.32 | 0.55 | 3.47 | 0.70 |

Piano changes little in both because only its notes move; that is its job. Nature changes slowly on purpose: it
needs about 10 s to grow or die back (0.50 loud against 0.15 quiet when given that long).

## Basic
- Listens to: the spectrum (per bar), `punch` (glow), the waveform, `drive` (brightness), `kick` (ring mark).
- Built: layouts mirror / rise / edges / dots / ring, bass-focus and voice ranges, rounded peaks, per-bar
  smoothing, reflection, theme looks (glyph bars, rainbow, black-hole ring); dotted bars on a curved line; peak
  caps that leave a fading trail; bars that brighten when the passage is loud; the theme's mark in the ring,
  jumping with the kick; the picture layer at full strength.
- Ideas left: none from the research. Sandbox's square visualiser as a layout (see Mini-games).

## String
- Listens to: the waveform split into slices from low to high (one string each), `drive` (swing), `snare`
  (pluck), `level` and `punch` (thickness, glow).
- Built: each string has its own slice of the sound instead of five copies of one wave; a snare plucks one
  string; calm music gives nearly straight strings; follows the theme code (colours, square steps for
  Cyberpunk, rings round a dark disc for Decensus Ad Nihilum, the theme's characters riding the strings).
- Ideas left: none.

## Emoji
- Listens to: the spectrum (size and which emoji per column), `punch` (pop), `drive` (how busy), `kick` (ring),
  `hat` (sparkles).
- Built: a kick throws a ring of emoji out from the centre or the photo; hi-hats make small sparkles; the photo
  swells and brightens; theme codes supply the emoji set.
- Ideas left: none.

## Rain
- Listens to: `trebleTilt` or a chosen source (wind), `drive` (how hard it rains), `kick` (puddle rings),
  `snare` (lightning), `intensity` (wind strength, splash size, puddle depth).
- Built: drizzle in a calm passage (a fifth of the drops), downpour in a loud one; lightning on a hard snare in
  a loud passage, at most one every 1.6 s; thunder shakes the picture; kick rings on the standing water.
- Ideas left: none.

## Fire
- Listens to: the bass spectrum 30 to 800 Hz (the line of flames), `drive` and `level` (flame height, embers,
  blue core), `kick` (heat haze), `hat` (floating embers), `beat` (spark bursts), a chosen source (sway).
- Built: the flame line is a spectrum (lowest notes in the middle); a small fire when calm, a tall one when
  loud; a blue core at the base in a loud passage; hi-hat embers; the flames wobble on a kick.
- Fixed 2026-11-16: in a loud passage the fire burnt out to a white block (36% of the picture pure white). The
  light is added up frame on frame, the glow had a white centre and the flames turned grey-blue. Now the flames
  stay fire-coloured, the blue is painted last at the base, and embers are fainter the more of the picture they
  cover (a phone's small canvas packs them four times as thick): now 3% white at worst in the same passage.
- Follows the theme codes (2026-11-16): each code has its own flame colour, hot core and dark hearth
  (`look.fire` in `themes.js`): New Year gold with an ice-blue core, Halloween witch-green with purple, Love
  rose with amber, Solarpunk sun-gold with green, Cyberpunk cyan with magenta, Decensus Ad Nihilum violet with
  orange, Ascensus ad Incertum a rainbow (one hue per flame, turning slowly). The default theme uses the
  colours in Settings > Fire. "Follow theme" switches it off. White at worst in a loud passage, desktop /
  375 px: 3 / 3% default, 5 / 6 New Year, 8 / 6 Halloween, 10 / 8 Love, 1 / 3 Solarpunk, 2 / 2 Cyberpunk,
  7 / 5 Nihilum, 10 / 9 Incertum (`Probe.white('fire', 50, 3)`, limit 15).
- Styles (2026-11-16, asked by the user: a code must change more than the colour). Each code names a style
  (`look.fire.style`); any style can also be picked by hand in the layout bar of the Settings page:
  - **hearth**: the row of flames on the floor (the default theme).
  - **fireworks** (New Year): a low gold fire, star embers, and every kick drum bursts a firework in the sky.
  - **cauldron** (Halloween): a narrow witch-green fire under a hanging cauldron whose brew glows with the
    music; ghosts rise as embers.
  - **candles** (Love): one small flame on each of a row of candles; hearts rise.
  - **sun** (Solarpunk): a sun rising from the floor, the flames its rays.
  - **pixels** (Cyberpunk): flames built of square blocks, embers of 1s and 0s.
  - **vortex** (Decensus Ad Nihilum): a ring of flames pointing inward, falling into a dark disc whose edge
    jumps with the kick.
  - **aurora** (Ascensus ad Incertum): rainbow curtains hanging from the top over dark hills; sparkles drift down.
  White share in a loud passage is 8% or less in every style (`Probe.white`); 0.5 to 1.3 ms a frame.
- Ideas left: none.

## Ice
- Listens to: `snare` (cracks start), `mid` (how far they reach), `drive` (frost), `hat` (glints),
  `intensity` (pressure, so music with no snare still cracks the ice).
- Built: a snare starts a crack; frost creeps in from the edges while the music is calm and shatters on the
  first hard hit of a loud part; hi-hat glints.
- Ideas left: none.

## Aquatic
- Listens to: the bass spectrum (water surface), `drive` (bubbles, light shafts, schooling), `kick` (fish
  scatter), `hat` (bubble bursts), `level`, `mid`, `trebleTilt`.
- Built: the surface is a bass spectrum line; fish school when calm and scatter on a kick; bubbles on hi-hats;
  light shafts brighten with the passage.
- Ideas left: none.

## Nature
- Listens to: all six bands (sway of different branch levels), `level` and `intensity` (growth), `trebleTilt`
  (wind), `drive` (day and night), `snare` (falling leaves), `hat` (fireflies).
- Built: a snare shakes leaves loose; wind leans the tree and carries falling leaves; night with stars and a
  moon when calm, day when loud; fireflies on hi-hats at night.
- Ideas left: none.

## Piano
- Listens to: the fine spectrum (16,384-point), note by note; `energy`.
- Built: it works (the fine spectrum was never being read) and notes are picked in real signal strength; notes
  coloured by octave; "melody only" (the strongest note of each moment); the chord name in the corner; with
  nothing playing it plays the idle song's notes. It takes no part in the picture layer: a keyboard that zooms
  and shakes is hard to read.
- Added 2026-11-16 from the piano video in test-songs (docs/RESEARCH.md section 6): a white glow where a note
  starts, small flames rising from every held key (bigger when `drive` is high; "Flames from the keys" setting),
  the whole key takes the note's colour, a brighter edge on the bars, and the roll moves 0.35 screen heights a
  second. Colours unchanged (the user: the video is the example for the behaviour, not the palette).
  1.3 to 1.4 ms a frame at 1200 px and at phone width.
- Ideas left: notes that **fall onto** the keys before they sound (ROADMAP 20). Two routes, written up in
  docs/RESEARCH.md section 6: read the whole file first (the song map), or play the sound 2.3 s late.

## Clock (redrawn 2026-11-16, asked by the user: the old one "looks pretty ugly"; designs apart from the codes 2026-11-17)
- Picture, from the middle out: a plain dial with a hairline rim, hour marks, slim hands and the time in small
  figures; a thin ring that fills as the song plays; a crown of 96 sound marks round the dial (bass at 12
  o'clock, treble at 6, the same on both sides); three faint orbits with one dot each (a minute, an hour,
  twelve hours). The heavy metal bezel, the sunburst and the crowd of letters are gone.
- Two choices, kept apart (the user: "Clock styles are literally the codes, it should not be"):
  - the **theme code** always gives the palette (`PALETTES`) and the forms (`FORMS`: hour marks as batons, dots,
    Roman, figures or hearts; crown as bars, dots, blocks, rays, a wave or bars pointing inward; hands round,
    needle or block). Ascensus Ad Incertum is the rainbow code: a hue per crown mark, rainbow light behind the
    dial, a rainbow rim and song ring, rainbow edges on the wings.
  - the **design** (the Style bar): Classic (the dial with a few of the code's characters drifting by), Gears
    (meshing clockwork and a sand pile fed like an hourglass), Garden (hills, two vines that grow and sway, leaves
    and pollen), Grid (perspective grid, circuit traces, glitches), Sky (clouds, feathered wings, motes).
    "theme" lets the code pick (`look.clock`). An old saved style that is no longer a design falls back to it.
  Every design takes its colours from the palette; metal, sand and leaf green are mixed with it.
- Gears: one tooth pitch for all, so the radius follows from the teeth; trapezoid teeth drawn as one path,
  spokes cut out, a bevelled rim, metal tinted by the palette; each driven gear starts turned so a tooth meets a
  gap (`engine/check.js` turns every meshed pair through two revolutions and fails if teeth cut into each other).
- Sand: column heights; a thin stream (from under the dial in an upright picture, else two from the top either
  side of the crown) feeds the pile; slopes steeper than sand holds slide down (small avalanches); a kick throws
  a little spray. The pile's size follows the music's energy and settles over several seconds.
- Listens to: the spectrum (the crown), `drive` (crown size, characters, rings of light, gear speed, the pile,
  the vines' reach and sway, the wings' beat, the grid's speed), `punch` (the rim glows), `kick` (second hand
  jumps, orbit dots swell, a wing beat, sand spray).
- Calm against lively, measured 2026-11-17 ("Decensus Ad Nihilum" 11 s against 44 s): gears 0.06 against
  0.33 rad/s; wing beat 0.03 against 0.30 rad; vine sway 0.016 against 0.058 of the short side. The pile sank
  from 0.23 to 0.16 of the short side in about 5 s of a calm part of "Want Some Fun".
- Size: the dial is 0.3 of the picture's short side, so the loudest crown still ends inside a wide, low
  picture; `engine/check.js` fails if it would be cut off. The wings shrink to fit a narrow or low picture.
- Ideas left: tick exactly on the beat once a tempo is known (needs the song map, ROADMAP 6).

## Liquid (added 2026-11-16, asked by the user; model: `inspiration/liquid-example.mp4`)
- Picture: a dark drop in the middle with an edge that wobbles like thick liquid, pale rings that follow the
  edge a few frames late, a whirlpool of streaks behind, the theme's mark in the middle.
- Listens to: 20 log bars 40 to 9000 Hz round the edge (bass bottom, treble top, mirrored); `drive` sets how far
  the edge moves and how fast the whirlpool turns; `kick` swells the drop; `snareHit` throws droplets.
- Calm against lively: a calm passage is a near circle that breathes; a loud one has long lobes.
- The boom, measured on the example video (bass hits at 49.8 s and 129.8 s, found with ffmpeg `astats` on the
  sound below 140 Hz): within two frames the drop is about 1.4 times its size with two sharp horns on its upper
  left and right; a bright copy flashes behind it; the background jumps towards the viewer and specks fly out;
  back to rest in about 0.3 s. The mode does all four ("Boom" setting; the bass sits on the two shoulders).
- Theme: `look.liquid` (kind ink / slime / mercury / plasma, colours, rainbow).
- Ideas left: a second drop that merges and splits (metaballs); the song map's sections changing the liquid.

## Theme looks (2026-11-16)
Every theme code gives these modes a form of their own, not only colours. The tables are in `js/core/themes.js`
(`look.rain`, `look.nature`, `look.clock`, `look.fire`); the fields are listed at the top of each mode file, and
`engine/check.js` fails when a theme lacks one. Modes that follow the codes sit left of the line in the mode row.

| Code | Rain | Nature | Clock | Fire |
| --- | --- | --- | --- | --- |
| Omega (default) | violet night rain | glowing violet tree at night | Classic: violet, Ω drifting | violet hearth |
| Tessa | thunderstorm, forked bolts | lightning tree, sparks for leaves | Classic: electric, sparks from the rim | plasma globe |
| New Year | snow | frosted tree, gold lights, snow | Classic: midnight and gold, snowflakes | fireworks |
| Halloween | bats, leaves, spiders | dead tree, orange leaves | Classic: orange and purple, bats | cauldron |
| Love | hearts | cherry tree shedding petals | Classic: cream and rose, hearts | candles |
| Solarpunk | sun shower | green tree, yellow blossom | Garden: green and gold, vines | sun |
| Cyberpunk | falling 1s and 0s | neon tree of straight lines, square leaves | Grid: neon grid, glitches | pixels |
| Decensus Ad Nihilum | rain that rises | pale tree with embers | Classic: black dial, dots spiral in | vortex |
| Ascensus Ad Incertum | rainbow rain | rainbow tree | Sky: rainbow, feathered wings | aurora |

The Clock column is the design each code picks under the "theme" style; whatever design is chosen, the code
still gives the Clock its palette and forms.

## Games (Undarum, Artificium, Dungeon of Echoes, Solarium; once Survivor, Defense, Cards, Sandbox)
- Listen to: `level` (enemy health and speed), the spectrum (background), `punch`.
- Ideas: waves and bosses placed by the song map instead of a timer (the first step toward the v1.x game);
  `kick` gives every tower or spell a small damage pulse; Sandbox's square visualiser offered as a Basic layout.

## Review
Review of 2026-11-17 (ROADMAP item 17), by a session that wrote none of the modes. **Cut short**: the user asked
for everything to be tied up before the weekly limit, so only the motion and speed numbers below were taken.
No contact sheets were made and nothing was judged by eye.

How it was measured: preview at a 1280 px window (picture 1200 x 320), frames stepped by hand every 16 ms,
"Want Some Fun", change per frame as in `Probe.motion` (0 = still, 255 = every pixel flips). Quiet: seconds 8 to
11 (`drive` 0.00 to 0.01). Loud: seconds 58 to 61 (`drive` 0.49 to 0.63). Each window comes after 3 to 4 s of
settling, because `drive` needs about 3 s to follow a seek. Ratio = loud / quiet; ms = mean ms per frame, the
higher of the two windows. No console errors.

| Mode | Code | Quiet | Loud | Ratio | ms at 1280 | ms at 375 |
| --- | --- | --- | --- | --- | --- | --- |
| Basic | Omega | 4.67 | 10.64 | 2.3 | 1.35 | not measured |
| Basic | Love | 0.76 | 1.66 | 2.2 | 2.13 | not measured |
| String | Omega | 6.69 | 10.17 | 1.5 | 0.95 | not measured |
| String | Love | 3.78 | 5.85 | 1.5 | 0.72 | not measured |
| Emoji | Omega | 12.42 | 18.05 | 1.5 | 1.47 | not measured |
| Emoji | Love | 23.06 | 26.99 | 1.2 | 0.59 | not measured |
| Fire | Omega | 0.71 | 2.23 | 3.1 | 1.29 | not measured |
| Fire | Love | 0.11 | 1.27 | 11.5 | 0.65 | not measured |
| Rain | Omega | 0.30 | 2.07 | 6.9 | 1.01 | not measured |
| Rain | Love | 0.26 | 0.80 | 3.1 | 0.62 | not measured |
| Nature | Omega | 0.17 | 0.63 | 3.7 | 1.44 | not measured |
| Nature | Love | 0.30 | 0.40 | 1.3 | 1.84 | not measured |
| Clock | Omega | 0.07 | 0.49 | 7.0 | 0.79 | not measured |
| Liquid | Omega | 1.75 | 1.76 | 1.0 | 0.60 | not measured |

Speed: every measured pair is under 2.2 ms a frame at 1280 px, far below the 6 ms limit.

Judged fine on these numbers (calm against lively only; looks not checked): **Fire**, **Rain**, **Clock** under
Omega, and Fire and Rain under Love. Their quiet passage changes 0.07 to 0.71 a frame and the loud one 3 to 12
times more.

### Review, second half (2026-11-19)
Same song, windows and method as above (preview at 1280 px, picture 1200 x 320, "Want Some Fun", quiet 8 to 11 s,
loud 58 to 61 s, 4 s of settling before each), now for every code. Codes were switched with
`App.theme.apply(id, false)` (nothing saved). Cells read quiet / loud (ratio). Run to run the quiet numbers move
by about 1 (Omega Basic read 3.51 / 9.64 on a repeat, Liquid 1.75 / 2.05), so only differences bigger than that
count. A bigger loud number under one code than another partly means the form covers more of the picture, so
compare ratios, not loud numbers, across codes. No console errors in any run. Clock: left to items 24 and 25.

| Mode | Omega | Love | Tessa | New Year | Halloween |
| --- | --- | --- | --- | --- | --- |
| Basic | 4.67 / 10.64 (2.3) | 0.76 / 1.66 (2.2) | 0.62 / 1.26 (2.0) | 0.92 / 1.87 (2.0) | 1.10 / 5.04 (4.6) |
| String | 6.69 / 10.17 (1.5) | 3.78 / 5.85 (1.5) | 2.41 / 2.04 (0.8) | 6.22 / 10.09 (1.6) | 4.91 / 8.32 (1.7) |
| Emoji | 12.42 / 18.05 (1.5) | 23.06 / 26.99 (1.2) | 14.56 / 18.17 (1.2) | 14.84 / 22.52 (1.5) | 18.39 / 26.30 (1.4) |
| Fire | 0.71 / 2.23 (3.1) | 0.11 / 1.27 (11.5) | 1.17 / 1.69 (1.4) | 0.21 / 3.32 (15.8) | 0.38 / 1.87 (4.9) |
| Rain | 0.30 / 2.07 (6.9) | 0.26 / 0.80 (3.1) | 0.59 / 5.39 (9.1) | 0.76 / 3.61 (4.8) | 1.06 / 5.31 (5.0) |
| Nature | 0.17 / 0.63 (3.7) | 0.30 / 0.40 (1.3) | 0.87 / 2.15 (2.5) | 0.68 / 1.16 (1.7) | 0.45 / 1.37 (3.0) |
| Liquid | 1.75 / 1.76 (1.0) | 0.46 / 0.53 (1.2) | 2.16 / 3.46 (1.6) | 1.66 / 1.58 (1.0) | 1.45 / 1.31 (0.9) |

| Mode | Solarpunk | Cyberpunk | Decensus Ad Nihilum | Ascensus Ad Incertum |
| --- | --- | --- | --- | --- |
| Basic | 1.01 / 1.87 (1.9) | 1.26 / 1.89 (1.5) | 0.93 / 1.43 (1.5) | 2.38 / 2.82 (1.2) |
| String | 4.85 / 7.95 (1.6) | 5.35 / 9.32 (1.7) | 2.99 / 5.68 (1.9) | 4.64 / 7.52 (1.6) |
| Emoji | 19.34 / 26.71 (1.4) | 13.67 / 19.76 (1.4) | 11.12 / 15.39 (1.4) | 19.14 / 24.65 (1.3) |
| Fire | 0.91 / 1.57 (1.7) | 1.06 / 2.78 (2.6) | 1.21 / 1.83 (1.5) | 0.42 / 2.01 (4.8) |
| Rain | 0.41 / 1.57 (3.8) | 0.70 / 3.48 (5.0) | 0.49 / 3.06 (6.2) | 0.32 / 1.83 (5.7) |
| Nature | 0.28 / 0.36 (1.3) | 0.41 / 0.67 (1.6) | 0.52 / 0.78 (1.5) | 0.26 / 0.32 (1.2) |
| Liquid | 0.71 / 0.82 (1.2) | 1.51 / 1.86 (1.2) | 1.51 / 1.71 (1.1) | 0.85 / 0.77 (0.9) |

Speed, ms a frame, the higher of the two windows (limit 6 ms). At 1280 px, every code, in the order of the two
tables above:

| Mode | Omega | Love | Tessa | New Year | Halloween | Solarpunk | Cyberpunk | Nihilum | Incertum |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Basic | 1.35 | 2.13 | 1.46 | 3.71 | 4.67 | 4.50 | 1.29 | 0.35 | 0.41 |
| String | 0.95 | 0.72 | 0.82 | 1.77 | 2.39 | 1.27 | 0.83 | 0.92 | 0.62 |
| Emoji | 1.47 | 0.59 | 1.31 | 0.96 | 1.20 | 0.94 | 0.43 | 0.58 | 0.93 |
| Fire | 1.29 | 0.65 | 0.85 | 2.49 | 1.96 | 1.70 | 0.69 | 2.50 | 0.79 |
| Rain | 1.01 | 0.62 | 0.68 | 1.64 | 1.21 | 1.25 | 0.49 | 0.95 | 0.57 |
| Nature | 1.44 | 1.84 | 1.44 | 4.67 | 2.77 | 2.15 | 2.94 | 2.70 | 1.07 |
| Liquid | 0.60 | 0.64 | 1.49 | 1.05 | 1.58 | 0.59 | 0.63 | 0.92 | 0.71 |

At 375 px (viewport 375 x 812, picture 515 x 300 at 2 device pixels), Omega and the two costliest codes at 1280 px
(New Year, Halloween): Basic 0.56 / 1.51 / 0.79, String 0.76 / 1.03 / 0.76, Emoji 0.47 / 0.59 / 0.47, Fire 2.25 /
1.96 / 0.82, Rain 0.58 / 0.37 / 0.38, Nature 1.61 / 1.79 / 1.79, Liquid 0.75 / 1.12 / 0.68. Worst case 2.25 ms
(Fire, Omega). Phone speed is no problem. At 1280 px the worst are 4.67 ms (Basic under Halloween, Nature under
New Year), 78 % of the limit; the three Basic codes with three glyphs (New Year, Halloween, Solarpunk) cost 3.7 to
4.7 ms against 0.35 to 1.5 for the others.

Song 2, "Decensus Ad Nihilum", Omega (quiet 8 to 11 s, `drive` 0.00; loud 70 to 73 s, `drive` 1.00; this song sits
at `drive` 1.00 from 54 s to 200 s apart from a dip near 100 s, so the loud window is the song's usual state):

| Mode | Quiet | Loud | Ratio | ms |
| --- | --- | --- | --- | --- |
| Basic | 1.11 | 10.30 | 9.3 | 0.45 |
| String | 4.34 | 12.18 | 2.8 | 0.80 |
| Emoji | 3.08 | 21.86 | 7.1 | 0.84 |
| Fire | 0.06 | 3.05 | 50.8 | 3.42 |
| Rain | 0.44 | 5.08 | 11.5 | 1.24 |
| Nature | 0.67 | 1.15 | 1.7 | 2.58 |
| Liquid | 1.06 | 2.57 | 2.4 | 1.08 |

What this shows: on this song Basic is fine (1.11 against 10.30; the old note, 5.13 against 8.95, used other
windows), and Emoji is 3.08 quiet against 12.42 on song 1. The two quiet windows differ in what the music does:
song 1's quiet seconds still carry a soft tune (`drive` 0.00 to 0.01, spectrum alive), song 2's are nearly
silent. So Emoji follows the shape of the spectrum, not how loud it is. That is the Emoji fault below.

Burnt-out white (`Probe.white`, loud, worst frame of 3 s, share of the picture): Fire 0 to 4.8 % under every code
(Omega 4.8, Nihilum 3.6, Tessa 3.1, Solarpunk 1.9, Halloween 1.0), under the 10 % limit. Liquid, Basic, Rain, Nature
and String are 0 under every dark code. Emoji is 12.1 (Tessa), 15.7 (Halloween), 1.4 (New Year, Cyberpunk): these
are white skulls and ghosts, not glow. The probe cannot judge Love (up to 27.5 %) and Incertum (up to 84.1 %):
their background is nearly white, so it counts the background. Nothing burnt out was seen by eye.

Looks: 7 screenshots (5 sheets, each putting 3 to 6 canvas copies side by side): Love Emoji, Tessa String and
Omega Liquid, quiet and loud; Solarpunk Basic, Solarpunk Nature, Love Rain; Love, Tessa and Cyberpunk Liquid;
Solarpunk String, Incertum Basic; Halloween Emoji, Tessa Nature, Tessa Fire (loud unless stated).
- Does the code change more than the colours? Basic yes (four layouts: mirror, edges, rise, ring; glyph bars),
  String yes (Jacob's ladder under Tessa, square steps under Cyberpunk, glyph beads), Fire yes (nine forms), Rain
  yes (snow, glyphs, streaks; Tessa adds forked bolts), Nature yes (the Tessa tree is a lightning tree with
  sparks, plainly not the Omega tree). **Emoji: only the five emoji change**; the shape, the motion and the busyness
  are the same under every code. **Liquid: mostly colours**; see its note.
- Readability on the pale codes: Love Liquid, Love Rain, Solarpunk Nature and String read well. Solarpunk Basic
  does not (see Basic). No text over text was seen in these pictures.

### Liquid
- [x] (2026-11-19: quiet 0.02 to 0.15, loud 0.34 to 2.7, ratio 12 to 28 under all 9 codes at 1280 px) Quiet and loud move the same under every code: 1.75 / 1.76 (ratio 1.0) under Omega (1.75 / 2.05 on a
  repeat), 1.66 / 1.58 under New Year, 1.45 / 1.31 under Halloween, 0.85 / 0.77 under Incertum (loud lower than
  quiet), 1.2 to 1.6 under the rest; it is the only mode with no difference at all. On song 2 the ratio is 2.4
  (1.06 / 2.57), so it follows the music a little when the quiet is real silence. Likely causes, read from the
  code and not confirmed by eye: the whirlpool turns at 0.12 rad/s even at `drive` 0 (`spin` in `mode-liquid.js`);
  the edge keeps a quarter of its swing at `drive` 0 (`big = 0.25 + 0.75 * drive`); the edge bars come from the
  spectrum's shape (`Aud.bars`), which stays tall in a soft passage. Fixed when the quiet window changes a third or
  less of the loud one (ratio 3 or more) under Omega, Tessa and Cyberpunk, with the loud number not lower than
  now (1.76, 3.46, 1.86).
- [x] (2026-11-19: tessa lightning, newyear tick ring, halloween slime strands, love heart, solarpunk petals, cyberpunk hexagon, nihilum tilted ring with inward water, incertum orbiting second drop; Omega is the plain drop) Codes change mostly the colours. Five of nine codes use kind `ink` (Omega, New Year, Love, Solarpunk,
  Incertum). In the pictures of Love, Tessa and Cyberpunk the drop has the same outline with the same two horns,
  the same rings and whirlpool; only the colours and the centre mark differ (plasma adds jitter, mercury adds
  steps, slime adds drips, all small). Fixed when each of the nine codes has one thing in its picture that a
  grey-scale copy would still show (an outline, a second drop, a different whirlpool or a different kind of
  droplet), not only a colour or the centre mark.
- Liquid: checked 2026-11-19, 1280 px, "Want Some Fun", quiet / loud (ratio), baseline measured the same day before the change: Omega 1.28 / 1.30 (1.0) -> 0.05 / 1.32 (26), Tessa 1.15 / 1.39 (1.2) -> 0.07 / 1.93 (28), Cyberpunk 1.08 / 1.18 (1.1) -> 0.15 / 2.70 (18), Incertum 0.62 / 0.56 (0.9) -> 0.07 / 1.21 (17); after only: New Year 0.11 / 2.39, Halloween 0.08 / 0.95 (12), Love 0.02 / 0.34, Solarpunk 0.03 / 0.51, Nihilum 0.05 / 1.22. Cause: the boom (`swell`) followed every soft kick even at `drive` 0; it is now scaled by `drive`, and whirlpool, specks, slow edge waves, rainbow hue and the edge's swing are tied to `drive` too. Speed 0.58 to 1.03 ms at 1280 px, 0.51 to 0.60 at 375 px. The loud numbers of the review (1.76, 3.46, 1.86) were not reproduced by the baseline (1.30, 1.39, 1.18); the new loud numbers are above both.

### Emoji
- [x] (2026-11-19: quiet 0.3 to 2.0, ratio 7 to 35 under all nine codes, "line" layout, 1280 px) Quiet is busier than any other mode's loud, under every code: quiet / loud 11.12 / 15.39 (Nihilum) up to
  23.06 / 26.99 (Love); Omega 12.42 / 18.05; ratio 1.2 to 1.5 everywhere. On song 2 (nearly silent start) the
  same mode reads 3.08 / 21.86 (7.1), so it follows the spectrum's shape, not the loudness. In the "line" layout
  (`mode-emoji.js`, the `cfg.shape === 'line'` branch) the column height `v * maxHeight`, the size `12 + v * 46`
  and the choice of glyph `set[floor(v * set.length)]` all come from the spectrum `v` alone: scale `v` by
  `0.15 + 0.85 * drive`, and keep each column's glyph fixed (or change it only with hysteresis), since a glyph
  that changes by threshold swaps a whole emoji between two frames (not confirmed by eye). The "circle" and
  "heart" layouts use the same `v2`: do the same. Fixed when quiet is under 4 under every one of the nine codes
  and the ratio is 3 or more on "Want Some Fun" in the "line" layout.
- [x] (2026-11-19: Tessa crackles in 14 Hz steps, Halloween's emoji flap and the kick sends a flock up and some bats drift up the picture, Cyberpunk snaps heights and sizes to a grid and throws along the four axes, Nihilum's kick ring forms at the edge and falls inward) The codes change only the five emoji. Fixed when at least Tessa, Halloween, Cyberpunk and Nihilum also change
  a form or a motion (for instance Tessa's emoji crackle in steps, Cyberpunk's fall in a grid, Halloween's float up
  like bats, Nihilum's drift inward), as String does.
- [x] (2026-11-19: every emoji in the line, circle and heart layouts is placed by a clamp that keeps its centre half its size from the edge; seen in a loud Halloween sheet) Under Halloween, loud, the big skulls and pumpkins in the top and bottom rows are cut by the picture's edge
  (seen in the picture),. Fixed when the glyph's centre stays at least half its size
  from the edge.
- Emoji: checked 2026-11-19, 1280 px, "Want Some Fun", "line" layout, quiet / loud (ratio), baseline measured the same day before the change: Omega 9.30 / 12.43 (1.3) -> 1.23 / 11.80 (9.6), Halloween 17.54 / 21.82 (1.2) -> 1.97 / 23.21 (12), Tessa 12.37 / 16.11 (1.3) -> 1.09 / 21.88 (20), Cyberpunk 13.19 / 17.05 (1.3) -> 0.38 / 7.25 (19); after only: New Year 1.09 / 15.87, Love 0.89 / 22.49, Solarpunk 0.94 / 14.60, Nihilum 0.30 / 10.56, Incertum 0.93 / 21.73. Cause: every column's height, size and glyph came from the spectrum's shape alone; they are now smoothed per column, scaled by `0.1 + 0.9 * min(1, drive * 2.2)`, and a glyph changes only after its value passes the next step with a margin. Cyberpunk's loud number fell (17.05 to 7.25: steps and no tilt) and is the one to look at by eye. Speed 0.66 to 0.81 ms at 1280 px, 0.36 to 0.44 at 375 px. A first Tessa run read quiet 14.6 / 9.3 with `drive` 0.37 / 0.21: the hidden pane had throttled frames, so `drive` had not settled; the repeat read 1.09.

### String
- [x] (2026-11-19: quiet 0.05 to 1.31, loud 2.6 to 10.8, ratio 8 to 172 under all nine codes, 1280 px) Moves a lot when quiet, under every code: quiet / loud 6.69 / 10.17 (Omega), 6.22 / 10.09 (New Year), 5.35 /
  9.32 (Cyberpunk), 4.91 / 8.32, 4.85 / 7.95, 4.64 / 7.52, 3.78 / 5.85 (Love), 2.99 / 5.68 (Nihilum); the ratio is
  1.5 to 1.9 for all of them, 2.8 on song 2. The doc says calm music gives nearly straight strings; the numbers
  say the picture still changes a lot. Read from `mode-strings.js`, not seen by eye: each string's wave is divided
  by its own recent peak (`norm = 1 / peaks[li]`), so a soft passage is drawn at full shape, and the strings
  never drop below `big = 0.35` of their swing. Tie the wave to `drive`, not only to the peak. Fixed when the
  ratio is 3 or more under Omega, Love, New Year, Cyberpunk and Nihilum.
- [x] (2026-11-19: Tessa 0.05 / 2.62, ratio 52) Under Tessa (the Jacob's ladder) the quiet window is the livelier one: 2.41 quiet against 2.04 loud (ratio
  0.8). Fixed when the ladder's arcs (`drawLadder`) come more often and climb faster with `drive`: ratio 3 or
  more with the loud number at least 2.04.
- String: checked 2026-11-19, 1280 px, "Want Some Fun", quiet / loud (ratio), baseline measured the same day before the change: Omega 6.49 / 10.53 (1.6) -> 1.07 / 9.38 (8.8), Tessa 1.33 / 1.73 (1.3) -> 0.05 / 2.62 (52), Cyberpunk 5.78 / 10.29 (1.8) -> 0.06 / 10.32 (172), Nihilum 2.56 / 5.14 (2.0) -> 0.41 / 4.94 (12); after only: Love 0.77 / 6.35 (8.2), New Year 1.31 / 10.80 (8.2), Halloween 1.04 / 8.71 (8.4), Solarpunk 0.91 / 8.67 (9.5), Incertum 0.94 / 8.48 (9.0). Cause: the swing floor (`big = 0.35`) plus each string drawn at full shape by its own peak, and the ladder's climb speed, jitter and thickness not tied to `drive`; now `big = 0.06 + 0.94 * min(1, drive * 2.2)`, the strings' own clock, drift, line weight, beads and the ladder's speed follow it. Loud numbers are within run-to-run noise of the baseline (Omega 10.53 to 9.38, Love not measured before). Speed 0.38 to 0.85 ms at 1280 px, 0.38 to 0.68 at 375 px. Cyberpunk's quiet strings are fully still (square steps swallow small swings).

### Basic
- [x] (2026-11-19: ratio 2.6 to 5.3 under eight codes, Incertum 3.6, 1280 px) Ratio under the quiet codes: Incertum 2.38 / 2.82 (1.2), Nihilum 0.93 / 1.43 (1.5), Cyberpunk 1.26 / 1.89
  (1.5), Solarpunk 1.9, Tessa and New Year 2.0, Omega 2.3 (1.1 against 10.3 on song 2, ratio 9.3), Love 2.2.
  Some motion in a quiet verse is right, since bars follow the spectrum, but the rainbow code is nearly as busy
  quiet as loud (the hue probably keeps cycling). Fixed when Incertum's ratio is 2 or more. Low priority.
- [x] (2026-11-19: stems in the bar colour #2F7D4A, contrast 4.2 to 4.9 against the cream, glyphs at 88 to 100 % instead of 55 to 100 %; the wavy line is the waveform, setting "Waveform line", now named in the mode's header and kept; seen once, loud) Solarpunk Basic is hard to read (picture): the flower glyph stems are thin, small and pale green on cream,
  and a faint grey wavy line crosses the top of the picture over the tallest bars (also seen under Incertum). If the
  line is meant (a waveform or peak line), keep it; otherwise remove it. Fixed when the glyph colour has a contrast of
  at least 3 to 1 against the cream background and the line is either gone or named in the mode's doc.
- [x] (2026-11-19: it is the song: at 30 s the left bars read 0.3 to 0.4 on "Want Some Fun", Kirara Magic and STVCKS, flat only where a song has no low sound, as "Want Some Fun" at 58 s and Nightcore at 30 s; no change) In both Basic pictures with "Want Some Fun" the left 27 % of the width stays flat at the floor (seen under
  Solarpunk and Incertum). It may be the song (little low sound), not a fault. Check the left edge on song 2 under Omega and on one more
  song: fixed when the bars at the left carry sound, or the lowest band starts where the sound does.
- [x] (2026-11-19: 2.0 to 2.5 ms at 1280 px, 0.27 to 0.62 at 375 px, other agents may have been running; a run 10 minutes earlier read up to 3.0) Cost: three-glyph codes (New Year 3.71, Halloween 4.67, Solarpunk 4.50 ms at 1280 px) against 0.35 to 1.5 for
  the solid codes; 78 % of the 6 ms limit. At 375 px it is 0.79 to 1.51. Fixed when none is above 3 ms at 1280 px
  on a measurement with nothing else running (one sample each so far; other agents were running).
- [x] (2026-11-19) Old note, song 2: now measured, 1.11 / 10.30 under Omega (ratio 9.3); closed.

- Basic: checked 2026-11-19, 1280 px, "Want Some Fun", quiet / loud (ratio), baseline measured the same day before the change: Incertum 1.95 / 4.23 (2.2) -> 1.10 / 3.96 (3.6), Nihilum 0.43 / 1.10 (2.6) -> 0.24 / 0.95 (4.0), Cyberpunk 1.38 / 3.17 (2.3) -> 0.70 / 1.93 (2.8), Omega 3.49 / 7.58 (2.2) -> 1.38 / 7.36 (5.3), Solarpunk 0.93 / 2.29 (2.5) -> 0.66 / 2.28 (3.5), Love 0.67 / 1.32 (2.0) -> 0.47 / 1.40 (3.0), Tessa 0.75 / 1.70 (2.3) -> 0.57 / 1.46 (2.6), New Year 0.80 / 2.14 (2.7) -> 0.54 / 1.72 (3.2); Halloween 1.06 / 3.20 (3.0) before, not measured after. Changes: a quiet passage is scaled to 60 % height and the bars follow the spectrum slowly (`loud = min(1, drive * 2.2)`; attack 22 to 70, release 40 to 100 %); light looks with glyphs get a stem and fuller glyph strength; glyph bars of a fixed pattern are built once per (bar, rows) as one small canvas and glyphs are pre-scaled to the cell (glyph codes 3.7 to 4.7 before, 2.0 to 2.5 ms now; Cyberpunk's flickering 1 / 0 bars cannot be cached and read 2.2). Loud numbers are within noise of the baseline except Cyberpunk (3.17 to 1.93, one run each). Hidden-pane note: a quiet window read `drive` 0.5 when the run did not come straight after a loud window (the level control had adapted); the numbers above all have `drive` 0.01 to 0.02 quiet. Seen by eye once (Solarpunk, loud): the stems and fuller glyphs read clearly.

### Fire
- [x] (2026-11-19: quiet 0.04 to 0.66, ratio 5.5 to 44 under all nine codes, 1280 px) Quiet is not quiet under Tessa (plasma globe) 1.17 / 1.69 (ratio 1.4), Nihilum (vortex) 1.21 / 1.83 (1.5)
  and Solarpunk (sun) 0.91 / 1.57 (1.7), against 0.06 / 3.05 on song 2 under Omega and 0.11 / 1.27 under Love.
  Their quiet floor is about 1, ten times Love's. Likely a form that turns or pulses at a fixed speed. Fixed when
  the ratio is 3 or more under all nine codes (Cyberpunk, now 2.6, included).

- Fire: checked 2026-11-19, 1280 px, "Want Some Fun", quiet / loud (ratio), baseline measured the same day before the change: Tessa 1.04 / 1.62 (1.6) -> 0.10 / 1.61 (16), Nihilum 1.22 / 1.91 (1.6) -> 0.27 / 1.95 (7.2), Solarpunk 0.76 / 1.62 (2.1) -> 0.32 / 1.77 (5.5), Omega 1.05 / 2.09 (2.0) -> 0.66 / 3.83 (5.8), Cyberpunk 0.55 / 3.16 (5.7) -> 0.29 / 2.90 (10), Love 0.21 / 1.68 (8.0) -> 0.04 / 1.77 (44); after only: New Year 0.16 / 3.07, Halloween 0.11 / 1.37, Incertum 0.12 / 1.86 (ratio 12 to 19). Cause: the plasma threads' wander, jitter and widths, the vortex's turn, the flames' sideways wave and sway, the spectrum's part in each flame's height, beat sparks and the ember count ran at a fixed or spectrum-only rate even at `drive` 0; they are now scaled by `calm = 0.1 + 0.9 * min(1, drive * 2.2)` (the vortex turns at 0.025 rad/s quiet, 0.25 loud). Loud numbers are within run-to-run noise (Omega 2.09 to 3.83 came with `drive` 0.66 against 0.5). Speed 0.36 to 2.34 ms at 1280 px (Nihilum highest), 0.37 to 1.74 at 375 px. Not looked at by eye.

### Rain
- Fine under every code: quiet 0.26 to 1.06, ratio 3.1 to 9.1 (Love is the lowest at 3.1, 0.80 loud), no burnt-out
  white. Note only: under Love, a thin tan bolt line is drawn over the hearts in the picture. Check that a bolt in a
  heart rain is meant.

### Nature
- [x] (2026-11-19: 10 s windows, Solarpunk 0.19 / 0.79 (4.2), Incertum 0.21 / 0.74 (3.5), Omega 0.39 / 0.99 (2.5); was 0.9 / 0.9) Loud is nearly as still as quiet under the pale codes: Solarpunk 0.28 / 0.36 (ratio 1.3) and Incertum 0.26 /
  0.32 (1.2), Love 0.30 / 0.40 (1.3); Cyberpunk 0.41 / 0.67, Nihilum 0.52 / 0.78. Under Tessa it is 0.87 / 2.15
  (2.5), clearly more than Omega's 0.17 / 0.63 (3.7), because the sparks fly. At 375 px under Omega the quiet
  window was the busier one (1.71 / 0.99). The old note stands: a 3 s window is short for Nature (about 10 s to
  grow or die back), so first measure with 10 s windows. Fixed when, in 10 s windows, loud changes at least 3 times
  what quiet does under Solarpunk and Incertum, and the loud number is not below 0.6.
- [x] (2026-11-19: 0.99 to 1.87 ms at 1280 px after, 0.91 to 2.58 before, measured the same day; the review's 4.67 was not reproduced, probably a busy machine) Nature costs 4.67 ms under New Year and 2.7 to 2.9 under Halloween, Cyberpunk and Nihilum, against 1.0 to 1.8
  under the rest (375 px: 1.6 to 1.8). Fixed when none is above 3 ms at 1280 px on a quiet machine.

- Nature: checked 2026-11-19, 1280 px, "Want Some Fun", 10 s windows (quiet 1 to 11 s from a fresh start with loud seconds played just before, loud 58 to 68 s), quiet / loud (ratio), baseline the same day before the change: Solarpunk 0.39 / 0.34 (0.9) -> 0.24 / 0.61 (2.5), Incertum 0.25 / 0.23 (0.9) -> 0.28 / 0.49 (1.7), Omega 0.39 / 0.54 (1.4) -> 0.45 / 1.09 (2.4); after only: Love 0.29 / 0.57 (2.0), Nihilum 0.42 / 1.09 (2.6). The song has only 11 quiet seconds, so no 10 s window is purely quiet at its start. Changes: wind is `0.08 + 1.5 * drive` (was `0.3 + drive`); from a drive of 0.15 to 0.5 (`swing` 0 to 1) the branches rock, the leaves flutter and swell on each kick, and about five leaves a second let go; leaves are drawn without a save / rotate / restore each. Speed 0.99 to 1.87 ms at 1280 px (before 0.91 to 2.58), no errors. Second pass, same day: what moved in a quiet window was mostly the leaves' turnover (leafMax 0 cut quiet from 0.20 to 0.08), not the die-back. Now `pace = 0.25 + 0.75 * min(1, drive * 2.2)` scales growth, die-back, leaf ageing and leaf spawning; dusk comes slower (release 0.04 instead of 0.1); in a loud passage swing is larger (depth coefficient 0.065), leaves swell 80 % on a kick and about nine a second let go. Before / after of this pass (quiet / loud, loud is noisy from 0.49 to 1.02 between runs): Solarpunk 0.24 / 0.61 -> 0.19 / 0.79, Incertum 0.28 / 0.49 -> 0.21 / 0.74, Omega 0.45 / 1.09 -> 0.39 / 0.99. Speed 0.98 to 1.46 ms at 1280 px, 0.96 to 1.46 at 375 px. Seen once (Solarpunk, loud): the tree is intact. Omega's ratio (2.5) is below 3 but was not in the note.

### Clock
Clock: left to items 24 and 25.

### Not done in this review (still to do)
- The Clock (items 24 and 25).
- Nature with 10 s windows (see Nature).
- Quiet pictures were looked at only for Love Emoji, Tessa String and Omega Liquid; most of the looks were taken
  loud. Fire, Rain and Nature under most codes, and every code under Emoji and String, were judged on numbers.
- Phone fullscreen held sideways (812 x 375): not done. Speed was measured at 375 px upright only.
- Songs: only songs 1 and 2, and song 2 only under Omega. The other three songs were not used.
- The white probe cannot tell a pale background from burn-out under Love and Incertum; a probe that ignores the
  background colour is still to be made.
