# Modes: what each one listens to, and what would make it better

One section per mode. "Listens to" is read from the code. "Ideas" come from docs/RESEARCH.md; each is small
enough for one session and is a line in ROADMAP.md (item 8) until it is built. New sources available since
engine v2: `kick`, `snare`, `hat`, `onset`, `energy`, and `Aud.bars()`.

The research gave four ideas that apply to every mode:
- **A. Quiet must look quiet.** Tie the mode's overall scale to `energy`, so a verse is small and a drop is huge.
- **B. One job per sound.** Kick moves the big thing, snare flashes or cracks, hi-hat makes sparkle, level sets size.
- **C. A picture layer.** Zoom, shake and brightness of the whole scene on strong hits, still when calm.
- **D. Mappings, not hard wiring.** Each mode gets "X follows: [source]" selectors like Rain's wind already has.

## Basic
- Listens to: the spectrum (per bar), `punch` (glow), the waveform.
- Done in v0.1.0: layouts mirror / rise / edges / ring, bass-focus and voice ranges, rounded peaks, per-bar
  smoothing, reflection, theme looks (glyph bars, rainbow, black-hole ring).
- Ideas: dotted bars on a curved baseline (the Horror-mix look); picture layer C; a centre logo that pulses with
  `kick` (the Specterr layout); peak caps that leave fading trails; bar colour shifting with loudness.

## String
- Listens to: the waveform (shape), `level` and `punch` (thickness, glow, amplitude).
- Ideas: give each ribbon its own band (ribbon 1 = bass slice of the wave, ribbon 5 = treble) instead of five
  copies of one wave; pluck a ribbon on `snare`; idea A so calm music gives nearly straight strings.

## Emoji
- Listens to: the spectrum (size and which emoji per column), `punch` (pop), `level` (spawn rate).
- Ideas: `kick` throws a ring of emoji outward from the centre or photo; `hat` spawns small sparkles; the photo
  itself pulses and brightens (C); theme codes supply the default emoji set.

## Rain
- Listens to: `trebleTilt` or a chosen source (wind), `beat` (gusts, lightning), `intensity` (wind strength,
  splash size, puddle depth).
- Ideas: drop **count** follows `energy` (drizzle in a verse, downpour in a chorus), which is idea A exactly;
  lightning on a strong `snare` rather than any beat; thunder shake (C); puddle ripples sized by `kick`.

## Fire
- Listens to: `intensity`, `level` (flame height), `high` (sparks), `beat` (bursts), bass (sway).
- Ideas: embers on `hat`; a blue core that appears only when `energy` is high; flame height from the bass-focus
  bars so the fire line is itself a spectrum; heat-haze wobble of the scene on `kick`.

## Ice
- Listens to: `intensity`, `high`, `beat` (cracks).
- Ideas: cracks start on `snare` (a crack is a sharp sound) and grow with `mid`; frost creeps in from the edges
  while `energy` is low and shatters on the first hit of a loud section; glints on `hat`.

## Aquatic
- Listens to: `level`, `mid`, `trebleTilt`, `bass`, `beat`.
- Ideas: bubbles on `hat`; the water surface as a bass-focus spectrum line; fish scatter on `kick`, school again
  in calm sections; light shafts brighten with `energy`.

## Nature
- Listens to: all six bands (growth of different parts), `level`, `intensity`.
- Ideas: leaves fall on `snare`; wind sway from `trebleTilt` like Rain; day/night or season tied to slow
  `energy`; fireflies on `hat` when calm.

## Piano
- Listens to: the fine spectrum (16,384-point), note by note.
- Done in v0.1.0: it works (the fine spectrum was never being read), and notes are picked in real signal strength.
- Ideas: with the song map (ROADMAP 6), read the song ahead and let notes **fall onto** the keys before they
  sound; colour notes by octave; a "melody only" switch that keeps the strongest note per moment; show the
  detected chord name.

## Clock
- Listens to: `level`, `punch`, `beat` (pulses, gear speed).
- Ideas: the second hand ticks on `kick` when a tempo is known (song map); the four skins offered as theme-code
  looks; chimes of light on `energy` rising.

## Mini-games (Defense, Survivor, Cards, Sandbox)
- Listen to: `level` (enemy health and speed), the spectrum (background), `punch`.
- Ideas: waves and bosses placed by the song map instead of a timer (the first step toward the v1.x game);
  `kick` gives every tower or spell a small damage pulse; Sandbox's square visualiser offered as a Basic layout.
