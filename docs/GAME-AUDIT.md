| D17 | After everything is maxed: +1% damage per level, no more choice screen | **fixed 2026-11-19** | it never happened in Artificium (the shared rule only ran for the card games); now once every tech is at 10 and every tower at 30, each wave adds +1% damage with a "LEVEL BREAK" banner || D16 | Enemy HP per wave raised to balance | **measured 2026-11-19, your call** | playing itself on Normal (auto-pick on) the game reaches wave 61 with no life lost, 61 towers and 💰13,525 unspent: it looks easy. Raise "Enemy HP per wave/level" (0.085) if you agree || D15 | 27 evolutions (3 for each of 9 towers) with colours and one-line descriptions | **confirmed 2026-11-19** | each played for 3 s at level 15 beside the road with six enemies (`Probe.artificium`): all 27 deal damage, no errors; Frost Beam, Shock Coil and Trickster stun, Earthquake does not; Half-Life halves; split and area kinds hit several || D14 | Tower max level 30, evolution choice of 3 at level 15 | **confirmed 2026-11-19** | three cards at 15, no upgrade past 30 || D13 | Tech renamed and capped at 10: Power, Speed, Range (+10% a level), Base Healing (100 s down to 10 s) | **fixed 2026-11-19** | each stops at 10; at 10: damage, fire rate and range exactly x2; a life back every 10 s. Power counted twice before (+124% at 10, now +100%: `dmgStatCoef: 0`) || D12 | Trash can sells for value minus 20%; setting "Selling Price" 10 to 100%, default 80 | **confirmed 2026-11-19** | a tower worth 💰90 sold for 💰72 || D11 | Positioning mode button; green / red cells; buying enters it; Enter places | **confirmed 2026-11-19** | buying switches positioning on, the button switches it on and off, Enter placed the tower || D10 | Panel under the canvas with the selected cell or tower and an Upgrade button; Enter upgrades | **confirmed 2026-11-19** | `#gridInfo` shows "Upgrade 💰35 (Enter)"; Enter raised the level || D9 | Each tower upgrades on its own | **confirmed 2026-11-19** | of two cannons only the selected one went to level 2 || D8 | Grid selection by click / tap and WASD; white outline, red when blocked | **confirmed 2026-11-19** | a real click selected cell 20,3 (red: by the road); W A S D move the selector || D7 | Shop buttons only buy; no drag outside Positioning mode | **confirmed 2026-11-19** | buying takes no money and places nothing until a cell is chosen; drag only while positioning || D6 | Resizing the tab must not change tower range or road length (zoom instead) | **fixed 2026-11-19** | the road was laid out in window pixels; now a fixed 640 x 320 board in board units, drawn scaled to fit (`view()`): road 1947 and cannon range 108 at 583, 1200 and 515 px wide; a click lands on the cell under it; `check.js` rule 8e || D5 | Shock Pylon stuns 1 s, slow, never faster than one hit per 2 s even with buffs | **confirmed 2026-11-19** | with Speed Tech 10 and a 3x fire-rate aura: 2 s between hits (4 hits in 6 s), stun 1.00 s || D4 | Losing one game must not count as losing another | **confirmed 2026-11-19** | losing Artificium (lives 0) left Undarum's run as it was || D3 | Tower range shown as clean white circles | **confirmed 2026-11-19** | TD `tdDraw` "clean white range border": a thin white circle round the selected tower, every tower while positioning (seen at 1280 px) || D2 | Setting: towers target Most Forward or Highest HP (never "closest") | **confirmed 2026-11-19** | `SH` setting `targeting: forward / hp`; two enemies in range: the further one is shot on "forward", the stronger on "hp" |# Game audit: the old requirements, one by one

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
| D2 | Setting: towers target Most Forward or Highest HP (never "closest") | in code | `SH` setting `targeting: forward / hp` |
| D3 | Tower range shown as clean white circles | to check | not located by search |
| D4 | Losing one game must not count as losing another | in code | state is per game (`setGameState`, `onEnterGame` in HO) |
| D5 | Shock Pylon stuns 1 s, slow, never faster than one hit per 2 s even with buffs | in code | TD item `shock`, rate clamp near line 121 |
| D6 | Resizing the tab must not change tower range or road length (zoom instead) | **fails** (user, 2026-11-19: road length still changes) | TD works in board units (`uu`), per its header |
| D7 | Shop buttons only buy; no drag outside Positioning mode | in code | TD `TD.placing`, drag guarded near line 904 |
| D8 | Grid selection by click / tap and WASD; white outline, red when blocked | in code | TD `TD.sel`, keys near line 995 |
| D9 | Each tower upgrades on its own | in code | per-tower `t.lv`, `t.evo`, `t.spent` |
| D10 | Panel under the canvas with the selected cell or tower and an Upgrade button; Enter upgrades | in code | `#gridInfo`, Enter near line 1005 |
| D11 | Positioning mode button; green / red cells; buying enters it; Enter places | in code | `#posBtn`, TD near lines 226 and 631 |
| D12 | Trash can sells for value minus 20%; setting "Selling Price" 10 to 100%, default 80 | in code | `TD.trash`, `SH sellPrice` |
| D13 | Tech renamed and capped at 10: Power, Speed, Range (+10% a level), Base Healing (100 s down to 10 s) | in code | TD items `power`, `tempo`, `optics`, `repair` |
| D14 | Tower max level 30, evolution choice of 3 at level 15 | in code | `TOWER_MAX = 30`, `EVO_AT = 15` |
| D15 | 27 evolutions (3 for each of 9 towers) with colours and one-line descriptions | in code, **each to be play-tested** | TD `EVOS` |
| D16 | Enemy HP per wave raised to balance | to judge in play | `SH hpGrowth` 0.085, setting "Enemy HP per wave/level" |
| D17 | After everything is maxed: +1% damage per level, no more choice screen | in code | `SH rollCards` "LEVEL BREAK" |

