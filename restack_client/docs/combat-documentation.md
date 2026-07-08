# Combat System Documentation

## Overview

This document describes the core combat engine systems: turn cycles, era transitions, hit/miss resolution, damage reduction, facing, animation routing, and item/weapon sync. It reflects the current state of the codebase as of April 2026 and is intended as a reference for ongoing development.

---

## Table of Contents

1. [Turn Cycle & Era System](#1-turn-cycle--era-system)
2. [Hit Resolution — `hitCheck`](#2-hit-resolution--hitcheck)
3. [Damage Reduction — `damageCheck`](#3-damage-reduction--damagecheck)
4. [Fear Effect System](#4-fear-effect-system)
5. [Facing System](#5-facing-system)
6. [Attack Hang Prevention](#6-attack-hang-prevention)
7. [Animation Routing — `overlayAnimationType`](#7-animation-routing--overlayanimationtype)
8. [Weapon Stat Sync — `_im_key` System](#8-weapon-stat-sync--_im_key-system)
9. [VCT (Virtual Combat Tile) System](#9-vct-virtual-combat-tile-system)
10. [Shield Wall](#10-shield-wall)
11. [Monster Speeds Reference](#11-monster-speeds-reference)
12. [Armor & Defense Reference](#12-armor--defense-reference)

---

## 1. Turn Cycle & Era System

### Constants
- `FIGHT_INTERVAL`: ~20ms — interval tick rate for all combatants
- `TICKS_PER_ERA`: 250 — number of ticks per era
- Each turn cycle consists of 5 eras: era 0–4 are move eras, era 4 triggers an attack attempt

### How Eras Work

Each combatant runs `turnCycle()` via `setFightInterval`. Inside the interval tick, the engine tracks `_lastEraIndex` on the combatant to detect era transitions (when `eraIndex` increments). Era transitions are used to:

- Decrement fear duration (`feared_eras--`)
- Trigger `onEraTransition` callbacks (e.g., Barbarian's berserker expiry check)
- Drive special ability cooldowns (expressed in eras, not milliseconds)

### Reentrance Guard: `_inRestartTurnCycle`

`restartTurnCycle()` is called from multiple code paths (movement, attack completion, `setFightInterval`). To prevent double-decrement of per-era counters (particularly `feared_eras`), a boolean flag `_inRestartTurnCycle` guards against nested calls:

```javascript
if (this._inRestartTurnCycle) return;
this._inRestartTurnCycle = true;
// ... restart logic ...
this._inRestartTurnCycle = false;
```

### `eraAttack` Guards

The `eraAttack` function in `factories.js` has three critical early-return guards:

```javascript
if (!target) return;
if (!this.pendingAttack) return;
if (this.attacking) return;
```

The `movesLeft` gate was intentionally **removed** from `eraAttack`. Previously, a surrounded unit that used all move attempts on blocked cells could never attack. Removing the gate allows attacks regardless of whether the unit had moves remaining that era.

---

## 2. Hit Resolution — `hitCheck`

**File:** `src/utils/combat-manager.js`

**Purpose:** Determines whether an attack actually connects, based on the target's speed/agility.

### Formula

```javascript
hitCheck(caller, target) {
    const speed = target.stats?.speed ?? target.stats?.dex ?? 1;
    const missChance = Math.min(speed * 2.5, 35) / 100;
    return Math.random() > missChance; // true = hit
}
```

- `speed` reads `stats.speed` (monsters) or falls back to `stats.dex` (fighters)
- Miss chance scales linearly with speed: `speed × 2.5%`
- Hard cap: **35% maximum miss chance** (no unit is untouchable)
- Returns `true` if the attack hits, `false` if it misses

### Miss Chance by Speed

| Speed | Miss Chance |
|-------|-------------|
| 1     | 2.5%        |
| 4     | 10%         |
| 7     | 17.5%       |
| 10    | 25%         |
| 13    | 32.5%       |
| 14+   | 35% (cap)   |

### Wiring

`hitCheck` is called inside `hitsCombatant` and `hitsTarget` in `combat-manager.js`, before damage is applied. If `hitCheck` returns false, `missesTarget` is called instead.

It is also exposed via:
- `this._callbacks.hitCheck` (passed to all fighter/monster AI profiles)
- `utilMethods.hitCheck` (available to all profile instances)

---

## 3. Damage Reduction — `damageCheck`

**File:** `src/utils/combat-manager.js`

**Purpose:** Reduces raw damage based on the target's equipped armor and natural defense.

### Formula

```javascript
damageCheck(caller, target, rawDamage) {
    const equipped = (target.inventory || [])
        .filter(i => i.type === 'armor' && i.equippedSlot && i.armor)
        .reduce((sum, i) => sum + i.armor, 0);
    const natural = (target.stats?.def ?? 0) * 4;
    const total = equipped + natural;
    const levelDiff = (target.level ?? 1) - (caller.level ?? 1);
    const maxReduction = levelDiff >= 10 ? 95 : levelDiff >= 5 ? 85 : 75;
    const reductionPct = Math.min(total * 0.7, maxReduction) / 100;
    return Math.max(0, Math.round(rawDamage * (1 - reductionPct)));
}
```

### Components

| Source | Calculation |
|--------|-------------|
| Equipped armor items | Sum of `.armor` on all equipped `type === 'armor'` inventory items |
| Natural defense | `target.stats.def × 4` (monsters use `def` as a natural armor stat) |
| Total armor | `equipped + natural` |
| Reduction % | `min(total × 0.7, maxReduction)` |

### Max Reduction Cap

The maximum damage reduction is capped based on the level difference (target level minus caller level):

| Level Difference | Max Reduction |
|-----------------|---------------|
| < 5             | 75%           |
| ≥ 5             | 85%           |
| ≥ 10            | 95%           |

This prevents low-level attackers from doing meaningful damage to high-level heavily-armored targets while keeping combat feel balanced at similar levels.

### Wiring

`damageCheck` is called in `hitsCombatant` and `hitsTarget` after `hitCheck` confirms the attack connects. Raw damage is passed through `damageCheck` before being applied to `target.hp`.

Also exposed via `this._callbacks.damageCheck` and `utilMethods.damageCheck`.

---

## 4. Fear Effect System

**Files:** `src/utils/factories.js`, `src/utils/monster-ai/profiles/Mummy.js`, `src/utils/specials-matrix.js`

### Duration Source

Fear duration is read from `specials-matrix.js`:
```javascript
const fearSpecial = this.resolveSpecial(caller, 'induce_fear');
feared_eras = fearSpecial.duration ?? 2;
```
It is **not** hardcoded. The matrix is the authoritative source.

### Era-Based Counting

Fear is counted in eras, not turn cycles. The decrement is triggered inside the interval tick using the `_lastEraIndex` tracker:

```javascript
if (currentEraIndex !== this._lastEraIndex) {
    // Era transition detected
    if (this.feared && typeof this.feared_eras === 'number') {
        this.feared_eras--;
        if (this.feared_eras <= 0) {
            this.feared = false;
            this.feared_eras = 0;
        }
    }
    this._lastEraIndex = currentEraIndex;
}
```

### Re-application Guard

`triggerInduceFear` in `Mummy.js` checks `caller.feared` before applying:
```javascript
if (target.feared) return; // already feared, don't reset duration
```

---

## 5. Facing System

**File:** `src/utils/combat-manager.js` (`recalculateFacing`), `src/utils/fighter-ai/shared-ai-methods/behaviors.js`

### 4-Directional Facing

All combatants (Soldier, Barbarian, Mummy, Skeleton, Wizard) use a 4-directional facing formula:

```javascript
if (target.coordinates.x === caller.coordinates.x) {
    newFacing = target.coordinates.y > caller.coordinates.y ? 'down' : 'up';
} else {
    newFacing = target.coordinates.x > caller.coordinates.x ? 'right' : 'left';
}
```

### Debounce

`recalculateFacing` debounces facing changes to prevent tick-rate oscillation. A new facing direction must be computed on **3 consecutive calls** before it is committed:

```javascript
if (caller._pendingFacing === newFacing) {
    caller._pendingFacingCount = (caller._pendingFacingCount || 0) + 1;
    if (caller._pendingFacingCount >= 3) {
        caller.facing = newFacing;
        caller._pendingFacing = null;
        caller._pendingFacingCount = 0;
    }
} else {
    caller._pendingFacing = newFacing;
    caller._pendingFacingCount = 1;
}
```

### Ownership Rule

`recalculateFacing` in `combat-manager.js` is the **sole owner** of the `facing` property. Direct assignments to `caller.facing` in `behaviors.js` were removed entirely to prevent bypassing the debounce.

### Target Change

When `setTargetId` detects a new target, facing is committed immediately (bypassing the debounce) to prevent a null-facing flash window that caused visible flicker:

```javascript
// In acquireTarget, on target change:
if (!caller.facingLocked) {
    // compute and commit newFacing immediately
    caller.facing = newFacing;
    caller._pendingFacing = null;
    caller._pendingFacingCount = 0;
}
```

`setTargetId` no longer sets `caller.facing = null` on target change.

---

## 6. Attack Hang Prevention

### `caller.attacking` Cleanup

All fighter and monster AI profiles set `caller.attacking = false` after their attack Promise resolves. This prevents the unit from permanently locking in an attacking state when an attack chain completes:

```javascript
// After attack animation + hit resolution:
caller.attacking = false;
```

Affected profiles: Soldier, Barbarian, Skeleton, Mummy, and all fallback paths.

### `resolve(null)` Fallbacks

Any Promise-based attack function that looks up a tile ID (source or target) has a `resolve(null)` fallback for the case where the tile doesn't exist. This prevents hung Promises that would stall the combatant's turn cycle indefinitely:

```javascript
const sourceTileId = getSourceTile();
if (!sourceTileId) {
    resolve(null);
    return;
}
```

### Stalemate Prevention

The `movesLeft` gate was removed from `eraAttack`. Previously, a unit surrounded on all sides would exhaust all move attempts without moving, decrementing `movesLeft` to 0, and then be unable to attack because the gate checked `movesLeft > 0`. With the gate removed, a unit can always attack even if it couldn't move.

---

## 7. Animation Routing — `overlayAnimationType`

**Files:** `src/utils/animation-manager.js`, `src/components/animation-tile.js`

### Problem

The tile's `animationType` field is shared between movement effects (e.g., `hit-flash`) and attack animations (e.g., `sword_swing`). The `hit-flash` applied during damage would overwrite `sword_swing` mid-animation, cutting it off visually.

### Solution

A separate `overlayAnimationType` / `overlayAnimationData` pair was added to each tile object. Sword swing (and other overlay-layer animations) are written to these fields instead of the primary `animationType`.

```javascript
// In animation-manager.js swordSwing:
tile.overlayAnimationType = 'sword_swing';
tile.overlayAnimationData = {
    src: swordGifSrc,
    duration: 600,
    startTime: Date.now(),  // used as React key to force re-mount on re-use
    facing: caller.facing,
};
```

```jsx
// In animation-tile.js:
{props.overlayAnimationType === 'sword_swing' && (
    <img
        key={overlayAnimationData.startTime}
        src={overlayAnimationData.src}
        className="sword-swing-overlay"
        ...
    />
)}
```

### `startTime` as React Key

`startTime: Date.now()` is stamped on animation data objects for sword swing, axe swing, grasp, and energy drain. This value is used as the `key` prop on the rendered element, ensuring React unmounts and remounts the animation element each time it triggers — even if the same tile is targeted consecutively.

---

## 8. Weapon Stat Sync — `_im_key` System

**File:** `src/utils/inventory-manager.js`, `src/pages/DungeonPage.js`, `src/pages/sub-views/MonsterBattle.js`

### Problem

Crew members' inventory items are serialized to localStorage. If weapon stats (damage, descriptions) are updated in `allItems`, loaded crew members continue to use stale stat values from their saved copies.

### Solution: `_im_key`

Every item in `allItems` is stamped with a `_im_key` during `initializeItems`. This key is a unique identifier tied to the item's canonical definition.

`refreshWeaponStats(inventory)` iterates over a crew member's inventory and, for each weapon, looks up the matching entry in `allItems` by `_im_key`. If found, it re-hydrates the weapon's stats (damage, atk, description) from the canonical source:

```javascript
refreshWeaponStats(inventory) {
    inventory.forEach(item => {
        if (item.type !== 'weapon' || !item._im_key) return;
        const canonical = this.allItems.find(i => i._im_key === item._im_key);
        if (!canonical) return;
        item.damage = canonical.damage;
        item.atk = canonical.atk;
        // Auto-correct description via regex:
        item.description = item.description.replace(/\+\d+%\s*atk/, `+${canonical.atk}% atk`);
    });
}
```

### When Called

`refreshWeaponStats` is called:
1. In `DungeonPage.componentWillMount` after `initializeCrew`
2. In the respawn path in `DungeonPage`
3. In `MonsterBattle` before `initializeCombat`

### Weapon Description Format

All weapon descriptions follow the format: `+N% atk [Tier N]`

Example: `Rusty Sword — +12% atk [Tier 1]`

---

## 9. VCT (Virtual Combat Tile) System

**File:** `src/utils/combat-manager.js`

### Purpose

Large monsters (2-tile-tall: dragon, beholder, ogre, sphinx, manticore, wyvern) occupy two tiles vertically. The **Virtual Combat Tile (VCT)** is a synthetic combatant entry placed on the tile above the monster's foot tile.

- VCTs are entries in `this.combatants` with `isVCT: true` and `parentMonsterId` set
- They allow fighters to target the upper tile and have hits register correctly on the parent monster
- VCTs are excluded from `allCrewDead` checks: `&& !e.isVCT`
- VCTs are excluded from monster/minion targeting — monsters must never queue an attack against a VCT

### `getVct(id)`

Returns the VCT associated with a given monster ID:

```javascript
getVct(monsterId) {
    if (!this.vctByMonster) return null;
    return this.vctByMonster[monsterId] || null;
}
```

Available on `utilMethods.getVct` for AI profiles.

### VCT Attack Origin (Mummy)

When the Mummy fires `energy_drain`, it selects the origin tile (main vs VCT) by Manhattan distance to the target — whichever is closer:

```javascript
const mainDist = Math.abs(caller.coordinates.x - target.coordinates.x) + Math.abs(caller.coordinates.y - target.coordinates.y);
const vct = this.getVct(caller.id);
const vctDist = vct
    ? Math.abs(vct.coordinates.x - target.coordinates.x) + Math.abs(vct.coordinates.y - target.coordinates.y)
    : Infinity;
const sourceTile = vctDist < mainDist ? vct : caller;
```

---

## 10. Shield Wall

**File:** `src/utils/fighter-ai/profiles/Soldier.js`, `src/utils/specials-matrix.js`

### Configuration (from specials-matrix)

```javascript
shield_wall: {
    duration: 4,       // eras
    cooldown: 15,      // eras
    energy_cost: 30,
}
```

### Activation Conditions

- `caller.energy >= shieldWall.energy_cost`
- `caller.specialActions.shield_wall.cooldown_position === 100` (fully cooled down)
- All adjacency and threat conditions evaluated by Soldier AI

### Visual

`shieldWallActive` is read from the live combatant (`getCombatant(fighter.id)?.shieldWallActive`) in the fighter pane and applies the `.shield-wall-active` CSS class, which renders a white pulsing glow on the portrait.

---

## 11. Monster Speeds Reference

Speed controls movement rate, attack frequency (`kickoffAttackCooldown`), and miss chance (`hitCheck`).

| Monster         | Speed |
|----------------|-------|
| Mummy          | 4     |
| Troll / Ogre   | 5     |
| Dragon         | 6     |
| Skeleton       | 7     |
| Sphinx         | 7     |
| Gorgon         | 8     |
| Witch / Beholder | 9   |
| Goblin / Kabuki | 11   |
| Wraith         | 12    |
| Vampire        | 13    |

---

## 12. Armor & Defense Reference

### Fighter Armor (Equipped Items)

Armor items have an `.armor` integer value. All equipped items (`equippedSlot` set, `type === 'armor'`) are summed. Example reduction percentages at `damageCheck` thresholds:

| Total Armor | Raw Reduction Factor | Effective Reduction (cap 75%) |
|-------------|---------------------|-------------------------------|
| 10          | 7%                  | 7%                            |
| 30          | 21%                 | 21%                           |
| 60          | 42%                 | 42%                           |
| 100         | 70%                 | 70%                           |
| 110+        | >75% → capped       | 75%                           |

### Monster Natural Armor

Monsters do not equip armor items. Their natural defense uses `stats.def`:
- Natural armor = `stats.def × 4`
- Example: a monster with `def: 3` contributes 12 natural armor points

### `def` Stat for Fighters

Fighter `def` stat currently contributes nothing to `damageCheck` (only `equipped` armor items count). It is preserved for future use.

---

## Related Documentation

- [Animation Documentation](animation-documentation.md) — canvas animation system, tracer effect, claw swipe
- [Combat Effects](combat-effects.md) — drained, fear, bleed, stun overlays
- [Special Actions](special-actions.md) — berserker, shield wall, meditate, induce fear
