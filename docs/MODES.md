# Modes: what each one listens to, and what would make it better

One section per mode. "Listens to" is read from the code. "Ideas" come from docs/RESEARCH.md; each is small
enough for one session and belongs to a ROADMAP.md item until it is built. Sources available since engine v2:
`kick`, `snare`, `hat`, `onset`, `energy`, `drive`, the one-frame events `kickHit` / `snareHit` / `hatHit`, and
`Aud.bars()`.

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
- Ideas left: with the song map (ROADMAP 6), read the song ahead and let notes **fall onto** the keys before
  they sound (ROADMAP 8, P5).

## Clock
- Listens to: `level`, `punch`, `beat` (pulses, gear speed), `kick` (second hand), `drive` (rings of light).
- Built: the second hand jumps on a kick and settles back; rings of light leave the clock when the music
  swells; the four skins follow the theme code ("theme" is the default style).
- Ideas left: tick exactly on the beat once a tempo is known (needs the song map, ROADMAP 6).

## Games (Undarum, Artificium, Dungeon of Echoes, Solarium; once Survivor, Defense, Cards, Sandbox)
- Listen to: `level` (enemy health and speed), the spectrum (background), `punch`.
- Ideas: waves and bosses placed by the song map instead of a timer (the first step toward the v1.x game);
  `kick` gives every tower or spell a small damage pulse; Sandbox's square visualiser offered as a Basic layout.

## Review
- [ ] Emoji: a quiet passage still changes 13 to 19 a frame (the table above), more than any other mode's loud
  passage bar String. In the "line" layout, scale the column wobble and the size swing by `drive` so a calm
  passage holds nearly still.
- [ ] Basic, song 2: quiet reads 5.13 against 8.95 loud. Check by eye whether that verse looks calm enough.

The review after P4 (ROADMAP item 8) is still to do, by a session that did not write the modes.
