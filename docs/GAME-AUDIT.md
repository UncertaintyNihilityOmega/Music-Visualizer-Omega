# Game audit: the old requirements, one by one

Every requirement from the earlier game prompt, with where it is in the code. **"In code"** means the feature was
found by reading; it has **not** been play-tested in this audit. ROADMAP item 9 plays each row and changes its
state to "confirmed <date>" or "fixed <date>": item 30 (Artificium, v0.6.0), item 31 (Undarum, v0.7.0),
item 9 (the mini-games, v0.8.0).

Files: TD = `js/games/game-tower-defense.js`, SV = `js/games/game-survivor.js`, CD = `js/games/game-cards.js`,
SH = `js/games/games-shared.js`, HO = `js/games/games-host.js`, SB = `js/tools/tool-sandbox.js`.

## Artificium (was "Defense")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| D1 | Explain what difficulty changes and by how much | **done 2026-11-16** | Games page table, built from `SH DIFFS` |
| D2 | Setting: towers target Most Forward or Highest HP (never "closest") | **confirmed 2026-11-19** | `SH` setting `targeting: forward / hp`; two enemies in range: the further one is shot on "forward", the stronger on "hp" |
| D3 | Tower range shown as clean white circles | **confirmed 2026-11-19** | TD `tdDraw` "clean white range border": a thin white circle round the selected tower, every tower while positioning (seen at 1280 px) |
| D4 | Losing one game must not count as losing another | **confirmed 2026-11-19** | losing Artificium (lives 0) left Undarum's run as it was |
| D5 | Shock Pylon stuns 1 s, slow, never faster than one hit per 2 s even with buffs | **confirmed 2026-11-19** | with Speed Tech 10 and a 3x fire-rate aura: 2 s between hits (4 hits in 6 s), stun 1.00 s |
| D6 | Resizing the tab must not change tower range or road length (zoom instead) | **fixed 2026-11-19** | the road was laid out in window pixels; now a fixed 640 x 320 board in board units, drawn scaled to fit (`view()`): road 1947 and cannon range 108 at 583, 1200 and 515 px wide; a click lands on the cell under it; `check.js` rule 8e |
| D7 | Shop buttons only buy; no drag outside Positioning mode | **confirmed 2026-11-19** | buying takes no money and places nothing until a cell is chosen; drag only while positioning |
| D8 | Grid selection by click / tap and WASD; white outline, red when blocked | **confirmed 2026-11-19** | a real click selected cell 20,3 (red: by the road); W A S D move the selector |
| D9 | Each tower upgrades on its own | **confirmed 2026-11-19** | of two cannons only the selected one went to level 2 |
| D10 | Panel under the canvas with the selected cell or tower and an Upgrade button; Enter upgrades | **confirmed 2026-11-19** | `#gridInfo` shows "Upgrade 💰35 (Enter)"; Enter raised the level |
| D11 | Positioning mode button; green / red cells; buying enters it; Enter places | **confirmed 2026-11-19** | buying switches positioning on, the button switches it on and off, Enter placed the tower |
| D12 | Trash can sells for value minus 20%; setting "Selling Price" 10 to 100%, default 80 | **confirmed 2026-11-19** | a tower worth 💰90 sold for 💰72 |
| D13 | Tech renamed and capped at 10: Power, Speed, Range (+10% a level), Base Healing (100 s down to 10 s) | **fixed 2026-11-19** | each stops at 10; at 10: damage, fire rate and range exactly x2; a life back every 10 s. Power counted twice before (+124% at 10, now +100%: `dmgStatCoef: 0`) |
| D14 | Tower max level 30, evolution choice of 3 at level 15 | **confirmed 2026-11-19** | three cards at 15, no upgrade past 30 |
| D15 | 27 evolutions (3 for each of 9 towers) with colours and one-line descriptions | **confirmed 2026-11-19** | each played for 3 s at level 15 beside the road with six enemies (`Probe.artificium`): all 27 deal damage, no errors; Frost Beam, Shock Coil and Trickster stun, Earthquake does not; Half-Life halves; split and area kinds hit several |
| D16 | Enemy HP per wave raised to balance | **measured 2026-11-19, your call** | playing itself on Normal (auto-pick on) the game reaches wave 61 with no life lost, 61 towers and 💰13,525 unspent: it looks easy. Raise "Enemy HP per wave/level" (0.085) if you agree |
| D17 | After everything is maxed: +1% damage per level, no more choice screen | **fixed 2026-11-19** | it never happened in Artificium (the shared rule only ran for the card games); now once every tech is at 10 and every tower at 30, each wave adds +1% damage with a "LEVEL BREAK" banner |

