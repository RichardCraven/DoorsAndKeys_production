# Tower Siege — Implementation Plan

## Overview

Tower Siege is a large-scale combat event — a full-screen, epic confrontation where the player's crew and their persistent Siege Army engage the Hashmallim and its forces on a massive 15×20 battle board. Unlike the standard 6×8 MonsterBattle, this event is cinematic in scale, with sequential army fade-ins before combat begins.

For now the event is only accessible via the browser console by typing `siege`.

---

## Board Dimensions

### Current MonsterBattle (reference)
| Property | Value |
|---|---|
| Grid | 6 rows × 8 columns |
| Tile size | 100px × 100px |
| Border per tile | 2px |
| Total board size | 816px wide × 612px tall |

### Siege Board (new)
| Property | Value |
|---|---|
| Grid | 15 rows × 20 columns |
| Tile size | **56px × 56px** |
| Border per tile | 1px |
| Total board size | **1140px wide × 855px tall** |
| Layout | Full-screen, no interaction/event log panel |

**Tile size rationale:** `56 × 20 + 1 × 20 = 1140px` wide, `56 × 15 + 1 × 15 = 855px` tall. This fits comfortably on screens ≥1280×900 and still provides enough pixel real estate per unit for portraits to be readable. At 56px, unit portraits will render at roughly 56% of their normal size. The tile border is reduced from 2px to 1px to keep the grid visually clean at this scale.

---

## Unit Positioning & Faction System

### Factions
The current combat system tracks sides via `isMonster` and `isMinion` boolean flags. Siege requires a proper multi-faction model. A new `faction` string field will be added to each combatant on registration:

| Faction | Description |
|---|---|
| `'crew'` | Player crew members |
| `'siege_army'` | Player's forged army units |
| `'hashmallim'` | The Hashmallim boss |
| `'hashmallim_army'` | Beholders, beholder minions, and other enemy units |

Targeting logic in the combat manager will be updated so any unit considers another unit hostile if and only if their factions are on opposite sides:
- **Player side:** `'crew'`, `'siege_army'`
- **Enemy side:** `'hashmallim'`, `'hashmallim_army'`

The existing `isMonster` / `isMinion` checks throughout combat resolution must be replaced with faction checks for Siege (or a compatibility shim applied). The safest approach is to add a `siegeFaction` field that the Siege board reads, while `isMonster` retains its existing value for backward compatibility with other combat logic.

### Starting Positions
| Entity | Column (x) | Rows (y) |
|---|---|---|
| Crew members | x = 0 (leftmost) | Spread across center lanes (y 5–9) |
| Siege Army units | x = 1–3 (near-left) | All 15 rows, distributed by unit count |
| Hashmallim | x = 17 (3 cols from right, centered) | y = 6–8 (vertically centered, 3×3 anchor) |
| Hashmallim Army | x = 14–19 (right zone) | Distributed across all 15 rows |

The Hashmallim is **tier 4 / isHuge** (3×3 footprint in the current system). For Siege it may be promoted to a **9×9 tile complex** — see open questions below.

---

## The Hashmallim's Army

By default the Hashmallim arrives with:
- **2 Beholders** (tier 3, isLarge / 2×2 footprint each)
- **6 Beholder Minions** (tier 1, standard size)

These units will have `faction: 'hashmallim_army'` and `isMonster: true`. They spawn using the existing monster definitions in `monster-manager.js` (`beholder`, `beholder_minion`). Their skills, stats, and AI behaviours are unchanged.

---

## Siege Army — Player's Persistent Force

### Concept
Players can forge **Army Units** from Soul Shards, the same resource currently used for Echo Cards. Forging an Army Unit permanently adds that unit to `meta.siegeArmy`. Each entry represents one live unit that will participate in future Siege events.

### Forging
- **Cost:** 3 Soul Shards of the target monster type (same cost as Echo Cards)
- **Tier-based copy cap** — the maximum number of copies of a unit in the army is determined by that monster's tier:

  | Monster Tier | Max Copies in Army |
  |---|---|
  | Tier 1 | 3 |
  | Tier 2 | 2 |
  | Tier 3 | 1 |
  | Tier 4 | *(no soul shards drop from tier 4 units — not forgeable)* |

- Each additional forge of the same type adds one more copy (up to the cap). The Forge button is disabled once the cap is reached.
- **Army units share identical stats and skills** with the corresponding monster definition in `monster-manager.js`
- They do **not** become Echo Cards — forging into the army is a separate path from forging Echo Cards

### Persistence
`meta.siegeArmy` — a new whitelisted key in `session-handler.js`:

