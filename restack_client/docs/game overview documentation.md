# Game Overview Documentation

> **Last Updated:** June 2026
> This document describes the current state of the game. The old era-based combat system (`combat-manager.js` / `factories.js`) is deprecated and not documented here. The current combat engine is `combat-manager-redux.js`.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Dungeon Exploration](#dungeon-exploration)
3. [Crew & Fighter Classes](#crew--fighter-classes)
4. [Stats System](#stats-system)
5. [Experience & Leveling](#experience--leveling)
6. [Monsters](#monsters)
7. [Combat System (Rounds-Based)](#combat-system-rounds-based)
8. [Status Effects](#status-effects)
9. [Abilities & Skills](#abilities--skills)
10. [Inventory & Economy](#inventory--economy)
11. [Special Actions (Glyphs, Rituals, Camping)](#special-actions)
12. [Resolve](#resolve)
13. [Key File Reference](#key-file-reference)

---

## Architecture Overview

The project is organized into three main layers, each with a dedicated React component and supporting manager modules:

| Layer | Main Component | Key Managers |
|-------|---------------|-------------|
| **Map Creation** | `MapmakerPage.js` | `board-manager.js`, `overlay-manager.js` |
| **Dungeon Exploration** | `DungeonPage.js` | `board-manager.js`, `crew-manager.js`, `overlay-manager.js`, `camp-manager.js` |
| **Combat** | `MonsterBattle.js` (sub-view) | `combat-manager-redux.js`, `monster-manager.js`, `animation-manager.js` |

All stateful logic lives in dedicated manager modules. React components handle UI, event wiring, and state synchronization via explicit callback registration.

---

## Dungeon Exploration

### 4-Dimensional Navigation

The game world is navigated in four interconnected dimensions:

1. **X / Y (2D Plane):** The player moves across a 15×15 tile grid called a `miniboard`. Moving off any edge loads an adjacent miniboard in the same plane.
2. **Z / Levels (Up/Down):** `way_up` and `way_down` tiles change the `currentLevel.id`, loading a different floor.
3. **Depth / Planes (Front/Back):** Each level has a `front` and `back` plane of miniboards. `door` tiles toggle `currentOrientation` between `'F'` and `'B'`, swapping between parallel planes while keeping the X/Y position.

### Tile Types

Tiles are the fundamental building block. Key types include:

- **Floor / Wall** — Standard navigable / impassable terrain
- **Door** — Toggles front/back plane orientation
- **Way Up / Way Down** — Level transitions
- **Monster** — Triggers a combat encounter
- **Chest (silver / gold / ornate)** — Contains loot rewards
- **Narrative** — Triggers story sequences (`NarrativeSequence.jsx`)
- **Magic Nexus** — Specialized modal for learning rituals
- **Vendor** — Shop/trading encounter
- **Camp Spot** — Designated camping location
- **Gate** — Requires items or conditions to pass

### Board Manager (`board-manager.js`)

Handles dungeon board state, tile logic, fog-of-war, player movement, treasure resolution, and board transitions. Exposes callbacks that `DungeonPage` registers for:

- Item/treasure/currency additions
- Monster battle triggers
- Board transitions and level changes
- Narrative and vendor encounters

---

## Crew & Fighter Classes

The player's party consists of up to 8 crew members, one per class. Each is defined in `crew-manager.js` under the `adventurers` array.

### Class Roster

| Class | Name | Role | Primary Stats | Base HP | Attack Constituents | Defense Constituents |
|-------|------|------|--------------|---------|--------------------|--------------------|
| **Wizard** | Zildjikan | Ranged Spellcaster | INT, FORT | 10 | INT | DEX + STR/2 |
| **Soldier** | Sardonis | Frontline Tank | STR, FORT | 11 | STR + FORT/2 | STR + DEX/2 |
| **Monk** | Yu | Melee Brawler | DEX, FORT | 10 | DEX + STR/2 | DEX |
| **Sage** | Loryastes | Support / Healer | INT, FORT | 10 | FORT | STR + FORT/2 |
| **Ranger** | Dormund | Ranged DPS | DEX, STR | 10 | DEX + STR/2 | STR + FORT/2 |
| **Barbarian** | Ulaf | High-Damage Melee | STR, FORT | 52 | STR | STR + FORT/2 |
| **Engineer** | Icaron | Spacing Control | DEX, INT | 10 | DEX + INT/2 | DEX + FORT/2 |
| **Summoner** | Vaelis | Summoner / Support | INT, FORT | 10 | INT | INT + FORT/2 |

### Class Properties

Each crew member has:
- `type` / `image` — Class identifier
- `class` — `'warrior'` or `'spellcaster'`
- `stats` — `{ str, int, dex, fort, baseHp, experience }`
- `specials` — Array of ability keys (resolved via `skills-matrix.js`)
- `attacks` — Array of base attack keys (resolved via `attacks-matrix.js`)
- `passives` — Passive abilities (e.g., `diamond_skin`, `fury`, `magic_affinity`)
- `weaknesses` — Elemental/damage type vulnerabilities
- `inventory` — Per-member equipment and items
- `specialActions` — Real-time preparation actions (glyphs, rituals)

---

## Stats System

### Base Stats (4 core stats)

| Stat | Abbreviation | Role |
|------|-------------|------|
| **Strength** | `str` | Physical attack power, physical damage resistance |
| **Intelligence** | `int` | Magic damage, willpower |
| **Dexterity** | `dex` | Dodge/evasion, speed/initiative, actions per round |
| **Fortitude** | `fort` | Max HP, resistance to ailments (poison, stun) |

### Derived Stats

Computed by `computeDerivedStats()` in `crew-manager.js` from base stats + class-specific constituent tables:

| Derived Stat | Formula | Notes |
|-------------|---------|-------|
| **Attack (atk)** | Class-specific: primary + secondary/2 | See class table above |
| **Defense (def)** | Class-specific: primary + secondary/2 | See class table above |
| **HP** | `baseHp + (fort + fort/2)` | `baseHp` increases by 5 per level |
| **Energy** | `fort + fort/2` | Resource for special actions |
| **Willpower** | `int + int/2` | Resistance to mental effects |
| **Speed** | `dex + dex/2` | Turn order and dodge contribution |
| **Vitality** | `20 + (fort + fort/2) * 3` | Max endurance (stamina pool) |

### Stat Constituents

The `statConstituents` object in `crew-manager.js` defines which base stats contribute to each derived stat per class. For example:
- Monk attack = `dex + str/2`
- Wizard attack = `int + int/2` (only one constituent, so it self-combines)
- Soldier defense = `str + dex/2`

---

## Experience & Leveling

### EXP Table

| Level | XP Required |
|-------|-------------|
| 0 → 1 | 0 |
| 1 → 2 | 120 |
| 2 → 3 | 300 |
| 3 → 4 | 700 |
| 4 → 5 | 1,500 |
| 5 → 6 | 3,200 |
| 6 → 7 | 7,000 |
| 7 → 8 | 15,000 |
| 8 → 9 | 31,000 |
| 9 → 10 | 60,000 |
| 10 → 11 | 120,000 |
| 11 → 12 | 250,000 |
| 12 → 13 | 500,000 |
| 13 → 14 | 1,000,000 |

### Level-Up Gains

Each level-up grants:
- **+5 baseHp** (all classes)
- **+1 to primary stat** (class-dependent):

| Class | Stat Gained |
|-------|------------|
| Wizard | +1 INT |
| Summoner | +1 INT |
| Engineer | +1 DEX |
| Ranger | +1 DEX |
| Sage | +1 INT |
| Monk | +1 DEX |
| Soldier | +1 STR |
| Barbarian | +1 STR |

After stat increases, `computeDerivedStats()` is called to recompute all derived values.

---

## Monsters

### Tier System

Monsters are organized into 4 tiers of escalating difficulty:

| Tier | Level Range | Examples |
|------|------------|---------|
| **Tier 1** | 2–5 | Goblin, Skeleton, Kabuki Demon Minion, Beholder Minion |
| **Tier 2** | 6–10 | Troll, Mummy, Wraith, Ogre, Gorgon, Vampire |
| **Tier 3** | 11–19 | Goat Demon, Witch, Beholder, Kabuki Demon, Djinn |
| **Tier 4** | 29–30 | Sphinx, Dragon |

### Monster Properties

Each monster has:
- `type` / `key` — Monster identifier
- `tier` — Difficulty tier (1–4)
- `subtype` — Classification: `brutekin`, `undead`, `demon`, `eldritch`, `serpentine`
- `stats` — `{ hp, atk, def, speed, willpower, str, int, dex, fort }`
- `specials` — Ability keys (same pool as fighter abilities)
- `attacks` — Base attack keys
- `passives` — Passive abilities (e.g., `flying`)
- `weaknesses` — Damage type vulnerabilities
- `minions` — Array of monster type keys that spawn as minion escorts
- `drops` — Loot table with `{ item/itemPool, percentChance }`
- `greetings` / `deathCries` — Dialogue strings for combat intro/outro

### Monster Roster

| Monster | Tier | Subtype | Level | HP | ATK | DEF | SPD | Key Abilities |
|---------|------|---------|-------|-----|-----|-----|-----|--------------|
| Goblin | 1 | Brutekin | 2 | 38 | 3 | 5 | 11 | Bite (bleed) |
| Skeleton | 1 | Undead | 3 | 50 | 5 | 7 | 7 | Reassembly |
| Kabuki Demon Min. | 1 | Demon | 4 | 50 | 5 | 3 | 10 | Obliterate, Invisibility |
| Beholder Minion | 1 | Eldritch | 5 | 60 | 7 | 2 | 8 | Bifurcate, Magic Missile |
| Troll | 2 | Brutekin | 6 | 178 | 10 | 13 | 5 | Regeneration |
| Mummy | 2 | Undead | 6 | 250 | 10 | 13 | 4 | Induce Fear, Energy Drain |
| Wraith | 2 | Undead | 8 | 282 | 9 | 8 | 12 | Banshee Wail |
| Ogre | 2 | Brutekin | 8 | 172 | 9 | 11 | 5 | Stomp (stun), Head Butt |
| Gorgon | 2 | Serpentine | 9 | 162 | 8 | 9 | 8 | Petrify |
| Vampire | 2 | Undead | 10 | 194 | 9 | 12 | 13 | Bat Fly, Crimson Sight, Soul Suck |
| Goat Demon | 3 | Demon | 11 | 92 | 11 | 11 | 10 | Petrify |
| Witch | 3 | Eldritch | 12 | 160 | 13 | 8 | 9 | Obliterate, Invisibility |
| Beholder | 3 | Eldritch | 14 | 110 | 15 | 5 | 9 | Obliterate, Energy Burn, Petrify |
| Kabuki Demon | 3 | Demon | 15 | 140 | 13 | 3 | 11 | Obliterate, Invisibility |
| Djinn | 3 | Eldritch | 19 | 175 | 10 | 11 | 10 | Betrayal, Arcane Barrier, Bind |
| Sphinx | 4 | Eldritch | 29 | 325 | 13 | 13 | 7 | Possess, Tesseract |
| Dragon | 4 | Serpentine | 30 | 325 | 20 | 17 | 6 | Firestorm |

### Minion System

Some monsters spawn with **minions** — additional combatants defined in the monster's `minions` array:
- Skeleton spawns with 2 Skeleton minions
- Mummy spawns with 2 Skeleton minions
- Vampire spawns with 2 Goblin minions
- Beholder spawns with 2 Beholder Minions
- Kabuki Demon spawns with 2 Kabuki Demon Minions
- Sphinx spawns with 1 Djinn minion

Minions use the same combat system but are flagged with `isMinion: true`.

---

## Combat System (Rounds-Based)

> **Source:** `src/utils/combat-manager-redux.js`
>
> This is the current combat engine, replacing the old era-based system in `combat-manager.js` and `factories.js`.

### Combat Grid

Combat takes place on a **8×6 tile grid** (`MAX_DEPTH = 7`, `MAX_LANES = 6`):
- **X-axis (depth):** 0–7, fighters start at x=0, monsters at x=7
- **Y-axis (lanes):** 0–5

### Large Monsters & VCTs

Main monsters (and certain large types) occupy a 2×2 tile area. The `_setCombatantOccupiedCoords` method computes all occupied tiles. A **Virtual Combat Tile (VCT)** is created above the monster's primary tile for rendering/occupancy purposes. VCTs are **never targetable** and must be filtered from all targeting and attack logic.

Large combat keys: `dragon`, `beholder`, `ogre`, `sphinx`, `manticore`, `wyvern`, `mummy`, `djinn`, `vampire`, and their summoned variants.

### Round Flow

1. **Round Timer:** A `setInterval` at 50ms ticks. When elapsed time reaches `roundDurationMs`, `incrementRound()` fires.
   - `roundDurationMs` depends on game speed: Slowest=3000ms, Slow=2000ms, Fast=1000ms
2. **`incrementRound()`:**
   - Increments `this.round`
   - Resets all combatants' `movesTakenThisRound` and `actionsTakenThisRound` to 0
   - Ticks endurance recovery (every 2 rounds)
   - Ticks skeleton reassembly (`isBones` → eventual `reassembly`)
   - Calls `processRoundTurns()`
3. **`processRoundTurns()`:**
   - Filters active (alive, non-VCT) units
   - Sorts by **initiative** (speed/dex descending — faster units act first)
   - Staggers execution with 220ms between each unit's turn
   - For each unit: ticks buffs/debuffs → checks incapacitation → calls `executeUnitAI()`

### Per-Unit Turn Flow

Each unit gets **1 action** and **1 move** per round:
- `actionsTakenThisRound` caps at 1
- `movesTakenThisRound` caps at 1

### Endurance / Stamina System

Every combatant has `endurance` / `maxEndurance` (derived from `vitality` stat):
- Each **action** costs `ACTION_ENDURANCE_COST = 2`
- Each **move** costs `MOVE_ENDURANCE_COST = 2`
- When endurance reaches 0, the unit becomes **exhausted** and falls asleep:
  - Applies `asleep` + `stunned` for a "long" duration (4 rounds)
  - `enduranceFrozenRounds` prevents recovery during this period
- Cooldowns are **penalized** when endurance is low:
  - ≤ 50% endurance → 1.5× cooldown multiplier
  - Exhausted → 2.0× cooldown multiplier

### AI Decision Trees

`executeUnitAI()` routes each unit to a class-specific AI method:

#### Monk (`_aiMonk`)
1. If HP < 40% and Meditate ready → retreat to corner via Astral Projection, then Meditate
2. If endurance low → Meditate (restores stamina + 25% HP)
3. Activate Ethereal Speed (speed buff, yellow glow, 4 rounds)
4. Enter Astral Being mode via Astral Focus (prerequisite for Third Eye and Astral Projection)
5. If in Astral Being → activate Third Eye (doubles evasion)
6. If in Astral Being → use Astral Projection (dash strike, random 2-tile teleport)
7. Fallback: move closer + basic Punch

#### Soldier (`_aiSoldier`)
1. Tick Shield Wall timer (if active, skip all actions/movement)
2. If 3+ enemies and HP > 50% → erect Shield Wall
3. If Force Back ready and target adjacent → push all nearby enemies back 1 tile
4. Advance and attack with scored ability or basic Slash

#### Barbarian (`_aiBarbarian`)
1. If HP < 40% or 3+ enemies → enter Berserker rage (ATK buff)
2. If target not adjacent but within medium range → Leap Attack (teleport + stun)
3. Advance and attack with scored ability (Cleave for bleed, Axe Throw for range)

#### Wizard (`_aiWizard`)
1. If enemy adjacent → flee to safe tile (no adjacent enemies), or retreat
2. If not aligned with target → shift position to same lane
3. Priority chain: Lightning Strike → Vortex (if 2+ enemies nearby) → Annihilation
4. Scored ability fallback → basic Magic Missile

#### Sage (`_aiSage`)
1. If any ally < 70% HP → Healing Hands (+30 HP heal)
2. Circle of Protection → buff all allies' DEF
3. Perceive → expose weakness on all enemies (1.25× damage for 8 rounds)
4. Fallback: basic attack at range

#### Ranger (`_aiRanger`)
1. If enemy too close → retreat
2. Ensnare (paralyze target)
3. Mark target (increases damage taken)
4. Execute (three rapid arrows)
5. Fallback: Loose (basic ranged attack)

#### Summoner (`_aiSummoner`)
1. Tick Rift Portal timer
2. If no rift → Open Rift Portal (places portal on enemy side of board)
3. If rift active → summon high-tier minions (Devil, Imp Army, Skeleton Army)
4. Basic summons (Skeleton, Imp, Zombie, Ghoul, Skeleton Knight)
5. Duplicate/Triplicate existing minions
6. Fallback: basic attack

#### Generic (`_aiGeneric`) — used for all monsters
1. Acquire target (scored threat assessment)
2. Pick highest-scoring ability
3. If in range → use ability, else move closer then attack

### Target Acquisition

`acquireTarget()` uses a **threat-weighted scoring** system:
- `-dist * 2` — closer targets preferred
- `+(1 - hpPct) * 10` — wounded targets preferred
- `+5` for healer types (Sage, Summoner, Wizard)
- `+18` for Bones (skeleton reassembling)
- Sleeping targets are deprioritized by crew fighters (awake targets exist)

### Hit/Miss Check

`hitCheck(caller, target)`:
- Base miss chance = `targetSpeed * 3%` (capped at 45%)
- Monk's Third Eye doubles miss chance for monster attackers (capped at 75%)
- Roll: `random(0–100) >= missChance` → hit

### Damage Calculation

`damageCheck(caller, target, rawDamage)`:
1. Compute equipped armor from target's inventory
2. Compute natural armor = `target.stats.def * 4`
3. Total armor = `min(equippedArmor + naturalArmor, 200)`
4. Reduction = `min(totalArmor / 2.5, 75)` — max 75% reduction
5. Final damage = `max(1, rawDamage * (1 - reduction/100))`

Additional modifiers:
- **Weakness Revealed** → 1.25× damage multiplier
- **Fireball** → 50% splash damage to adjacent enemies

### Buff/Debuff System

- **Buffs** (`activeBuffs[]`): Applied via `_applyBuff()`. Each buff tracks `roundsLeft`, stat changes, and timestamps. When `roundsLeft` reaches 0, stat changes are reverted.
- **Debuffs** (`activeDebuffs[]`): Applied via `_applyDebuff()`. Same tracking. Supports percentage-based stat reductions.
- Both are ticked per round in `_tickUnitBuffs()` / `_tickUnitDebuffs()`.

### Cooldowns

- Stored in `unit.cooldowns` as `{ abilityKey: roundsRemaining }`
- Ticked down each round in `updateTick()`
- Endurance-penalized: low endurance → 1.5×, exhausted → 2.0× cooldown

### Skeleton Reassembly

When a Skeleton's HP reaches 0:
1. 50% chance to trigger Reassembly
2. If triggered: enters `isBones` state for 4 rounds (10 HP pile of bones)
3. After 4 rounds: reassembles with full HP, original portrait, and original stats

### Combat End

`combatOverCheck()` runs after every kill:
- If no crew alive → Defeat
- If no monsters/minions alive → Victory
- Triggers `gameOver(won)` callback to `MonsterBattle`

---

## Status Effects

All status effects in the rounds-based system use round-based durations:

| Effect | Behavior | Applied By |
|--------|----------|-----------|
| **Frozen** | Cannot act. Ticks down `frozenRounds`. | Ice Blast |
| **Stunned** | Cannot act. Clears fear/sleep when applied. | Shield Slam, Stomp, Leap Attack, Exhaustion |
| **Feared** | Cannot act. Applied as stunned + feared flags. | Induce Fear (Mummy) |
| **Asleep** | Cannot act. Applied as stunned + asleep flags. Wakes on damage. | Sleep spell, Exhaustion |
| **Petrified** | Cannot act. Ticks down `petrifiedRounds`. | Petrify (Gorgon, Beholder) |
| **Ensnared** | Cannot move (can still attack). Ticks down `ensnaredRounds`. | Ensnare (Ranger), Bind (Djinn) |
| **Poisoned** | ATK reduced by 3. Applied as debuff. | Acid Blast, Energy Drain, Soul Suck, Death Missile |
| **Bleeding** | ATK reduced by 2. Applied as debuff. | Cleave, Bite |
| **Exhausted** | Falls asleep. Endurance frozen. Cooldowns doubled. | Endurance depletion |
| **Weakness Revealed** | 1.25× incoming damage. Ticks down rounds. | Perceive (Sage) |
| **Marked** | Target takes increased damage. Ticks down rounds. | Mark (Ranger) |
| **Invisible** | Untargetable. Cannot attack. Ticks down rounds. | Invisibility (Witch, Kabuki Demon) |

### Duration Constants

```
DURATION_ROUNDS = {
    'instant': 0,
    'short': 2,
    'long': 4,
    '2x-long': 8,
    '3x-long': 12,
    '4x-long': 16
}
```

---

## Abilities & Skills

### Skills Matrix (`skills-matrix.js`)

Every ability in the game — for both fighters and monsters — is defined in the `skillsMatrix` object. Each entry has:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique key |
| `name` | string | Display name |
| `desc` | string | Description text |
| `icon` | image | Icon reference |
| `cooldown` | number | Cooldown in rounds |
| `duration` | string | `'instant'`, `'short'`, `'long'`, `'2x-long'`, etc. |
| `range` | string | `'close'` (adjacent), `'medium'` (≤3 tiles), `'far'` (≤5 tiles), `'self'` |
| `type` | string | `'damage'`, `'heal'`, `'buff'`, `'debuff'`, `'utility'`, `'passive'` |
| `damage` | number | Base damage (for damage abilities) |
| `effect` | object/array | Side effects like `{ type: 'stun', chance: 100, duration: 2 }` |
| `buff` | object | Stat increases for buff abilities |

### Range System

| Range | Max Manhattan Distance |
|-------|----------------------|
| `close` | 1 (Chebyshev — includes diagonals) |
| `medium` | 3 |
| `far` | 5+ (effectively unlimited on 8-wide grid) |

### Ability Scoring

The `_scoredAbilityPick()` method evaluates all ready specials and returns the highest-scoring one:
- **Heals**: Score increases with ally woundedness. Urgent bonus if ally < 40% HP.
- **Buffs**: Higher score when self HP > 30%.
- **Debuffs**: Bonus per enemy count. Extra if target not already stunned/frozen.
- **Damage**: Bonus for high damage and for targets < 25% HP.
- **Utility** (summons): Bonus if fewer than 3 minions alive.

---

## Inventory & Economy

### Currencies

| Currency | Description |
|----------|------------|
| **Gold** | Primary currency for purchases |
| **Shimmering Dust** | Rare magical crafting material |
| **Totems** | Special tokens for unique transactions |

### Item Categories

| Category | Subtypes | Examples |
|----------|----------|---------|
| **Weapon** | Sword, Axe, Staff | Various tiered weapons |
| **Armor** | Helm, Shield | Provides `armor` stat for damage reduction |
| **Magical** | Wand, Charm, Amulet | Tier 2–3 magical items |
| **Ancillary** | Mask | Special equippable |
| **Consumable** | Potion | Health potions (% max HP restore) |
| **Key** | Minor Key, Major Key | Gate openers |

### Item Tiers

Items are organized into tiers matching monster difficulty:
- **Tier 1**: Basic weapons, minor potions
- **Tier 2**: Improved weapons, magical items, medium potions
- **Tier 3**: Powerful magical items, strong potions
- **Tier 4**: Endgame items, maximum potions

### Monster Drops

Each monster has a `drops` array with entries like:
```js
{ item: TIER1_POTION, percentChance: 35 }
{ itemPool: TIER2_WEAPONS, percentChance: 45 }
```
On victory, each drop entry is rolled independently.

---

## Special Actions

### Glyphs (Wizard)

Wizards can **Etch Glyphs** — real-time preparation actions that produce consumable combat resources:
- **Magic Missile glyph**: Produces a charge after `prepareTime` (defined in `spells-table.js`)
- Maximum 3 active glyphs at a time
- Progress tracked via `specialActions[]` with `startDate`/`endDate`

### Rituals (Wizard & Sage)

Both Wizards and Sages can **Prepare Rituals**:
- Rituals are defined in `RITUALS` from `spells-table.js`
- Each has a `prepareTime` (real-world duration, typically hours)
- Must be learned first (tracked in `member.knownRituals[]`)
- Learned at Magic Nexus tiles in the dungeon

### Real-Time Tracking

`DungeonPage` runs a 100ms interval (`realTimeSpecialActionCheckInterval`) that:
1. Checks all crew members' `specialActions[]` for completion
2. Marks `available = true` when `endDate` has passed
3. Shows completion modals (PrepComplete / RitualComplete)
4. Auto-dismisses after 3.5 seconds

### Camping (`camp-manager.js`)

Camping is a timed rest mechanic:
1. **Food Cost**: Sum of `(3 + member.level)` for each crew member
2. If enough food → deducts cost and begins camping (default 10 seconds)
3. During camping: movement locked, campfire visual overlay
4. On camp end: **all crew fully healed**, dead crew revived with 1 HP
5. State persisted in meta (`camping`, `campingStart`, `campingEnd`)
6. Survives page reloads — `DungeonPage.componentDidMount()` rehydrates camping state

### Food System

- `meta.food` tracks the food supply (initialized at 55)
- Food is consumed when camping
- Food can be gained from cooking (`campCooking` in meta) and from special tiles
- Food preparation has its own real-time timer with `startDate`/`endDate`

---

## Resolve & Morale System

`meta.resolve` is a crew-level property initialized at 100 that functions as a party-wide **Morale** system. It is displayed in the **Quicklook Panel** alongside Attack, Defense, and Food:

```
⚔ Attack    [totalAtk]
🛡 Defense   [totalDef]
🍖 Food      [food]
✊ Resolve   [resolve]
```

### Morale Adjustments

Resolve dynamically changes based on the crew's performance and exploration circumstances:
- **Victory**: +5 Resolve (+10 Resolve if defeating a Boss of Tier 3 or 4).
- **Camping**: +15 Resolve upon completion of camping.
- **Crew Death**: -10 Resolve whenever a crew member is defeated/killed in combat.
- **Combat Defeat (TPK)**: -5 Resolve if the whole party is wiped out.
- **Starvation**: -2 Resolve if the player attempts to camp but does not have enough food.

### Combat Morale Thresholds

The crew's current Resolve value applies global bonuses or penalties to all crew members during combat:

| Resolve Level | Morale State | Combat Effects |
|---------------|--------------|----------------|
| **80 – 100** | High Morale | +10% Damage, +5% Dodge chance |
| **40 – 79** | Steady | Baseline (no bonuses or penalties) |
| **20 – 39** | Shaken | -10% Damage, -5% Dodge chance, 5% chance to refuse special ability (falls back to basic attack) |
| **< 20** | Broken | -20% Damage, -10% Dodge chance, 10% chance to skip turn entirely |

---

## Key File Reference

| File | Purpose |
|------|---------|
| `src/utils/combat-manager-redux.js` | **Current combat engine** — rounds-based AI, turn processing, hit/damage/buff/debuff |
| `src/utils/crew-manager.js` | Crew definitions, stat computation, leveling, experience |
| `src/utils/monster-manager.js` | Monster definitions, tier system, drops |
| `src/utils/factories.js` | `createFighter()` — normalizes crew/monster data into combatant objects (used by old era system, still used for initialization) |
| `src/utils/skills-matrix.js` | All ability/skill definitions (fighters + monsters) |
| `src/utils/attacks-matrix.js` | Base attack definitions |
| `src/utils/specials-matrix.js` | Special ability definitions (legacy, overlaps with skills-matrix) |
| `src/utils/combat-effects.js` | Centralized helpers for applying/clearing status effects |
| `src/utils/shared-constants.js` | Interval speeds, crit thresholds, animation durations |
| `src/utils/camp-manager.js` | Camping start/end logic, food cost |
| `src/utils/board-manager.js` | Dungeon board state, tile logic, fog-of-war, chest rewards |
| `src/utils/overlay-manager.js` | Visual overlays for dungeon and combat |
| `src/utils/inventory-manager.js` | Item management, equipment, currencies |
| `src/utils/session-handler.js` | User meta persistence (localStorage + backend) |
| `src/utils/spells-table.js` | Spell and ritual definitions with prepare times |
| `src/pages/DungeonPage.js` | Main dungeon exploration component (~6700 lines) |
| `src/pages/sub-views/MonsterBattle.js` | Combat encounter UI component |
| `src/pages/MapmakerPage.js` | Map creation editor |
| `src/pages/CombatSimulator.js` | Combat testing/simulation page |
| `src/pages/SandboxPage.js` | Full sandbox testing environment |
