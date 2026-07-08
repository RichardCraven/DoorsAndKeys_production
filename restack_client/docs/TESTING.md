# Testing and harness documentation

This document explains the small automated harness used to validate fog-of-war and respawn/remove interactions in the `BoardManager`.

Files added

- `src/utils/__tests__/fog-harness.test.js` — a Jest test file that reproduces two scenarios:
  1. Defeat → fog visibility: verifies a defeated monster tile inside player vision remains visible (non-black) after the removal and after a subsequent move.
  2. Void adjacency: verifies a `void` tile adjacent vertically to the player remains hidden (black) when the player moves.

Why this test helps

- Provides a deterministic, repeatable sequence that captures the bug class (runtime vs persisted state and fog recalc timing).
- Runs fast under the repository's existing test runner (`react-scripts test`).
- Documents the expected behavior for future changes.

How to run the test

From the project root run:

```bash
npm test -- src/utils/__tests__/fog-harness.test.js --watchAll=false
```

Notes

- The harness uses the existing `BoardManager` implementation and stubs only the persistence/UI callbacks it expects (`updateDungeon`, `refreshTiles`).
- If you prefer a standalone Node script, it is straightforward to convert the same code into a `scripts/fog-harness.js` file; however the Jest integration is preferable because the project already uses Babel/Jest through `react-scripts`.

If you want, I can also add a quick `npm` script alias for running this single harness file (for convenience).