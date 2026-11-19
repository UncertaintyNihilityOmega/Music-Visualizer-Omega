# Changelog

What someone using the app would notice. Newest first. Each finished snapshot gets a short summary here, and
ROADMAP.md "Done" is emptied for the next one.

## 0.2.0-dev (in progress: everyday playing)
- **Tap to pause in fullscreen.** In fullscreen, one tap or click on the picture pauses the song and another
  plays it; a pause or play sign shows in the middle for a moment. In Piano a tap on the keys still plays the
  key. Settings > Performance & feel > "In fullscreen, a tap on the picture pauses and plays" turns it off.
- **The screen stays on while music plays**, like a video: the phone no longer dims and locks in the middle
  of a song (which also threw it out of fullscreen). Paused, the screen goes off as usual. Settings >
  Performance & feel > "Keep the screen on while music plays".
- **One question brings back every remembered song.** Reconnect asks the browser once for all of them. Choose
  "Allow on every visit" in that question (Chrome and Edge) and the app stops asking; an installed app keeps
  the permission by itself.
- **Clock under Ascensus Ad Incertum no longer lags**, and its wings are new: flat, after a drawing, and the
  two sides differ (three stiff blades on the left, nine fluttering plumes on the right).
- **Clock: Gears** are flat gear icons now, eighteen of them, all turning in time.
- **Clock: Sand**, a new design. Sand pours in and fills the picture in about ten minutes; press and drag to
  scoop some up and let go while moving to throw it. When the picture is full it drains away and starts again.

## v0.1.0 (2026-11-19): everything built so far

**In short:** the old "Our Playlist" page became Music Visualiser Omega. It plays songs where they are on the
device (files, folders, web addresses, the microphone), remembers them, and sorts them into folders inside
the app. It installs like an app, works offline and plays in the background, on Android, iPhone and PC. A new
sound engine makes quiet parts look quiet and loud parts move. Eleven modes (eight that change with the nine
theme codes, three with their own art style: Ice, Aquatic, Piano with falling notes), a Clock with five designs,
four games, a Guide page, and drawn icons on every button. The details:

### New
- **Folders inside the app.** Over the playlist: "All songs", your own folders and "+ New folder". The small
  folder button on each song puts it in a folder or takes it out. Open a folder and only its songs play. A
  folder holds no copies: it lists songs, and with "Keep a copy" on they are all there the next time.
- **The app remembers your songs.** Songs added one by one now come back next time like a folder does: one
  tap on "Reconnect" (the browser asks for permission again after the app was closed). The last song and the
  place it stopped come back too, paused.
- **"Keep a copy of added songs inside the app"** (Music page): with it on, every song you add is also kept
  inside the app, on this device only. It is there next time with no question asked, in every browser,
  iPhone too. It takes space; the Music page shows how much, and "delete the copies" removes them. Off
  unless you turn it on.
- **Piano: notes fall onto the keys** and land as you hear them, like a piano tutorial video. To do that,
  Piano mode plays the song about 2 seconds late (the picture hears it first). Pausing freezes the falling
  notes where they are. "Notes fall onto the keys" in Piano's settings switches it off; with the microphone
  the notes rise from the keys as before.
- **Fullscreen on a phone**: the picture fills the whole screen; the mode buttons lie over its lower edge in
  one line you can slide, and fade away after a few seconds (touch to bring them back). A phone held upright
  turns the picture sideways, like a video.
- **Clock redrawn**: a clean dial with slim hands, the sound as a crown of marks round it (small when the
  music is calm, big when it is loud), a ring that fills as the song plays, and three slow orbits. Each code
  gives it a form of its own.
- **Piano: flames at the keys.** A note flashes white where it starts, a held key keeps a small flame going,
  and the whole key lights up in the note's colour. The roll moves a little faster. "Flames from the keys" in
  Piano's settings turns it down or off.
- **iPhone and iPad**: the ring/silent switch no longer mutes the music; the fullscreen button makes the
  picture fill the window on an iPhone (which has no real fullscreen for a page); text boxes no longer zoom the
  page when tapped. Not checked on a device yet.
- **A song on repeat keeps repeating on a phone.** It sometimes stopped at its end while the screen was off.
- **Emoji** takes its background from the theme code too, so it is dark under dark codes.
- **Icons on the buttons.** Every mode, game, code and layout button and the four page tabs (a disc for Music, a
  gamepad for Games, a gear for Settings, a book for Guide) has a small drawn icon in the theme's colours.
- **New mode: Liquid.** A drop of liquid in a whirlpool. Its edge is the sound (bass at the bottom, treble at
  the top); a kick swells it, a snare throws droplets that fall back in, a tap makes a splash. It changes with
  the codes: slime that drips (Halloween), mercury that moves in steps (Cyberpunk), a flickering edge (Tessa),
  rainbow rings (Ascensus Ad Incertum).
- **New code: Tessa.** An electric theme. String becomes a Jacob's ladder (arcs of electricity climbing between
  two rods), Fire a plasma globe (touch it and the threads follow your finger), Nature a tree made of lightning,
  Rain a thunderstorm, Clock throws sparks, Basic is built from lightning marks. Its button stands next to Omega.
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
