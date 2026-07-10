# Error Resolution Rule
- When the user asks to resolve an error, the agent must immediately analyze the issue, output the diagnosis, and proceed to resolve it without asking for permission. Do not prompt the user for confirmation before fixing errors—take direct action as soon as the request is made.
- **CRITICAL**: Always check for compile errors after making a change, and fix any syntax errors before finishing the process. Never leave a file in a broken state.
# Browser Testing & Debugging
- **Credentials**: To access the dungeon from the browser, use username `b` and password `b`.
- **Trigger Card Game**: Inside the dungeon, press `Shift + Space` to open the hidden console, type `card game`, and press Enter.
# Rule: When adding new methods to any file, do NOT place them at the top of the file. Always insert new methods in an appropriate position farther down, following the file’s structure and conventions, to avoid compilation errors and maintain code organization.
# Agent Coding Rules and Context

---

# Summary & Actionable Notes for Future Agents

## Key Takeaways
- The project is organized into three main layers: Combat, Dungeon Explorer, and Map Creation, each with a dedicated React component and supporting manager modules.
- All stateful logic is managed by dedicated manager modules (e.g., `combatManager`, `boardManager`, `crewManager`, `overlayManager`), with React components responsible for UI, event wiring, and state sync.
- All major events and state changes are handled via explicit callback registration between components and managers.
- Virtually-Occupied Combat Tiles (VCTs) must always be excluded from targeting and attack logic, and UI state must be kept in sync after any movement or state change.
- All new methods or logic must follow the file’s conventions and placement rules (see top of this file).

## Actionable Guidance
1. **When adding new features or fixing bugs:**
	- Identify which layer (combat, dungeon, map creation) the change affects.
	- Update both the manager module (for logic/state) and the React component (for UI/event wiring) as needed.
	- Register or update callbacks to ensure state and UI remain in sync.
2. **When working with VCTs or targeting logic:**
	- Always filter out VCTs in all targeting, fallback, and combat logic.
	- Add diagnostic logging if unsure whether VCTs are being excluded.
3. **When onboarding new agents or developers:**
	- Review this file for architectural context and wiring patterns.
	- Follow the method placement and code structure rules at the top of this file.
	- Use the provided data/state examples as templates for new logic.
4. **When updating documentation:**
	- Add new architectural notes, rules, or patterns to this file as the project evolves.

---

## 3. Map Creation Layer

### Overview
The map creation layer provides tools for designing, editing, and managing dungeon boards, planes, and dungeons. It is centered on the `MapmakerPage` React component, which coordinates the UI, CRUD operations, drag-and-drop, overlays, and state for map creation.

### Key Files
- `src/pages/MapmakerPage.js` — Main React component for map creation UI and state.
- `src/utils/board-manager.js` — Handles board/plane/dungeon data, tile logic, and persistence.
- `src/utils/overlay-manager.js` — Manages overlays for map editing and visualization.
- `src/utils/session-handler.js` — Handles user/session meta and persistence.

### Main Data Flow
1. **Initialization**: `MapmakerPage` loads existing boards/planes/dungeons or creates new ones, initializes managers, and sets up all event handlers and callbacks.
2. **State Management**: Maintains local state for the current board, plane, dungeon, overlays, and UI flags. Syncs with `boardManager` and `overlayManager` for authoritative state.
3. **Event Handling**: Handles tile editing, drag-and-drop, CRUD for boards/planes/dungeons, overlays, and UI actions. All actions are routed through manager modules.
4. **UI Rendering**: Renders the map grid, overlays, minimap, and editing tools. Handles dynamic overlays and board effects for editing.
5. **Persistence**: All changes are persisted via `session-handler` and/or backend API as needed.

