# Changelog

What someone using the app would notice. Newest first.

## 0.1.0-dev (in progress; becomes v0.1.0 when ROADMAP item 12 is done)

### New
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

### Fixed
- **Piano mode works.** It never showed a note before: the detailed spectrum it needs was never being read.
- **Loud songs no longer pin everything at the top.** The sound analysis clipped anything louder than -30 dB,
  which is most of a modern song's bass. Bars now have room to move and beats are found in loud passages.
- **Quiet parts look quiet.** The level matching now remembers 14 seconds instead of about 5, so a verse and a
  chorus look different.
- **Volume and mute no longer shrink the visuals.**
- The app no longer needs the internet for its fonts.

### Changed
- Saved "Audio response" and "Basic" settings from older versions are reset once, because their numbers mean
  something different now. Everything else is kept.
- Exported files are named `music-visualiser-omega-…`. Old exports still import.