```js
// Structure — multiple copies of the same type are stored as separate entries
meta.siegeArmy = [
  { type: 'goblin', hp: 40, maxHp: 40 },   // alive, copy 1
  { type: 'goblin', hp: 40, maxHp: 40 },   // alive, copy 2
  { type: 'goblin', hp: 0,  maxHp: 40 },   // dead (permanently destroyed)
  { type: 'witch',  hp: 95, maxHp: 95 },   // alive (tier 2 — max 2 copies)
];
```

The cap is enforced at forge time: `getTierCap(tier) = { 1: 3, 2: 2, 3: 1 }[tier] ?? 0`. The live count (entries where `hp > 0`) for a given type must be less than the cap for the Forge button to be enabled.

HP is tracked persistently. Units that are **killed during a Siege event** have their `hp` set to 0 and are permanently destroyed (removed from the army). Units that survive retain their current HP which regenerates fully between sieges.

### Forging UI — Siege Army Screen
The **"Shards" button** in the Camping interface will be renamed to **"Siege Army"**. Its existing component (`src/pages/sub-views/CardForge.js` or a new sibling) will be refactored to include **three tabs**:

| Tab | Content |
|---|---|
| **Forge Units** | Grid of all monster types with shard counts. Shows forge button (enabled at ≥3 shards **and** current live count < tier cap). Displays current live count vs. cap (e.g. "2 / 3") for each type. |
| **Your Army** | Card view of all forged (living) army units, showing HP, stats, and skills. |
| **Forge Echoes** | Existing Echo Card forge UI, unchanged. |

The rename affects: the Camping screen button label, and the route/modal title.

---

## Sequence of Events — The Siege Fade-In

When the Siege event is triggered, the following cinematic sequence occurs before combat begins:

1. **Screen transition** — Full-screen black fade covering the dungeon, then the siege board fades in (empty, all dark tiles).
2. **Crew materialise** — Player's crew members fade in at the left columns (x=0), staggered one by one with a soft glow animation (~1.5s total).
3. **Hashmallim materialises** — The Hashmallim fades in at the right side, centered vertically (~1.5s).
4. **Armies materialise simultaneously** — The Siege Army (left side, x=1–3) and the Hashmallim's army (right side, x=14–19) both fade in at the same time, giving the impression of two forces assembling (~2s). Each unit has a subtle `opacity: 0 → 1` transition staggered by row.
5. **Combat begins** — After a short pause (~1s) with all units visible, the fight-interval timer starts and combat proceeds.

The fade-in uses CSS `opacity` transitions managed by a `siegePhase` state value in the Siege component:
`'empty' → 'crew' → 'hashmallim' → 'armies' → 'combat'`

---

## Architecture — New & Modified Files

### New Files

#### `src/pages/sub-views/TowerSiege.js`
The primary Siege component, modelled after `MonsterBattle.js` but with:
- `SIEGE_ROWS = 15`, `SIEGE_COLS = 20`, `SIEGE_TILE_SIZE = 56`, `SHOW_TILE_BORDERS = true` (1px)
- A new `SiegeCombatGrid` component (or a parameterised fork of `CombatGrid.js`) positioned inside the board
- Full-screen layout — no event log panel at bottom
- `siegePhase` state to drive the cinematic fade-in sequence
- A separate tick / round timer that drives combat (same FIGHT_INTERVAL system)
- On combat end: brief `SiegeSummaryPanel` → return to dungeon

#### `src/components/combat-panes/SiegeCombatGrid.js`
Fork of `CombatGrid.js` with `TILE_SIZE` parameterised via props (`tileSize = 56`). Renders unit portraits at the smaller tile scale. Large units (`isLarge`) scale to 2×2 tile footprints at 56px each (= 112px portrait), huge units to 3×3 (= 168px portrait). The 9×9 Hashmallim variant would require a new `isColossal` classification.

#### `src/styles/tower-siege.scss`
All Siege-specific styles: full-screen container, tile grid, fade-in keyframes, summary panel.

#### `src/pages/sub-views/SiegeArmyScreen.js`
New component replacing the current `CardForge.js` Shards tab logic, or a wrapper that adds the new **Forge Units** and **Your Army** tabs alongside the existing Echo forge.

### Modified Files

#### `src/pages/DungeonPage.js`
- Add `window` property getter for the `siege` console command (mirrors existing `lvl_up` pattern):
  ```js
  Object.defineProperty(window, 'siege', {
      get: () => { this.triggerSiegeEvent(); return 'Initiating siege...'; }
  });
  ```
