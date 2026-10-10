# Plan: Organic Edges for Void / Empty Space Tiles

## Current State
- Board tiles are rendered in [DungeonPage.js](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/pages/DungeonPage.js#L42882-L42926) as one DOM `div` per tile. Void tiles get `backgroundColor: black` from `bm.isVoidTile(tile)`.
- So the edge between void and floor is just the square tile boundary: straight lines and hard 90° corners.
- Fog also uses `color === 'black'`, so fog and void currently look the same.

## Goal
Make the void/floor boundary look like a cave: wavy, rounded, slightly random. It must:
- Look the same every time you load a given board (no flicker on re-render).
- Stay a purely visual layer. Pathing, clicks and walls do not change.
- Cost close to nothing per frame.

---

## Approach: One SVG Void Mask Per Board

Instead of styling 225 tiles, draw **one `<svg>` overlay** above the floor tiles. It contains a single `<path>` filled with the void color. The void tiles themselves become transparent, so the floor shows through and the SVG path draws the darkness.

```mermaid
flowchart LR
    A["Board tiles + isVoidTile"] --> B["Void bitmask (15x15)"]
    B --> C["Marching squares on corner grid"]
    C --> D["Contour polylines"]
    D --> E["Seeded noise displacement"]
    E --> F["Catmull-Rom to cubic Bezier"]
    F --> G["SVG path d-string"]
    G --> H["Cache by board key + mask hash"]
    H --> I["Single SVG overlay layer"]
```

### Step 1: Void Bitmask
- Build a `Uint8Array(15*15)` where 1 = void. Use `bm.isVoidTile(t) && !bm.isConnectingPathTile(t)`, the same rule pathing uses ([DungeonPage.js:L28958](file:///Users/richardcraven/Documents/Projects/restack/restack_client/src/pages/DungeonPage.js#L28958)).
- Pad it by 1 tile on every side with "void" so edges at the board border close properly. Optionally read the neighbor board's edge column if that board is loaded.

### Step 2: Marching Squares (Contours)
- Sample a corner grid of size 16×16. Each corner's value = share of its 4 neighbouring tiles that are void (0, .25, .5, .75 or 1).
- Run marching squares at iso-level 0.5 and interpolate along edges. This alone turns stair-step corners into 45° bevels.
- Handle saddle cases (cells 5 and 10) the same way every time, using the cell centre value, so diagonal void tiles always connect (or always separate) predictably.
- Link the segments into closed loops (a hash map keyed by endpoint).

### Step 3: Organic Displacement
- Resample each loop at about `tileSize / 6` spacing.
- Push each point along its normal by `amp * noise(x, y)`:
  - `noise` = 2-octave value noise seeded by `hash(boardId, floorIndex)`. That keeps it stable across reloads and the same for every player.
  - `amp` ≈ 0.18 × tileSize, clamped so the edge **never crosses into the centre 60% of a walkable tile**. Floor contents like monsters and items must never get covered.
- Points on a board border use noise seeded per shared edge, not amp 0, so the edges are wavy at the border and still match the neighbouring board (see Decisions).

### Step 4: Smoothing
- Turn each loop into closed Catmull-Rom → cubic Bézier segments (`C` commands). Write coordinates in tile units (`viewBox="0 0 15 15"`) so the path scales with `tileSize` without being rebuilt.
- Concatenate all loops into a single `d` string with `fill-rule="evenodd"`, so islands of floor inside void work.

### Step 5: Rendering
- In the board container, add `<svg className="void-organic-layer" viewBox="0 0 15 15" preserveAspectRatio="none">` absolutely positioned over the tile grid.
- Layer order: floor tiles → **void layer** → walls/borders → contents/monsters → fog → player.
- Styling:
  - Main fill `#000`.
  - A second copy of the path with a `stroke` of ~0.08 in a dark warm tone (e.g. `rgba(40,30,20,.9)`) as a rock rim. An optional static `feGaussianBlur` inner shadow, rasterised once (no animation).
  - Add `shape-rendering: geometricPrecision`, `pointer-events: none` and `contain: strict`.
- Void tile divs render with a transparent background when the feature flag is on. Their click handlers stay as they are.

---

## Performance

| Concern | Mitigation |
|---|---|
| Recompute cost | Memoize on `boardKey + maskHash` (FNV over the 225 bytes). Only rebuild when the mask changes (board change, or a void tile is filled or opened). Expect under 1 ms per board. |
| Cache growth | LRU of ~32 entries kept in a module (`src/utils/organic-void.js`), outside React state. |
| React re-renders | `VoidOrganicLayer` is a `React.memo` / `PureComponent` that only receives the `d` string. DungeonPage re-renders often, but this component bails out. |
| Paint cost | One path, no animation, `will-change` not needed. `contain: strict` isolates layout and paint. Resizing scales via viewBox with no recompute. |
| Path size | About 6 points per tile edge × at most ~120 boundary edges → around 700 Bézier segments worst case, roughly 15 KB string. Fine. |
| Superboard (45×45 in pocket dimension) | Compute per miniboard (15×15) with shared border seeds so seams match. Only render miniboards in the current viewport window. |

---

## Edge Cases
- **Fog:** keep fog as its own layer above the void layer. Fogged void stays hidden under fog. Once revealed, the organic edge shows. Do **not** feed fog into the mask, or edges would jump around while you explore.
- **Connecting paths / bridges over void:** these count as floor in the mask (same as pathing).
- **Walls (`borders`) next to void:** drawn above the void layer, so they still show. Optionally hide the wall border on a side that touches void, since the rock rim replaces it.
- **Dynamic void changes** (e.g. spells, collapse): the mask hash changes → the path rebuilds. You can cross-fade old and new paths over 200 ms if wanted.
- **Dungeon builder (BoardView/DungeonView):** leave it unchanged for now. Square tiles are better for editing. Reuse the util later if wanted.
- **Combat grid:** out of scope.

---

## Files
- **New** `src/utils/organic-void.js`: `buildVoidMask`, `marchingSquares`, `displaceLoops`, `toSvgPath`, `getOrganicVoidPath(boardKey, tiles, bm, seed)` plus the LRU cache.
- **New** `src/components/VoidOrganicLayer.js`: memoized SVG component.
- **Edit** `DungeonPage.js`: mount the layer in the board container and make void tile backgrounds transparent behind a flag.
- **Edit** `dungeon-board.scss`: `.void-organic-layer` styles and z-index slot.
- **Flag:** `meta.settings.organicVoidEdges` (default on, toggle in settings) for an easy rollback.

## Tests
- Unit tests for `organic-void.js`:
  - Same input + seed gives the same `d` string (determinism).
  - All-floor input gives an empty path. All-void input gives a single rectangle.
  - Check a sampled grid of points: the centre 60% of every floor tile is always outside the filled area.
  - Saddle cases are resolved consistently.
  - Cache hit when nothing changed; recompute when one tile flips.
- Render test: the layer mounts once, and the void tile divs have a transparent background when the flag is on.
- Perf guard: a 15×15 random mask built 100 times stays under a small budget (e.g. 50 ms total in Jest).

## Decisions
1. **Edges:** organic both inside a board AND at the outer board border / neighbouring-board seams. Seams are made to match using a shared seed per border edge: the noise for a border edge is seeded by `hash(sortedBoardIds, edgeSide)`, so both boards produce the same displacement there. If the neighbouring board isn't loaded, treat the space past the border as void.
2. **Style:** rocky rim. A stroked copy of the path in a dark warm stone tone (`~0.08` tile units), plus a second thinner, lighter highlight stroke offset inward, plus a static inner shadow. All rasterised once, with no animation.
3. **Scope:** regular dungeon boards only. Superboard / pocket dimension keeps square tiles for now. The layer only mounts when `!this.state.inSuperboard`.
