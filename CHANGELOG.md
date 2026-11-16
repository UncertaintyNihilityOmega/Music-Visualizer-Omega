# Changelog

What someone using the app would notice. Newest first.

## 0.1.0-dev (in progress; becomes v0.1.0 when ROADMAP item 12 is done)

### New
- **Rain, Nature and Clock follow the theme codes.** Rain: violet night rain (Omega), snow (New Year), bats and
  leaves (Halloween), falling hearts (Love), a sun shower (Solarpunk), falling 1s and 0s (Cyberpunk), rain that
  rises (Decensus Ad Nihilum), rainbow rain (Ascensus Ad Incertum). Nature: a glowing violet tree (Omega), a
  cherry tree that sheds petals (Love), a frosted tree in the snow, a dead tree with orange leaves, a neon tree
  drawn with a ruler, an ember tree, a rainbow tree. Clock: five new skins. Each mode has a "Follow theme" switch.
- **Fire, Nature, Clock and Rain start in the Omega look** (violet and pink on a dark sky), because Omega is the
  default theme.
- **The mode buttons are in two groups**: modes that change with the codes on the left of a line, the others on
  the right. Games: Undarum (was Survivor) and Artificium (was Defense) first, then a line, then the mini-games
  Dungeon of Echoes (was Cards) and Solarium (was Sandbox).
- **Install the app.** Music > "Install the app" puts it on the home screen or desktop like any other app. Once
  opened one time it works with no network. A new version arrives on its own: it shows after one reload.
- **Plays in the background.** The lock screen and the notification show the song with play, pause, next and
  previous; headphone buttons work. On iPhone and iPad the song moves to a plain player while the app is hidden.
- The app is now **Music Visualiser Omega**, with a dark purple look. The old look is still there: Settings >
  Code > "Love".
- **Codes.** Type a word in Settings > Code to change the whole look and how Basic mode draws: New Year,
  Halloween, Love, Solarpunk, Cyberpunk (bars made of 1s and 0s), Decensus Ad Nihilum (a black hole), Ascensus
  ad Incertum (white and rainbow). Found codes stay as one-tap buttons.
- **Microphone mode.** Music > Microphone: the visuals follow whatever the device hears. Nothing is recorded.
- **Open a music folder.** On Chrome and Edge on a computer the app reads a folder where it is and remembers it
  for next time. Nothing is uploaded or copied. Video files (mp4, webm) can be played for their sound.
- **Pages.** Music, Games, Settings and Guide are tabs under the player; the visualiser stays on screen.
- **Guide page**: how sound becomes a picture in seven steps, live meters of what the engine hears, and the keys.
- **Basic mode** has four layouts (mirror, rise, edges, ring), three ranges (full, bass, voice), rounded peaks and
  a reflection.
- Games page explains exactly what Normal, Hard and Insane change.
- **Calm when the music is calm, lively when it is loud.** Every mode now knows how big the current part of the
  song is. A verse is a drizzle, a small fire, straight strings; a chorus is a downpour, a tall fire, wide swings.
- **Each drum has a job.** Kick drum: emoji rings, puddle rings, fish scatter, the clock's second hand jumps.
  Snare: lightning, a plucked string, a crack in the ice, falling leaves. Hi-hat: sparkles, embers, glints,
  bubbles, fireflies.
- **Picture punch.** The whole picture zooms a little on a kick, shakes on a strong beat and brightens on a
  snare, and holds still in calm passages. Settings > Performance & feel > "Picture punch" turns it down or off. It is gentler
  when the device asks for reduced motion.
- **String** was rebuilt: each string is its own slice of the sound, low to high. It follows the theme codes
  (square steps for Cyberpunk, rings round a dark disc for Decensus Ad Nihilum).
- **Emoji** and **Clock** follow the theme codes too (each code has its own emoji set and clock skin).
- **Fire** has a different form for every theme code, not only a colour: fireworks for New Year, a witch's
  cauldron for Halloween, a row of candles with rising hearts for Love, a rising sun for Solarpunk, pixel
  flames for Cyberpunk, a vortex falling into a dark disc for Decensus Ad Nihilum, an aurora for Ascensus ad
  Incertum. Any of them can be picked by hand.
- **Layout bar.** The Settings page starts with a bar of the current mode's layouts (Basic, Emoji, Clock and
  Fire have one), like the page tabs. One tap changes the layout.
- Fire no longer burns out to a white block in loud passages.
- **Basic**: a "dots" layout on a curved line, peak caps that leave a trail, bars that brighten when loud, and
  the theme's mark in the middle of the ring.
- **Piano**: notes coloured by octave, a "melody only" switch, and the chord name in the corner.
- **Nature**: night with stars when the music is calm, day when it is loud; wind; fireflies.
- **Ice**: frost creeps in while the music is calm and shatters on the first hard hit.
- **Aquatic**: the water surface follows the bass; fish swim as a school when calm.
- With nothing playing, the modes follow a silent "ghost song" with a calm part, a build and a full part, so
  every mode can be seen working before a song is added.
- A new app icon ("Bold Layers").

### Fixed
- **Piano mode works.** It never showed a note before: the detailed spectrum it needs was never being read.
- **Loud songs no longer pin everything at the top.** The sound analysis clipped anything louder than -30 dB,
  which is most of a modern song's bass. Bars now have room to move and beats are found in loud passages.
- **Quiet parts look quiet.** The level matching now remembers 14 seconds instead of about 5, so a verse and a
  chorus look different.
- **Volume and mute no longer shrink the visuals.**
- The app no longer needs the internet for its fonts.
- **A web address that blocks reading now plays.** Some sites let a song play but do not let the app read its
  sound. Such a song used to "play" in silence over a black picture. It is now heard, the picture shows the idle
  preview, and a note says why.
- Importing a settings file from an older version no longer brings back old sound numbers that would silence
  the visuals: outdated groups are skipped.
- Shuffle and repeat are drawn icons that take the theme's colours (they were colour emoji that ignored it).
- A saved theme code no longer flashes the default purple for a moment when the page opens.

### Changed
- The settings icon on the picture is gone; the Settings tab (or the S key) does the same.
- Saved String, Fire and Clock settings are reset once (String was rebuilt; Fire's blue and Clock's style work
  differently now).
- Saved "Audio response" and "Basic" settings from older versions are reset once, because their numbers mean
  something different now. Everything else is kept.
- Exported files are named `music-visualiser-omega-…`. Old exports still import.