## Undarum (was "Survivor")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| S1 | Magic max level 30, evolution at 15, passives max 10 | in code | SV header, `RPG_EVOS` |
| S2 | Satellite starts with 2 orbs | to check | SV item text says "+1 orb every 6 levels" |
| S3 | Fire Breath: 3 circles in a row | to check | SV |
| S4 | Nature Bloom: 4 patches | to check | SV |
| S5 | Sweeping Laser: one bigger beam through the player, hitting both sides | in code | SV item text "Rotating beam through you" |
| S6 | Meteor: 2 | to check | SV |
| S7 | Boomerang bigger, and its emoji must show | in code | SV uses 🥏; size `13 + lv * 0.7` |
| S8 | After all maxed: +1% per level, no choice screen | in code | shared with D17 |

## Dungeon of Echoes (was "Cards")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| C1 | Branching endless dungeon, 3 branches visible, each splits in 2 | to check | CD |
| C2 | 20 enemies, 5 bosses, boss every N levels (shared setting) | in code, counts to check | CD `ENEMIES`, `BOSSES` |
| C3 | Turn-based; pick from 4 random cards; start with 2 | to check | CD |
| C4 | 10 magic cards to level 30 with an evolution at 15; 5 passives to level 10 | in code, counts to check | CD card table, `CARD_EVOS` |
| C5 | After each win: level up and pick 1 of 3 | in code | CD uses the shared card picker |
| C6 | Counts "Dungeon level" | in code | HO save label "dungeon lvl" |
| C7 | Art, background, enemies and cards look as good as possible | to judge | CD |

## Solarium (was "Sandbox")
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| B1 | A square of colour every 30 to 60 s, setting, default 60 | in code | SB `grantInterval: 60` |
| B2 | 36 colours + 6 greys, stacks to 64 | in code | SB `PALETTE` (42), `MAX_STACK = 64` |
| B3 | Drag from inventory to grid; grid cells stay the same size; zoomable; a bigger tab adds cells | in code | SB header, `BASE_CELL` |
| B4 | Export / download | in code | SB `toBlob` |
| B5 | Gravity toggle, default off ("sky") | in code | SB setting `gravity: false` |
| B6 | Square audio visualiser in the background | to check | SB |

## Shared
| # | Requirement | State | Where |
| --- | --- | --- | --- |
| G1 | "Enemy HP per level" also works per wave in Defense, named "Enemy HP per wave/level" | **confirmed 2026-11-19** | `SH hpGrowth`, used by `enemyHP(TD.level, …)`; doubling it raised wave 10 HP from 25 to 37 |