## Undarum (was "Survivor")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| S1 | Magic max level 30, evolution at 15, passives max 10 | **confirmed 2026-11-19** | every spell stops at 30, every passive at 10; three evolution cards at 15 (`Probe.undarum`); all 30 evolutions deal damage in 3 s with no errors |
| S2 | Satellite starts with 2 orbs | **confirmed 2026-11-19** | 2 orbs at level 1; the shop text now says so (it said only "+1 orb every 6 levels") |
| S3 | Fire Breath: 3 circles in a row | **confirmed 2026-11-19** | one cast makes 3 circles in a line ahead |
| S4 | Nature Bloom: 4 patches | **confirmed 2026-11-19** | one cast makes 4 patches |
| S5 | Sweeping Laser: one bigger beam through the player, hitting both sides | **confirmed 2026-11-19** | one beam; enemies 100 px ahead and 100 px behind both hurt |
| S6 | Meteor: 2 | **confirmed 2026-11-19** | one cast drops 2 meteors |
| S7 | Boomerang bigger, and its emoji must show | **fixed 2026-11-19** | it flew as a plain cross; now the 🥏 emoji, spinning, size 13 + 0.7 a level (seen) |
| S8 | After all maxed: +1% per level, no choice screen | **confirmed 2026-11-19** | with every item maxed a level-up adds one break (+1%) and shows no cards |
| S9 | Holding or tapping Shift (3x speed) in fullscreen threw the player out of fullscreen; spamming it while running put the player outside the map (user, 2026-11-19) | **fixed 2026-11-19** | 3x speed is now the X key, a switch (Windows opens Filter Keys / Sticky Keys on Shift); it goes off when the window loses focus; the player is held inside after every move, resize and before drawing: 0 frames outside at 3x speed against each edge; `check.js` rule 8f |

## Dungeon of Echoes (was "Cards")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| C1 | Branching endless dungeon, 3 branches visible, each splits in 2 | **confirmed 2026-11-19** | two ways on from where you stand, three tiers seen, every step splits in two (`Probe.dungeon`) |
| C2 | 20 enemies, 5 bosses, boss every N levels (shared setting) | **confirmed 2026-11-19** | 20 enemies, 5 bosses; with "boss every 20" the bosses come on levels 20 and 40 |
| C3 | Turn-based; pick from 4 random cards; start with 2 | **fixed 2026-11-19** | you start with 2 cards; the hand showed every card owned (up to 10), now 4 dealt at random from those owned, again each turn (36 different hands in 40 deals) |
| C4 | 10 magic cards to level 30 with an evolution at 15; 5 passives to level 10 | **confirmed 2026-11-19** | 10 cards to 30 with three evolutions each, 5 passives to 10; all 30 evolutions cast with no errors |
| C5 | After each win: level up and pick 1 of 3 | **confirmed 2026-11-19** | a win raised the dungeon level by one and offered up to 3 rewards |
| C6 | Counts "Dungeon level" | **confirmed 2026-11-19** | the panel under the picture reads "Dungeon level 2" after the first win |
| C7 | Art, background, enemies and cards look as good as possible | **with ROADMAP item 16** | a look, judged by the user: the design pass on the mini-games (item 16) |

## Solarium (was "Sandbox")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| B1 | A square of colour every 30 to 60 s, setting, default 60 | **fixed 2026-11-19** | one swatch after 61 s at the default 60; the setting ran from 10 to 180 s, now 30 to 60, and a value saved before is held inside that |
| B2 | 36 colours + 6 greys, stacks to 64 | **confirmed 2026-11-19** | 36 colours and 6 greys; twelve swatches given onto a full stack leave it at 64 |
| B3 | Drag from inventory to grid; grid cells stay the same size; zoomable; a bigger tab adds cells | **confirmed 2026-11-19** | a pointer drag from a swatch put that colour in the cell under the pointer; cells are 18 units; the wheel zooms; a wider picture added columns (26 to 32) |
| B4 | Export / download | **confirmed 2026-11-19** | Export makes `music-visualiser-omega-pixel-art.png` (caught in the test, nothing downloaded) |
| B5 | Gravity toggle, default off ("sky") | **confirmed 2026-11-19** | off by default; on, a square placed high falls to the bottom of its column |
| B6 | Square audio visualiser in the background | **confirmed 2026-11-19** | 12 x 7 squares behind the grid, bigger and brighter where the spectrum is loud |

## Shared
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| G1 | "Enemy HP per level" also works per wave in Defense, named "Enemy HP per wave/level" | **confirmed 2026-11-19** | `SH hpGrowth`, used by `enemyHP(TD.level, …)`; doubling it raised wave 10 HP from 25 to 37 |
