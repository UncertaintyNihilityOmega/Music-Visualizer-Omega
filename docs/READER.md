# Reader pass, phone width (375 px), 2026-11-19

Method: a fresh tab at 375 x 812 (touch, coarse pointer), the test songs loaded, saving to localStorage blocked.
No console errors appeared at any point. Nothing locked up. Every mode drew something, and all four games started
and could be played by tapping.

## Blocking

None found.

## Confusing

- **Music page, first screen.** The page tabs (Music, Games, Settings, Guide) start at about y = 816, just below
  the first screen. The first screen shows only the picture, the mode buttons and the player. The caption says
  "add some music below", but nothing to add music with is visible. A new user must guess that the page scrolls.
  Expected: a hint, or the tabs and the add buttons in view.
- **Settings page.** The picture and the settings are far apart. To see what a slider does, the user must scroll to
  the top and back again. Expected: some way to see the picture while changing a setting.
- **Games page.** Tapping a game here shows the controls (Normal/Hard, Play / Pause, Speed) but the board is
  above, off screen. The page scrolled by itself and settled in the middle, so neither the board nor all the
  controls were fully in view. The four game buttons are also repeated on this page with no short description of
  each game. Expected: a line or two on what each game is, and the board in view while playing.
- **Hints written for a keyboard.** Undarum says "WASD to move", Artificium says "WASD moves the selector, Enter
  upgrades", and every game says "P pauses". On a phone the real controls are different (hold or drag on the
  picture to steer Undarum; tap a cell in Artificium; tap a path or card in the Dungeon). The start overlay never
  says so. The Guide "Keys" table is also keyboard only.
- **Undarum upgrade screen.** In the "Choose an upgrade" cards the text of the middle card (Sweeping Laser) runs
  past the bottom of the card, and "Evolves at 15" is cut off. The title line "tap it, or press 1 / 2 / 3" runs
  under the fullscreen button.
- **Piano mode and sound.** The Guide says Piano plays piano notes instead of the song. On the phone the song
  kept playing (audio was not muted), so it is unclear which one to expect. The Guide is the only place this is
  explained, and a new user will not have read it.
- **Settings names.** "Auto level matching", "Loud / quiet difference", "Contrast curve", "Rise speed",
  "Hit threshold (kick / snare / hat)", "FFT smoothing" have no help text. A beginner cannot tell what to change.
  The "Code / Type a word... / Enter" box says only "Some words change how the whole app looks", with no example.
- **Destructive buttons without a warning.** "Reset everything" (Settings) sits right next to Export and Import
  and resets at once, with no "are you sure". In Solarium, the "Clear" button (tiny, right under "Fit") wipes the
  art at once, and "Export" downloads a file at once. Fit and Clear are neighbours about 20 px tall.
- **Solarium.** The colour swatches are about 19 px wide, and Export, Fit and Clear about 20 px tall. They are
  far too small to tap reliably. The top line ("Gravity: sky, Next swatch in 59s, Zoom 0.48x, 32 x 15") is
  jargon, and nothing says what to do (tap to place a block?).
- **Guide.** It explains the sound analysis in detail (FFT, bands, thresholds) but not what the app is for: no
  "how to add songs", no list of the 11 modes or the 4 games, no phone controls.

## Small

- Mode and game buttons: a stray thin vertical line appears before "Ice" and after "Artificium". It looks like a
  divider left over from wrapping.
- The fullscreen button covers the top-right corner of every picture: the health bars in Undarum, a torch in the
  Dungeon, and the end of the upgrade title.
- HUD text over the picture is small and low contrast, especially in Artificium (grey "Wave 1 / Normal – WASD..."
  over a dark board) and on the Dungeon start overlay ("A Goblin Scout appears!", "incoming x 5").
- Dungeon of Echoes: the enemy name ("Goblin Scout") is clipped at the top edge of the picture. The two cards
  swap places after one is used, which makes a quick second tap easy to get wrong.
- Artificium: the board seems cropped on the right and bottom (the path runs off the right edge) at this width.
- Start overlays ("Undarum", "Artificium", "Dungeon of Echoes") are drawn on top of the art, so the title and
  the monsters overlap.
- Piano mode: the "C# minor" label touches the first note dots.
- Music page: the folder and remove buttons on each song row measure 36 x 36 px, and the "Keep a copy" checkbox
  24 x 24 px, although the stated aim for touch screens is 40 px.
- The Shuffle button shows its state only by colour; it has no accessible "pressed" state.
- Song titles differ between the list and the caption (double space in "STVCKS  Castion" in the list).

Not tested: fullscreen and sideways (landscape) mode, the microphone, "Add files" and "Open a music folder" (they
need the real file picker), URL adding, the "Keep a copy" switch, installing the app, Export and Import, a real
touch device or a real iPhone, Undarum's Hard and Insane levels, dying or winning in any game, Solarium
placing blocks, and the Settings groups for modes other than a quick read of Fire, Performance and Mini-games.
