# Combat Effects Documentation

## Overview
This document catalogs visual and gameplay effects applied to combatants during battle, including overlays, pseudo-elements, and CSS animations.

---

## Drained Effect

**Trigger:**
- Applied when a fighter is hit by an energy drain attack (e.g., from the Mummy).

**Visual:**
- Adds the `.drained` class to the `.fighter-portrait` element.
- Renders a pseudo-element (`::before`) above the portrait, currently as a solid oval with ⚡ symbols.

**CSS:**
- See `.fighter-portrait.drained::before` in `monster-battle.scss`.

**Planned Tweak:**
- Change from a solid oval to a hollow circle for improved visual clarity.

---

## Shielded Effect

**Trigger:**
- Applied via defensive abilities (e.g. Sage Circle of Protection), amulets (Warding Amulet), or combat status effects.
- Invoked via `applyShieldedEffect(target, amount, duration, broadcastDataUpdate)` in `combat-effects.js`.

**Gameplay & State:**
- `target.shielded = true`
- `target.shieldAmount = X` (absorbs up to $X$ total incoming damage)
- `target.shieldMax = X` (tracks peak shield capacity)
- `target.shielded_eras = duration`

**Mechanics:**
- Incoming damage is processed via `absorbShieldedDamage(target, damage)`.
- The shield absorbs damage up to `shieldAmount`.
- When `shieldAmount` reaches 0 (or damage exceeds `shieldAmount`), the shield breaks (`clearShieldedEffect`), and any remaining damage passes through to `target.hp`.

**Visual:**
- Displays the shield status icon (`shielded.png` / `shielded_partial.png`) in the combat status pane (`CombatGrid.js` / `SiegeCombatGrid.js`).

---

## Blinding Speed Effect

**Trigger:**
- Applied via speed-buffing skills, monk techniques, items, or combat status effects.
- Invoked via `applyBlindingSpeedEffect(target, duration, broadcastDataUpdate)` in `combat-effects.js`.

**Gameplay & State:**
- `target.blindingSpeed = true`
- `target.blindingSpeed_eras = duration`

**Mechanics:**
- Standard combat rules restrict units to **1 move** and **1 attack/action** per round.
- While `blindingSpeed` is active, the unit gains **+1 additional move** and **+1 additional attack/action** per round (total: 2 moves and 2 attacks/actions per round).
- Evaluated via helper functions:
  - `getMaxMovesPerRound(target)` $\rightarrow$ returns base moves + 1 (default 2)
  - `getMaxActionsPerRound(target)` $\rightarrow$ returns base actions + 1 (default 2)
  - `canUnitMoveWithBlindingSpeed(target)` $\rightarrow$ checks if `target.movesTakenThisRound < getMaxMovesPerRound(target)`
  - `canUnitAttackWithBlindingSpeed(target)` $\rightarrow$ checks if `target.actionsTakenThisRound < getMaxActionsPerRound(target)`

**Visual:**
- Displays dynamic speed aura / fast-forward status badge on the combat unit portrait.

