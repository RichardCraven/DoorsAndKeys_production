# Combat Overhaul Task List & Specification

This document outlines the detailed specifications and itemized task list for the complete overhaul of the combat system in the Restack Simulator. The current turn-interval and era-based system will be replaced by a centralized, round-based AI combat engine.

---

## 1. Core Mechanics & Specifications

### 1.1 Rounds System
- **Central Timer / Clock**: Renders at the top-right of the combat board as a circular UI element containing the current round number.
- **Speed Settings**:
  - **Fast**: Each round takes exactly `1 second`.
  - **Slow**: Each round takes exactly `2 seconds`.
- **Radial Progress Overlay**: Circles the round number, starting full and radially emptying/filling (indicating remaining time in the round) as the seconds tick down. Once the round time finishes, the round increments, and the timer loops.
- **Actions Per Round**: Every combatant is entitled to exactly:
  - `1 move`
  - `1 action`

### 1.2 Endurance System
- **Endurance Bar**: A white bar rendered below the red HP bar on the unit's portrait.
- **Max Endurance**: Based on the unit's **Vitality** attribute (a new/derived stat).
- **Exertion Cost**:
  - Moving costs **1 Endurance unit**.
  - Performing an action costs **1 Endurance unit**.
- **Energy Removal**: The old "Energy" resource is completely removed.
- **Cooldown Penalties**:
  - If Endurance drops to **50% or below** of Max, all ability cooldowns are increased by **50%** (e.g., a 6s cooldown becomes 9s).
  - If Endurance reaches **0**, all ability cooldowns are increased by **100%** (e.g., a 6s cooldown becomes 12s).
- **Recovery Rate**:
  - Every **2 rounds**, units regain **1% of their max endurance** (rounded down).
  - If a unit's endurance reaches **0**, it is **frozen at 0 for 4 rounds** (no recovery during this time). After 4 rounds, recovery resumes at the recovery rate.

### 1.3 Combat Actions, Cooldowns & State
- **Cooldown-Based Abilities**: All skills now use cooldown durations in seconds. Cooldowns are represented on the UI with radial overlay filters.
- **AI Decision Tree**:
  - Evaluate the situation to choose the best action.
  - Determine optimal sequencing: Move-then-Act vs. Act-then-Move.
  - Determine optimal target: Enemy (offensive), Ally (support), or Self (buffs/potions).
- **Incapacitated/Busy States**:
  - Frozen, Stunned, or Petrified units cannot act or move.
  - If an action's execution duration is longer than a standard round tick, the unit is marked busy and cannot participate in subsequent rounds until the action resolves.

### 1.4 Terminology & Data Adjustments
- **Dodge Chance**: The `dexterity`/`speed` stat is standardized across all fighters and monsters. Speed/Dexterity now exclusively dictates the chance for opponents to miss.
- **Summoner Integration**: Wired into `CrewManager` with custom stats and level-up scaling. (Engineer is omitted for now).

### 1.5 Power & Ultimate System
- **Power Resource**: A PC-specific resource that starts at 0 and maxes at 100.
- **Power Accumulation**:
  - **Damage Dealt**: Deals damage to gain power. Grants **1 Power per 5%** of the target's max HP damaged.
  - **Minimum Threshold Gain**: If damage dealt is $> 10$ but doesn't meet the $5\%$ threshold, **1 Power** is still awarded (preventing zero gain against high-HP bosses).
  - **Killing Blows**: Landing the final, fatal hit on a monster awards a flat bonus of **+20 Power** (20% of the maximum pool).
  - **Power Boost Tiles (PBTs)**: Pick up a PBT to gain **+90 Power**.
- **Power Boost Tiles (PBT) Lifecycle**:
  - **Spawn**: 20% chance per round to spawn a PBT on a random unoccupied board tile.
  - **Lifetime**: PBTs last for 2 rounds unconditionally. Starting from the 3rd round, they have a 50% chance to decay and disappear each round.
  - **Pickup**: Stepping on a PBT awards +90 Power, removes the tile, and triggers a premium expanding visual pulse and concentric ring animation.
- **Ultimate Skill Activation**:
  - Triggered automatically when a PC unit reaches **100 Power**.
  - Pauses/freezes all combat rounds for **2 rounds** (`combatPaused = true`).
  - Displays a fullscreen golden glow warning ("ULTIMATE!") and the character's name.
  - Resets the unit's Power to 0 and resumes combat after the 2-round freeze.

---

## 2. Itemized Implementation Tasks

### Phase 1: Pre-Work & Data Layer Standardization
- [ ] Add **Recovery Rate** to [TERMINOLOGY.md](file:///Users/richardcraven/Documents/Projects/restack/restack_client/TERMINOLOGY.md).
- [ ] Standardize the stats for all combat classes and monsters in [crew-manager.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/crew-manager.js) and [monster-manager.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/utils/monster-manager.js):
  - Map/scale speed and dexterity to have the same visual/functional value.
  - Add **Vitality** to the base/derived stat list for max endurance computation.
  - Formally specify the Summoner class stat growth and level-up gains.
- [ ] Create the new schema for all fighter/monster special abilities with cooldown durations in seconds rather than eras.

### Phase 2: Combat-Manager-Redux Core Engine
- [ ] Create the new file `src/utils/combat-manager-redux.js`.
- [ ] Implement the round clock tick system (handling both Slow/Fast settings).
- [ ] Add the round timer updates and state notifications (broadcasting round number, remaining time ratio, and active combatants).
- [ ] Track moves and actions taken by each unit per round.
- [ ] Implement the **Endurance** tracking logic:
    - Exertion depletion on move/action.
    - Application of cooldown penalties (+50% / +100%).
    - Freeze mechanism (4-round lockdown at 0 endurance).
    - Passive recovery ticks every 2 rounds.

### Phase 3: AI Behavior Decision Logic
- [ ] Build decision-making models in `combat-manager-redux.js` to replace the old era process:
  - Target evaluation (offensive vs. defensive).
  - Ability utility selection (buff/heal/strike/summon).
  - Pathfinding/movement decisions (step-adjacent vs. ranged positioning).
  - Action sequencing (Move-then-Act vs. Act-then-Move).

### Phase 4: Porting Sandbox Animations
- [ ] Wire the animations and timed effects from [SandboxPage.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/pages/SandboxPage.js) into the new redux flow:
  - Port Monk's Ethereal, Astral Being, Astral Projection (slow transition + fade), and Third Eye skills.
  - Port Summoner's summoning portals, skeleton/imp summons, rift portal gating, and duplication.
  - Port Soldier's Shield Wall, Shield Slam, and correct Fist of Honor rotations.
  - Port Wizard's spell animations (Annihilation sweeping beam, Fireball, Sleep).

### Phase 5: UI & Interaction Pane Overhaul
- [ ] Modify `src/pages/sub-views/MonsterBattle.js` (and combat grids) to support `combat-manager-redux.js`:
  - Render the Round Clock widget at the top-right of the board (circle with round count + radial progress SVG).
  - Add the Fast/Slow speed toggle switch.
  - Render the white Endurance bar directly below the red HP bar on all unit portraits.
  - Update the interaction pane at the bottom:
    - Focus strictly on AI combat.
    - Show the selected fighter's skills as icons with radial cooldown filters synced to the redux cooldown timers.
- [ ] Verify the simulation mode in Combat Simulator.
