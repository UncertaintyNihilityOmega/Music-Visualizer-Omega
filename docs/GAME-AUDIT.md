# Game audit: the old requirements, one by one

Every requirement from the earlier game prompt, with where it is in the code. **"In code"** means the feature was
found by reading; it has **not** been play-tested in this audit. ROADMAP item 9 plays each row and changes its
state to "confirmed <date>" or "fixed <date>".

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
| D6 | Resizing the tab must not change tower range or road length (zoom instead) | in code | TD works in board units (`uu`), per its header |
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
| G1 | "Enemy HP per level" also works per wave in Defense, named "Enemy HP per wave/level" | in code | `SH hpGrowth`, used by `enemyHP(TD.level, …)` |