### Key Concepts
- **Board/Plane/Dungeon Structure**: Maps are organized in a 4-dimensional hierarchy. Tiles form 15x15 `miniboards`. A grid of these miniboards constructs a `plane` (representing either 'front' or 'back' depth). A `level` binds a `front` and `back` plane together. Finally, stacking multiple levels up/down creates the full `dungeon`.
- **Overlays**: Visual effects and highlights for editing are managed by `overlayManager` and rendered on top of the map grid.
- **Drag-and-Drop**: Tiles and features can be dragged and dropped for editing, with state updates and overlays reflecting changes.
- **CRUD Operations**: Full create, read, update, delete support for boards, planes, and dungeons, with UI and state sync.

### Component/Manager Relationships
- `MapmakerPage` (UI, state, event wiring)
	- Receives: `boardManager`, `overlayManager`, etc. as props or constructs them
	- Registers: Callbacks for all board/overlay events
	- Delegates: Grid rendering, overlays, minimap, and editing tools
- `boardManager` (logic, state)
	- Maintains: Authoritative board/plane/dungeon state, tile logic
	- Handles: Editing, drag-and-drop, overlays, persistence
- `overlayManager` (logic, state)
	- Maintains: Overlays for editing, highlights, and events

### Data/State Example
```js
// mapmaker state (in MapmakerPage)
{
	board: { tiles: [ [...], ... ], ... },
	plane: { boards: [ ... ], ... },
	dungeon: { planes: [ ... ], ... },
	overlays: { ... },
	editing: { mode: 'tile'|'board'|'plane'|'dungeon', ... },
	// ...
}
```

### Map Creation Flow (Simplified)
1. `MapmakerPage` mounts → loads/creates board, plane, dungeon, initializes managers and state
2. User edits tiles/boards/planes/dungeons → calls manager methods, updates state
3. Board/overlay events trigger callbacks → update UI
4. All changes are persisted via `session-handler`/API

### BoardView Floor Rendering (Two-Layer Texture System)
Empty-space tile rendering in `BoardView.js` uses a layered CSS approach — **do not** revert to flat colours or procedural HSL without reviewing this.

**Layer 1 — Board container background** (`div.board.map-board`):
- CSS `backgroundImage` set to a repeating Poly Haven stone texture (default: `ground_grey_diff_1k.jpg`).
- Texture tiles at `350px × 350px`. `backgroundSize` can be tuned to taste.
- All 7 available textures are imported and exported as `FLOOR_TEXTURES` from `BoardView.js`.
- Pass a `floorTexture` prop to override the default programmatically.

**Layer 2 — Tile overlay**:
- Tiles whose `contains` is `empty_space` or `passage` are rendered with `backgroundColor: rgba(0,0,0,0.55)` — a semi-transparent dark overlay sitting on top of the board's texture background.
- This gives ~45% texture visibility while keeping tile borders readable.
- Content tiles (monsters, gates, vendors, etc.) use their solid stored `color` value, completely covering the texture — preserving clear editorial distinction.
- Void tiles remain solid near-black for the same reason.

**`isEmptySpaceContains(contains)`** — returns `true` for `null`, `empty_space`, and `passage`.
If new "floor-like" tile types are added, add them here so they receive the overlay treatment.

