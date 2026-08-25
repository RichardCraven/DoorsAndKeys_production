# The Lightweight Pocket Dimension Fog of War Overlay Architecture

## 1. Executive Summary & Objective

In the Restack pocket dimension (superboards), rendering Fog of War by constantly mutating 15x15 viewport tile properties (`color: 'black'`, `contains: null`, `image: null`) causes unnecessary memory churn, object cloning overhead, and visual artifacting (such as multi-tile structures and territory borders getting clipped or flashing).

This plan introduces a **Super Lightweight, Non-Destructive Fog of War Overlay** that decouples game board state from visual visibility.

---

## 2. Core Architecture

```
┌────────────────────────────────────────────────────────┐
│  Layer 3: Top-Level Fog of War Overlay Grid            │
│  - <div className="pocket-fog-overlay">                │
│  - 15x15 CSS Grid / SVG Mask (pointer-events: none)    │
│  - Unrevealed cells: pure dark shroud / radial shadow  │
│  - Revealed cells: opacity: 0 (transparent)            │
│  - CSS Transition: opacity 0.35s ease-out              │
│  - z-index: 25                                         │
├────────────────────────────────────────────────────────┤
│  Layer 2: Friendly Territory & Structure Outlines      │
│  - Perimeter glowing domain boundaries & badges        │
│  - z-index: 20                                         │
├────────────────────────────────────────────────────────┤
│  Layer 1: Clean Pocket Dimension Board                 │
│  - Fully intact viewport tiles & terrain textures      │
│  - Domain monoliths, observer platforms, pygmies       │
│  - Unmutated tile objects and pristine data state      │
│  - z-index: 10                                         │
└────────────────────────────────────────────────────────┘
```

---

## 3. Key Components & Implementation

### 3.1. Visibility Determination
Instead of cloning or stripping `mbTile` objects, `updateSuperboardViewport` evaluates visibility as a simple flat boolean array:
```js
const isRevealed = new Array(225).fill(false);

// For each viewport tile (vx, vy) with global coords (gx, gy):
// 1. In Player Vision (circle radius around avatar)
// 2. In Observer Platform Vision (10-tile radius circle)
// 3. In Active Vision Reveal Animation
// 4. In Friendly Territory Domain
isRevealed[vIdx] = inPlayerVision || inObsPlatformVision || inAnimVision || inFriendlyDomain;
```

### 3.2. Non-Destructive Tile Rendering
`viewportTiles` always pushes the real, complete `mbTile` data without zeroing out `contains`, `building`, or `image`:
```js
viewportTiles.push({
    ...(mbTile || {}),
    id: vTileIdx,
    index: vTileIdx,
    globalX,
    globalY,
    coordinates: [vx, vy],
    color: storedColor || defaultEmptyColor
});
```

### 3.3. Fog of War Overlay Component
Rendered immediately above the board inside `DungeonPage.js`:
```jsx
<div className="pocket-fog-overlay" style={{
    position: 'absolute',
    top: 0, left: 0,
    width: boardSize + 'px',
    height: boardSize + 'px',
    display: 'grid',
    gridTemplateColumns: 'repeat(15, 1fr)',
    gridTemplateRows: 'repeat(15, 1fr)',
    pointerEvents: 'none',
    zIndex: 25
}}>
    {fogVisibility.map((revealed, idx) => (
        <div
            key={idx}
            className="pocket-fog-cell"
            style={{
                backgroundColor: '#000000',
                opacity: revealed ? 0 : 1,
                transition: 'opacity 0.35s ease-out',
                pointerEvents: 'none'
            }}
        />
    ))}
</div>
```

---

## 4. Key Benefits
1. **Performance**: Zero object cloning or destruction of tile state during viewport movements.
2. **Smooth Visuals**: Instantaneous or smooth CSS opacity transitions when moving and revealing new areas.
3. **Robustness**: Prevents multi-tile structures (e.g. 2x2 Domain Monolith, Dream Den) from having individual quadrants accidentally hidden by tile-level mutation.
4. **Territory Transparency**: Glowing domain boundaries remain clean, sharp, and continuous.