- Add `triggerSiegeEvent()` method that sets `this.setState({ inSiegeEvent: true })`
- Render `<TowerSiege>` when `this.state.inSiegeEvent === true`
- Rename "Shards" camping button to "Siege Army" and route it to `SiegeArmyScreen`

#### `src/utils/combat-manager-redux.js`
- Add `faction` field support to `createFighter()` — default remains `isMonster`-based but Siege overrides this
- Add a `siegeMode` flag to the combat manager instance that switches targeting logic from `isMonster` checks to `faction` checks
- Add `setMaxDepth(19)` / lane count overrides for the 15×20 board
- `reset()` will not be called for Siege; instead a new `initializeSiege()` method will set board dimensions

#### `src/utils/session-handler.js`
- Add `'siegeArmy'` to the `whitelistedKeys` array

#### `src/utils/monster-manager.js`
- No structural changes needed — army units use existing monster definitions directly

#### Camping screen component (wherever the Shards button lives)
- Rename label: `'SHARDS'` → `'SIEGE ARMY'`
- Update icon if desired

---

## Open Questions / Design Decisions

> **IMPORTANT — Hashmallim footprint in Siege:**
> The user mentioned a possible **9×9 tile complex** for the Hashmallim. The current system supports:
> - Standard (1×1), Large (2×2), Huge (3×3)
> A 9×9 would be a brand-new `isColossal` tier requiring new VCT logic (currently 1–2 VCT tiles; 9×9 = 80 VCTs). This is technically feasible but is a large implementation surface on its own. **Decision needed: confirm 9×9 or use the existing 3×3 huge classification scaled up visually.**

> **IMPORTANT — Win / Loss Conditions:**
> As noted by the user, these are undecided. The current plan ends with: show a brief `SiegeSummaryPanel` (outcome label + unit casualties), then return to dungeon. Persistent consequences (e.g., gold reward, unlock, story trigger) are deferred.

> **DECIDED — Army unit copy cap (tier-based):**
> Forging additional copies of the same monster type is allowed, up to a tier-based ceiling:
> - Tier 1: max 3 copies · Tier 2: max 2 copies · Tier 3: max 1 copy · Tier 4: no shards, not forgeable.
> Each copy is a fully independent combatant in the Siege. If a copy is killed it is permanently removed (that slot in the cap opens up again and can be re-forged).

> **DEFERRED — Trigger event (non-console):**
> The in-world trigger for the Siege event is not yet decided. The browser console `siege` command remains the only entry point until a trigger is designed.

> **DECIDED — Default debug army (console-triggered siege):**
> When the siege is triggered via the `siege` console command, a hardcoded default Siege Army is used regardless of what is in `meta.siegeArmy`. This default army is:
> - 2× Skeleton (tier 1)
> - 2× Goblin (tier 1)
> - 1× Mummy (tier 2)
>
> The Hashmallim's army (always present in Siege) is: 2× Beholder + 6× Beholder Minion.

> **DECIDED — Tile size on very small screens:**
> A CSS `transform: scale()` fallback will be applied. The siege board container will detect the available viewport width on mount (and on `resize`) and apply a proportional scale-down if the viewport is narrower than ~1180px. Implementation: wrap the board in a fixed-size container, then apply `transform: scale(viewportWidth / 1180)` with `transform-origin: top left` when `viewportWidth < 1180`. This mirrors the dungeon map's small-screen handling.

> **DECIDED — Army unit HP between sieges:**
> HP is **not** persisted between sieges. After every Siege event, all surviving army units have their HP reset to `maxHp`. Only **deaths** are permanent — a unit whose HP reaches 0 during combat is flagged as destroyed and removed from the army. `meta.siegeArmy` entries therefore only need a boolean `destroyed` flag (or simply removal of the entry) rather than tracking a live HP value across sessions.

---

## Verification Plan

### Automated Tests (new test files)
- `__tests__/siege-army-forge.test.js` — forging an army unit deducts 3 shards from `meta.soulShards` and adds the unit to `meta.siegeArmy`
- `__tests__/siege-army-destruction.test.js` — a unit killed in siege has `hp = 0` and is flagged as destroyed
- `__tests__/siege-faction-targeting.test.js` — `siege_army` units target `hashmallim_army` units and not `crew` units

### Manual Verification
1. Type `siege` in the browser console → Siege board renders full-screen
2. Watch the cinematic fade-in sequence: crew → Hashmallim → armies simultaneously
3. Combat ticks proceed at the current speed setting
4. Units from both armies fight; killed army units remain dead after the event
5. Camping screen "Siege Army" button opens the new screen with correct tabs
6. Forging a unit (with ≥3 shards) adds it to the army and deducts shards
7. Combat summary panel appears on combat end → dungeon resumes