**Assets location**: `src/assets/tilesets/` — seven `*_diff_1k.jpg` files sourced from [Poly Haven](https://polyhaven.com) (CC0).

---

## 2. Dungeon Explorer Layer

### Overview
The dungeon explorer layer manages the player's navigation, interaction, and progression through the dungeon environment. It is centered on the `DungeonPage` React component, which coordinates the board, crew, overlays, minimap, modals, and triggers for combat and narrative events.

### Key Files
- `src/pages/DungeonPage.js` — Main React component for dungeon exploration UI and state.
- `src/utils/board-manager.js` — Handles dungeon board state, tile logic, fog-of-war, and movement.
- `src/utils/crew-manager.js` — Manages crew state, stats, and special actions.
- `src/utils/overlay-manager.js` — Handles overlays (e.g., effects, highlights) on the dungeon board.
- `src/utils/session-handler.js` — Manages user/session meta and persistence.

### Main Data Flow
1. **Initialization**: `DungeonPage` loads the current dungeon, initializes the board, overlays, and crew, and sets up all event handlers and callbacks.
2. **State Management**: Maintains local state for the board, crew, overlays, minimap, modals, and UI flags. Syncs with `boardManager`, `crewManager`, and `overlayManager` for authoritative state.
3. **Event Handling**: Handles player movement, tile interactions, inventory, modal dialogs, and triggers for combat or narrative events. All actions are routed through manager modules.
4. **UI Rendering**: Renders the dungeon board, minimap, overlays, crew panel, inventory, and modals. Handles dynamic overlays and board effects.
5. **Combat/Narrative Triggers**: When combat or narrative events are triggered (e.g., entering a monster tile), `DungeonPage` launches the appropriate modal/component (e.g., `MonsterBattle`, narrative sequence).

### Key Concepts
- **4-Dimensional Navigation**: The game world is structured in 4 interconnected dimensions:
	1. **X** and **Y** (2D Planes): The player navigates a 15x15 tile grid (`miniboard`). Moving off the edge (`moveBoardLeft`, etc.) loads the adjacent miniboard in the current plane.
	2. **Z / Levels** (Up/Down): Accessible via `way_up` and `way_down` tiles. This increments or decrements `currentLevel.id` to load a new floor.
	3. **Depth / Planes** (Front/Back): Each level is composed of a `front` and `back` plane of miniboards. Interacting with a `door` tile toggles the `currentOrientation` between `'F'` (Front) and `'B'` (Back), swapping between parallel planes while maintaining the X/Y position.
- **Board State**: The dungeon board is a 2D grid of tiles, each with type, state, and overlays. Managed by `boardManager` and synced to UI.
- **Crew State**: Crew members are managed by `crewManager`, with state synced to UI for health, specials, and inventory.
- **Overlays**: Visual effects and highlights are managed by `overlayManager` and rendered on top of the board.
- **Minimap**: A minimap is rendered based on the current board state and player position.
- **Modal Flow**: All major events (combat, inventory, narrative) are handled via modal dialogs/components, with state managed in `DungeonPage`.

### Data/State Example
```js
// board (in DungeonPage state)
{
	tiles: [ [...], [...], ... ], // 2D array of tile objects
	overlays: { ... },           // overlay state keyed by tile/crew/event
	crew: [ { id, name, hp, ... }, ... ],
	minimap: { ... },
	modals: { inventory: false, combat: false, ... },
	// ...
}
```

### Key Concepts
- **4-Dimensional Navigation**: The game world is structured in 4 interconnected dimensions:
	1. **X** and **Y** (2D Planes): The player navigates a 15x15 tile grid (`miniboard`). Moving off the edge (`moveBoardLeft`, etc.) loads the adjacent miniboard in the current plane.
	2. **Z / Levels** (Up/Down): Accessible via `way_up` and `way_down` tiles. This increments or decrements `currentLevel.id` to load a new floor.
	3. **Depth / Planes** (Front/Back): Each level is composed of a `front` and `back` plane of miniboards. Interacting with a `door` tile toggles the `currentOrientation` between `'F'` (Front) and `'B'` (Back), swapping between parallel planes while maintaining the X/Y position.
- **Board State**: The dungeon board is a 2D grid of tiles, each with type, state, and overlays. Managed by `boardManager`.
- **Crew & Experience**:
	- **EXP Table**: `EXP_TABLE` defines thresholds (0, 120, 300, 700, 1500, 3200, 7000, 15000, 31000, 60000, 120000, 250000, 500000, 1000000).
	- **Derived Stats**: Stats like `atk`, `def`, `hp`, `energy`, `willpower`, and `speed` are derived from base `str`, `int`, `dex`, and `fort` using class-specific constituents (e.g., Monk uses `dex`+`str` for `atk`, Wizard uses `int` for `atk`).
	- **Level Up**: Increases primary stats and adds +5 to `baseHp`.
- **Real-Time Preparation (Special Actions)**:
	- Wizards can "Etch Glyphs" and "Prepare Rituals"; Sages can prepare rituals.
	- Triggered via `beginSpecialAction` with real-world preparation time (hours/minutes).
	- `DungeonPage` runs a `realTimeSpecialActionCheckInterval` to monitor completion and update the `available` flag.
- **Inventory & Currencies**:
	- **Currencies**: `gold`, `shimmering_dust`, and `totems`.
	- **Item Categories**: `weapon`, `armor` (helm/shield), `magical` (wand/charm/amulet), `ancillary` (mask), `consumable` (potion), `key`.
	- Persistence: Managed by `inventory-manager.js` and stored in `meta`.
- **Special Encounters**:
	- **Reaper Card Duel**: A high-stakes mini-game modal; losing can lead to a gold tax.
	- **Magic Nexus**: Tiles that trigger specialized modals for learning rituals.

### Dungeon Flow (Simplified)
1. `DungeonPage` mounts → loads dungeon, initializes managers and state
2. Player moves/interacts → calls manager methods, updates state
3. Board/crew/overlay events trigger callbacks → update UI
4. Combat/narrative triggers launch modals/components
5. State is persisted via `session-handler` and `updateUserRequest`.

---

# Deep-Dive: Project Architecture & Layer Wiring

## 1. Combat Layer (Battle Engine)

### Overview
The combat layer is responsible for all turn-based battles between the player's crew and monsters/minions. It is primarily managed by the `MonsterBattle` React component, which orchestrates the UI, state, and event flow for combat encounters. The combat logic itself is handled by the `combatManager` (and related AI/manager modules), which is injected as a prop.

### Key Files
- `src/pages/sub-views/MonsterBattle.js` — Main React component for combat UI and state.
- `src/utils/combat-manager-redux.js` — Authoritative Redux battle engine, managing stats, round-based turn execution, target acquisition, status effects, and state updates.
- `src/utils/monster-manager.js` — Monster definitions, base stats, and type helpers.
- `src/components/combat-panes/` — UI combat grid panels.

### Main Data Flow
1. **Initialization**: `MonsterBattle` mounts, resets and initializes the `combatManager`, connects overlay/animation managers, and sets up callbacks for all combat events (actor updates, data sync, game over, etc.).
2. **State Sync**: `combatManager` maintains the authoritative state of all combatants (crew, monsters, minions, VCTs). `MonsterBattle` deep-clones this state into its own `battleData` for UI rendering and local state updates.
3. **Event Handling**: All combat actions (attacks, specials, spells, movement, deaths) are routed through `combatManager` methods, which update state and trigger callbacks to update the UI.
4. **UI Rendering**: `MonsterBattle` renders the combat grid, overlays, interaction pane, and summary panels. It delegates fighter and monster grid rendering to `FightersCombatGrid` and `MonstersCombatGrid` components.
5. **AI & Targeting**: Monster and fighter AI logic (including VCT exclusion) is handled in the AI modules, with all actions funneled through `combatManager`.
6. **End of Combat**: On win/loss, `MonsterBattle` handles reward/penalty logic, updates meta/profile state, and triggers respawn or death flows as needed.

### Key Concepts
- **Virtually-Occupied Combat Tiles (VCTs)**: Special tiles that are never targetable or attackable. All targeting, fallback, and UI logic must robustly exclude VCTs. VCTs occupy the tile above a large monster. The `CombatManager` handles `syncVCTs` to keep virtual tiles aligned with monster movement.
- **State Normalization**: All combatant objects are normalized to ensure required fields (e.g., `portrait`, `damageIndicators`) are always present for UI safety.
- **Callbacks & Wiring**: All major combat events (actor update, data update, animation, game over, etc.) are wired via explicit callback registration between `MonsterBattle` and `combatManager`.
- **Facing Logic**: `recalculateFacing` dynamically updates a combatant's orientation (up/down/left/right) based on their target. Includes a debounce/count mechanism to prevent rapid oscillation when targets move across columns/rows.
- **Large Monsters & Occupancy**: `_canMoveToCoords` and `_setCombatantOccupiedCoords` handle multi-tile occupancy rules, preventing units from moving into a monster's primary or virtual tile.
- **Summary Panel**: At combat end, a summary panel displays rewards, level-ups, and crew status, with logic for group death and respawn.

### Component/Manager Relationships
- `MonsterBattle` (UI, state, event wiring)
	- Receives: `combatManager`, `overlayManager`, `animationManager`, `crew`, `monster`, `minions`, `inventoryManager`, `crewManager`, etc. as props
	- Registers: Callbacks for all combat events
	- Delegates: Grid rendering to `FightersCombatGrid` and `MonstersCombatGrid`
- `combatManager` (logic, state, AI)
	- Maintains: Authoritative combatant state
	- Handles: Turn cycles, targeting, attacks, deaths, VCTs, AI
	- Exposes: Methods for all combat actions, state queries, and event registration
- `monster-ai/` (AI profiles)
	- Implements: Monster-specific AI, targeting, and fallback logic (with VCT exclusion)

### Data/State Example
```js
// battleData (in MonsterBattle state)
{
	"fighter1": { id, name, type, hp, dead, portrait, ... },
	"monster1": { id, name, isMonster: true, hp, dead, portrait, ... },
	// ...
}
```

### Combat Flow (Simplified)
1. `MonsterBattle` mounts → initializes `combatManager` and state
2. Player/AI actions (attack, move, special) → call `combatManager` methods
3. `combatManager` updates state, triggers callbacks
4. `MonsterBattle` updates local state/UI
5. Combat ends → summary panel, rewards, respawn/death logic

---

## Method Placement Rule
- Never add new methods (functions, class methods, etc.) at the very top of any file.
- All new methods must be placed in an appropriate location, such as within a class body (for class methods), and following the conventions of the file (e.g., after the constructor and before lifecycle methods in React class components).
- Placing methods at the top level of a file (outside of class/function/module context) is not allowed and will cause syntax errors.

## VCT and Monster Handling (Summary)
- See previous agent context for details on Virtually-Occupied Combat Tiles (VCTs), monster movement, targeting, and UI sync requirements.
- Always ensure VCTs are handled robustly in both logic and UI, and that UI state is synced after monster movement.

## General Agent Guidance
- Follow file and code structure conventions of the project.
- Do not introduce syntax errors by placing code in inappropriate locations.
- When in doubt, review the file for the correct placement of new code.

---

## Round-Based Combat Architecture (combat-manager-redux.js)

The Redux combat engine is entirely turn-based and round-based. It does not use real-time intervals, ticks, or eras.

### Turn Queue & Initiative
- **Round Turns**: The turn sequence is determined inside `processRoundTurns()` by sorting all active combatants by initiative (speed/dexterity) in descending order:
  ```javascript
  let speed = unit.stats.speed || unit.stats.dex || 1;
  ```
- Higher initiative units act earlier in each combat round.

### Special Ability Cooldowns
- Cooldowns are integer round-duration values mapped on `unit.cooldowns`.
- Ability cooldowns are set via `_setCooldown(unit, abilityKey, rounds)` and decremented by 1 at the start of the unit's turn in `processRoundTurns()`.

### Evasion & Dodge Mechanics
- Attacking relies on `hitCheck(caller, target)`.
- Physical attacks have their hit/dodge check scaled by the target's Dexterity and Speed:
  ```javascript
  baseMissChance = (targetDex * 2.0) + (targetSpeed * 1.0);
  missChance = Math.min(baseMissChance, 45); // normally capped at 45%
  ```
- Dexterity directly provides +2% dodge chance per point, making it the primary physical evasion stat.

---
This file is for agent context only. Update as new rules or architectural notes are required.
