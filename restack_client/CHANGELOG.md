# Change Summary - July 10, 2026

## Map Maker — Photorealistic Floor Texture System

### New: Poly Haven Floor Textures (`src/assets/tilesets/`)
- Downloaded 7 high-resolution (1K) stone/rock diffuse textures from [Poly Haven](https://polyhaven.com) (CC0, no attribution required).
- Files stored in `src/assets/tilesets/`:
  - `ground_grey_diff_1k.jpg` — neutral grey ground (default)
  - `rock_01_diff_1k.jpg` — rough rock
  - `rock_face_diff_1k.jpg` — rock face
  - `rock_face_03_diff_1k.jpg` — dark rock face
  - `moon_01_diff_1k.jpg` — lunar stone surface
  - `lichen_rock_diff_1k.jpg` — lichen-covered rock
  - `coast_sand_rocks_02_diff_1k.jpg` — coastal rock

### Changed: `BoardView.js` — Floor Rendering Architecture
Previous behavior: empty-space tiles used a flat warm-brown color (`#6b6057`) or a procedural HSL slate color.

New behavior — two-layer approach:
1. **Board container background**: The `.board.map-board` div now has a repeating `backgroundImage` (default: `ground_grey`) tiling at `350px × 350px`.
2. **Empty-space tile overlay**: Tiles with `empty_space` or `passage` contains are rendered as `rgba(0, 0, 0, 0.55)` — a dark semi-transparent overlay that lets ~45% of the texture beneath show through.
3. **Content tiles** (monsters, gates, vendors, etc.) keep their solid stored colour, completely covering the texture beneath — this preserves clear editorial distinction between empty floor and placed content.
4. **Void tiles** remain solid near-black, also covering the texture.

Exported constant `FLOOR_TEXTURES` (array of `{ key, label, src }`) from `BoardView.js` — ready to be wired into a texture-picker UI. Pass a `floorTexture` prop to `BoardView` to override the default.

### Fixed: Passage Tile Colour (`BoardView.isEmptySpaceContains`)
- `isEmptySpaceContains` now returns `true` for `passage` tiles in addition to `empty_space`.
- Previously, passage tiles fell through to the warm-brown fallback while empty-space tiles were getting the stone treatment. Both now render consistently.

---

# Change Summary - April 25, 2026

## Required Patterns for All AI Profiles
> **Important:** Every monster and fighter AI profile MUST implement all of the following patterns. When creating a new AI profile, review this section before writing any attack logic.

### 1. `pendingAttack` Repopulation Guard
`restartTurnCycle` in `factories.js` clears `caller.pendingAttack` to `null` at the start of every new turn cycle. An AI profile's `processMove` may fire before `pendingAttack` is repopulated by `chooseAttackType`. Always check and repopulate immediately before triggering an attack:
```js
if (!caller.pendingAttack) caller.pendingAttack = chooseAttackType(caller, target);
if (caller.pendingAttack === 'attack_name') { ... }
```

### 2. Attack Guard (`caller.attacking`)
At the top of any attack trigger, return early if already attacking to prevent double-firing:
```js
if (this.attacking) return;
this.attacking = true;
```
After the attack resolves, always clear the flag — use a `finally` block so it clears even on error:
```js
try {
    // ... attack logic ...
} finally {
    caller.attacking = false;
}
```

### 3. `resolve(null)` Fallbacks in Attack Promises
Every Promise inside an attack sequence must have a `resolve(null)` path to prevent hung Promises that stall the turn cycle. Never leave a `resolve` call only inside a conditional branch without a guaranteed fallback.

### 4. Attack Embedded in `processMove` (not `eraAttack`)
`eraAttack` has been removed from `factories.js`. All attacks must be triggered from within the AI profile's own `processMove` method, inside the appropriate `behaviorSequence` case (e.g., `'brawler'`). Do not rely on the turn cycle to call an external attack dispatcher.

### 5. `chooseAttackType` must be defined
Every AI profile that attacks must implement or import a `chooseAttackType(caller, target)` function that returns a string attack name based on caller/target state. This is the authoritative source for `pendingAttack`.

---

## Combat System Changes (April 2026)

### New: `hitCheck` and `damageCheck` Methods (combat-manager.js)
- `hitCheck(caller, target)` — Miss chance = `min(speed × 2.5, 35%)`. Returns `true` if hit lands.
- `damageCheck(caller, target, rawDamage)` — Armor-based reduction. Level-diff caps applied (75% / 85% / 95%).

### New: Goblin AI (`monster-ai/profiles/Goblin.js`)
- Full AI profile with `brawler` and `flee` behavior sequences.
- **Sticky Fingers** ability: 15% chance per turn when `energy >= cost` and `cooldown_position >= 100`. Finds an unequipped item in the target fighter's inventory and steals it. Sets `caller.stolenItemIcon` for display in the battle UI.
- After a successful steal, switches `behaviorSequence` to `'flee'` and attempts to exit the board.
- Flee pathfinding uses `goTowards({ x: backlineX + 2 })` to move off-board; `_escapePending` flag gates a two-tick delay before the escape is finalized.
- All attack triggers include the `pendingAttack` repopulation guard and `finally` block cleanup.

### Fix: Global `pendingAttack` Repopulation (all monster AI profiles)
All monster AI profiles (Skeleton, Troll, Mummy, BeholderMinion, Goblin) now include the repopulation guard before attack trigger. This prevents stalemates when `restartTurnCycle` clears `pendingAttack` between eras.

### Fix: Combat Stalemate Prevention
- `eraAttack` removed from `factories.js` turn cycle. Attacks are now embedded in each AI profile's `processMove`.
- `movesLeft` no longer gates attacks — attackers fire regardless of move budget.
- `if (this.attacking) return` guard prevents double-firing in all profiles.
- All attack Promises have `resolve(null)` fallbacks.

### Fix: Portrait Ring Displacement
- `drained` class moved to `.portrait-overlay` (which never receives transform animations), not `.fighter-portrait`.
- The `::before` ring glow is now defined under `.portrait-overlay.drained::before` so Rocked/transform animations on the portrait image do not displace it.
- Fighter glow effect moved from a separate `.color-glow` div to `boxShadow` on `.portrait-wrapper`.

### New: Sword Swing Overlay System (`animation-manager.js`, `animation-tile.js`)
- Sword swing animations are rendered via `overlayAnimationType` / `overlayAnimationData` props to prevent `hit-flash` from overwriting the animation mid-swing.
- `startTime: Date.now()` added to all animation data objects as a React key to force re-mount on each new animation.

### New: Grasp and Energy Drain Animations
- `GraspAnimation_*` and `EnergyDrainAnimation_*` keyframes added to `monster-battle.scss`.
- Energy drain animation: lightning icon with red drop-shadow filter, 1400ms. Origin uses closer of main tile vs VCT position.

### New: Item System
- `inventory-manager.js`: `_im_key` stamped on all items at init; `refreshWeaponStats(inventory)` corrects malformed `+N% atk` descriptions; `removeItemByKey(key)` for targeted item removal.
- New items added: shields (9), staves (7), wands (7), spellbooks (20), keys (11) with tier system.
- `images.js`: All new item icons imported.
- `cache-cleanup.js` (new): `keyCleanup` and `itemCleanup` for migrating stale cached dungeon data.

### New: Quest Manager (`utils/quest-manager.js`)
- New file. `generateQuestSet(dungeon)` creates travel, bounty, and item_retrieval quest types.

---

# Change Summary - December 5, 2025

## UI and Animation
- Improved spin attack arc animation for fighters (especially Soldier):
  - AnimationManager and Soldier AI now support dynamic 3-tile arcs, hitting multiple enemies in adjacent tiles.
  - Added sword arc orbit and spin keyframes to `monster-battle.scss`.
  - AnimationTile component now visually animates sword arcs and debug tile hits.
- Fighter and monster death animations updated: removed blur effect for clarity.

## Combat Logic
- CombatManager: Critical hits are now disabled for more predictable damage.
- CrewManager: Soldier base HP increased to 1000 for better survivability.
- MonsterBattle: Dead combatants are removed from the DOM after a delay, improving UI responsiveness.

## Refactoring and Debug
- Removed most console.log/debug output from major components (App, CombatSimulator, CrewManagerPage, DungeonView, UserManagerPage) for cleaner production logs.
- AnimationTile and AnimationManager refactored for better modularity and animation control.

## Styles
- Added debug-animation classes and transitions to App.scss for tile animation debugging.
- Improved animation keyframes and visual feedback in monster-battle.scss.

## Miscellaneous
- UserManagerPage: Cleaned up user table and removed debug logs.
- DungeonView: Refactored click handlers and removed debug output.

---

# Monk Teleport Visual Effect Refactor (December 15, 2025)

## Teleporting Flow
- The Monk's teleport visual effect is now triggered only when the Monk actually teleports (i.e., when the Monk AI calls `teleportToBackLine`).
- The UI is notified of the teleport event via a callback mechanism: `teleportToBackLine` accepts an optional callback, which is set by the UI (MonsterBattle.js) to update the `teleportingFighterId` state.
- This ensures the teleport animation is only shown for the correct fighter and only at the moment of actual teleportation, not when the "dragon punch" special is selected.
- The callback is safely defined as a no-op by default in Monk.js, and is overridden by the UI as needed.

**Files changed:**
- src/pages/sub-views/MonsterBattle.js
- src/utils/fighter-ai/profiles/Monk.js
- src/utils/shared-ai-methods/movement-methods.js

**Summary generated by GitHub Copilot on December 15, 2025.**
