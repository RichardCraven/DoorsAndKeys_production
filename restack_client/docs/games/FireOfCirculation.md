# Fire of Circulation — Card Duel Minigame

Overview
- Name: Fire of Circulation (Reaper Duel)
- Players: Human vs Reaper (AI)
- Purpose: A collectible card minigame used as a one-off challenge against the Reaper; winning removes one death marker. Losing taxes the player 25% of their gold.

Quick rules
- Each player uses a 20-card deck (the prototype uses a small starter deck).
- Start: draw 5 cards. Each turn you draw 1 card and gain +1 Symmetry (resource), up to a configurable max (default max 6).
- Card types:
  - Construct: persistent card placed on the Field with Attack/Shield/Integrity values.
  - Sigil: one-shot effect (damage, draw, symmetry gain, destroy weak, etc.).
- Combat: Constructs can attack opposing Constructs or the opponent directly. Attack reduces target's Integrity after Shield is applied; if Integrity ≤ 0 the Construct is destroyed.
- Resolve (HP): Player default 6, Reaper default 8 (tunable). Reduce to zero to lose.
- Deck depletion: when deck is empty shuffle discard into deck once; if you cannot draw, you lose.

Turn flow (player or AI)
1. Start Phase: Symmetry += 1 (capped), draw 1 card.
2. Main Phase: Play any number of cards you can afford (pay cost in Symmetry). Constructs go to your field; Sigils resolve then go to discard.
3. Combat Phase: You may declare attacks with Constructs; attacking reduces opponent Resolve or target Construct Integrity.
4. End Phase: Hand cap enforced (8).

Rewards & penalties
- Win vs Reaper: remove one death marker and (optionally) reward a small chance for a rare card.
- Loss vs Reaper: the player is taxed 25% of their gold (rounded down). The duel ends and no death marker is removed.

Card data & manager
- Cards live in `src/data/cards.json` (prototype pool).
- `src/utils/card-manager.js` provides helpers: getCard(id), buildStarterDeck(), shuffle, draw.

Prototype component
- `src/pages/sub-views/CardDuel.js` is a small React component that runs the duel engine and provides a minimal UI (hand, field, symmetry, play buttons).
- Props accepted (optional):
  - `inventoryManager` — if provided, the prototype will deduct 25% gold on player loss automatically and call `saveUserData()` if provided via props.
  - `onFinish(result)` — callback called when duel ends: `result` object includes `{ winner: 'player'|'reaper', playerResolve, reaperResolve }`.

Integration notes
- To trigger the duel from the dungeon flow, call a modal that mounts `CardDuel` and pass callbacks that remove a death marker on victory.
- Suggested integration point: `DungeonPage` or `board-manager` could call a `triggerReaperDuel()` that mounts the duel component with proper props.

Design rationale & tuning
- The design keeps rules compact (single resource, small decks) and supports collectible expansion later.
- Balance variables (Resolve totals, Symmetry cap, card costs) are intentionally conservative — tune after playtests.

Implementation status
- Prototype files added in the codebase under `src/data/`, `src/utils/`, and `src/pages/sub-views/`.

Contact
- If you want a prettier UI, I can implement drag-and-drop, animations, and deck-building screens next.
